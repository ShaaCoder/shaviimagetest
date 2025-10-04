import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { generateUniqueFileName } from '@/lib/image-utils';

// Configure for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const maxFileSize = 20 * 1024 * 1024; // 20MB
const maxFiles = 10;

// Simple image validation without Sharp
function validateImageFile(buffer: Buffer, filename: string) {
  // Check file size
  if (buffer.length > maxFileSize) {
    return { isValid: false, error: 'File too large' };
  }
  
  // Check file extension
  const ext = filename.toLowerCase().split('.').pop();
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return { isValid: false, error: 'Invalid file type' };
  }
  
  // Basic magic number check
  const jpg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  const png = buffer[0] === 0x89 && buffer[1] === 0x50;
  const gif = buffer[0] === 0x47 && buffer[1] === 0x49;
  const webp = buffer[8] === 0x57 && buffer[9] === 0x45;
  
  if (jpg || png || gif || webp) {
    return { isValid: true };
  }
  
  return { isValid: false, error: 'Invalid image format' };
}

export async function POST(request: NextRequest) {
  console.log('📁 Simple upload API called');
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const uploadType = (formData.get('type') as string) || 'products';
    
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
    
    const uploadedImages: string[] = [];
    
    // Process files one by one
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Validate file
      const validation = validateImageFile(buffer, file.name);
      if (!validation.isValid) {
        throw new Error(`Invalid file ${file.name}: ${validation.error}`);
      }
      
      // Generate unique filename
      const uniqueFilename = generateUniqueFileName(file.name);
      
      // Check if serverless environment
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      if (isServerless) {
        // In serverless, we'll need to use cloud storage
        // For now, return the filename (you'll need to implement cloud storage)
        uploadedImages.push(`uploads/${uploadType}/${uniqueFilename}`);
        console.log(`📤 Would upload to cloud: ${uniqueFilename}`);
      } else {
        // Local development - save to filesystem
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', uploadType);
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, uniqueFilename);
        await writeFile(filePath, buffer);
        uploadedImages.push(`uploads/${uploadType}/${uniqueFilename}`);
        console.log(`💾 Saved locally: ${uniqueFilename}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      images: uploadedImages,
      message: `Successfully processed ${files.length} images`
    });
    
  } catch (error) {
    console.error('❌ Simple upload failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Content-Length',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple image upload endpoint (no Sharp dependency)',
    methods: ['POST'],
    maxFileSize: '20MB',
    maxFiles: 10
  });
}