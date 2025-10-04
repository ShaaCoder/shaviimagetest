import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { generateUniqueFileName, DEFAULT_IMAGE_CONFIG } from '@/lib/image-utils';
// Import image processing with error handling
let processImagesInParallel: any;
let validateImage: any;
let DEFAULT_OPTIMIZATION_OPTIONS: any;
type OptimizedImageResult = any;

// Try to import Sharp-based processing, fallback to basic processing
try {
  const imageOptimizer = require('@/lib/image-optimizer');
  processImagesInParallel = imageOptimizer.processImagesInParallel;
  validateImage = imageOptimizer.validateImage;
  DEFAULT_OPTIMIZATION_OPTIONS = imageOptimizer.DEFAULT_OPTIMIZATION_OPTIONS;
} catch (error) {
  console.log('Sharp not available, using fallback image processing');
  // Fallback functions will be defined below
}
import { uploadWithFallback, getStorageProvider } from '@/lib/cloud-storage';

// Configure API route for handling large uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add Next.js 13+ app router configuration
export const maxDuration = 30; // 30 seconds
export const preferredRegion = 'auto';

// Note: Body parser configuration is handled automatically in App Router

// Configure file size limits - increased for better performance
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '20971520'); // 20MB default
const maxFiles = 10; // Maximum number of files per request
const concurrency = 4; // Process 4 images in parallel

// Fallback image validation when Sharp is not available
function fallbackValidateImage(buffer: Buffer) {
  // Basic image validation by checking headers
  const jpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const gif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const webp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  
  if (jpg || png || gif || webp) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid image format' };
}

// Fallback image processing (no optimization, just save as-is)
function fallbackProcessImages(fileBuffers: Array<{buffer: Buffer, filename: string}>) {
  return Promise.resolve(fileBuffers.map(({buffer, filename}) => [{
    buffer,
    filename,
    format: filename.split('.').pop()?.toLowerCase() || 'jpg',
    size: buffer.length,
    width: 800, // Default dimensions
    height: 600
  }]));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 Fast image upload API called');
  
  try {
    // Quick request validation
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxFileSize * maxFiles) {
      return NextResponse.json(
        { error: 'Request too large', maxSize: `${(maxFileSize * maxFiles) / 1024 / 1024}MB` },
        { status: 413 }
      );
    }
    
    // Fast form data parsing
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const uploadType = formData.get('type') as string || 'products';
    const optimizationLevel = formData.get('optimization') as string || 'balanced'; // 'fast', 'balanced', 'quality'
    
    console.log(`⚡ Processing ${files.length} files in parallel for ${uploadType}`);
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }
    
    if (files.length > maxFiles) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${maxFiles} files allowed` },
        { status: 400 }
      );
    }

    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;
    
    let uploadDir = '';
    if (!isServerless) {
      // Local development - ensure upload directory exists
      uploadDir = path.join(process.cwd(), 'public', 'uploads', uploadType);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    }
    
    // Get optimization options based on level
    const optimizationOptions = getOptimizationOptions(optimizationLevel);
    console.log(`🎯 Using ${optimizationLevel} optimization`);
    
    // Convert files to buffer format for parallel processing
    const fileBuffers = await Promise.all(
      files.map(async (file) => {
        // Quick validation
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Validate image using available method
        const validation = validateImage ? 
          await validateImage(buffer) : 
          fallbackValidateImage(buffer);
        if (!validation.isValid) {
          throw new Error(`Invalid image ${file.name}: ${validation.error}`);
        }
        
        return { buffer, filename: file.name };
      })
    );
    
    console.log(`📊 Images validated in ${Date.now() - startTime}ms`);
    
    // Process all images using available method
    const optimizedResults = processImagesInParallel ? 
      await processImagesInParallel(
        fileBuffers,
        optimizationOptions,
        concurrency
      ) : 
      await fallbackProcessImages(fileBuffers);
    
    console.log(`🔄 Images optimized in ${Date.now() - startTime}ms`);
    
    // Save all optimized images in parallel
    const uploadedImages: string[] = [];
    const savePromises: Promise<string[]>[] = [];
    
    for (const imageSet of optimizedResults) {
      const savePromise = Promise.all(
        imageSet.map(async (optimizedImage: OptimizedImageResult) => {
          let imagePath: string;
          
          if (isServerless) {
            // Serverless environment - use cloud storage fallback
            try {
              // Create a temporary file-like object for cloud storage
              const uint8Array = new Uint8Array(optimizedImage.buffer);
              const fileBlob = new File([uint8Array], optimizedImage.filename, {
                type: `image/${optimizedImage.format}`
              });
              
              imagePath = await uploadWithFallback(
                fileBlob,
                uploadType,
                async () => {
                  throw new Error('Local storage not available in serverless');
                }
              );
            } catch (error) {
              console.error(`Failed to upload ${optimizedImage.filename}:`, error);
              throw error;
            }
          } else {
            // Local development - save to file system
            const filePath = path.join(uploadDir, optimizedImage.filename);
            await writeFile(filePath, new Uint8Array(optimizedImage.buffer));
            imagePath = `uploads/${uploadType}/${optimizedImage.filename}`.replace(/\\/g, '/');
          }
          
          console.log(`💾 Saved: ${optimizedImage.filename} (${Math.round(optimizedImage.size / 1024)}KB, ${optimizedImage.width}x${optimizedImage.height})`);
          
          return imagePath;
        })
      );
      
      savePromises.push(savePromise);
    }
    
    // Wait for all files to be saved
    const savedImagePaths = await Promise.all(savePromises);
    uploadedImages.push(...savedImagePaths.flat());
    
    console.log(`✅ All images saved in ${Date.now() - startTime}ms`);
    
    // Calculate stats
    const totalOptimizedSize = optimizedResults.flat().reduce((sum, img) => sum + img.size, 0);
    const originalSize = fileBuffers.reduce((sum, file) => sum + file.buffer.length, 0);
    const compressionRatio = Math.round((1 - totalOptimizedSize / originalSize) * 100);

    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      success: true, 
      images: uploadedImages,
      message: `🎉 Successfully uploaded ${files.length} files (${uploadedImages.length} variants) in ${totalTime}ms`,
      stats: {
        originalFiles: files.length,
        optimizedVariants: uploadedImages.length,
        processingTime: totalTime,
        originalSize: Math.round(originalSize / 1024),
        optimizedSize: Math.round(totalOptimizedSize / 1024),
        compressionRatio: `${compressionRatio}%`,
        avgTimePerImage: Math.round(totalTime / files.length)
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Upload failed after ${totalTime}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Image upload failed',
        message: errorMessage,
        processingTime: totalTime,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to get optimization options based on level
function getOptimizationOptions(level: string) {
  const baseOptions = DEFAULT_OPTIMIZATION_OPTIONS ? 
    { ...DEFAULT_OPTIMIZATION_OPTIONS } : 
    { quality: 85, format: 'webp' as const };
  
  switch (level) {
    case 'fast':
      return {
        ...baseOptions,
        quality: 75,
        format: 'webp' as const,
        sizes: [{ width: 800, suffix: '_optimized' }] // Only one size for speed
      };
    case 'quality':
      return {
        ...baseOptions,
        quality: 95,
        format: 'webp' as const,
        sizes: [
          { width: 400, suffix: '_thumb' },
          { width: 800, suffix: '_medium' },
          { width: 1200, suffix: '_large' },
          { width: 1920, suffix: '_xl' }
        ]
      };
    case 'balanced':
    default:
      return {
        ...baseOptions,
        quality: 85,
        format: 'webp' as const,
        sizes: [
          { width: 400, suffix: '_thumb' },
          { width: 800, suffix: '_medium' },
          { width: 1200, suffix: '_large' }
        ]
      };
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isProduction = process.env.NODE_ENV === 'production';
  
  const allowedOrigin = isProduction 
    ? (origin && process.env.NEXT_PUBLIC_APP_URL?.includes(origin) ? origin : process.env.NEXT_PUBLIC_APP_URL)
    : '*';
    
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  });
}

// Handle GET for testing endpoint availability
export async function GET() {
  return NextResponse.json({
    message: 'Image upload endpoint is available',
    methods: ['POST'],
    maxFileSize: '20MB',
    maxFiles: 10
  });
}
