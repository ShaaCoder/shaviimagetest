import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resource_type: string;
}

/**
 * Upload image to Cloudinary using official SDK
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'products'
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables.');
  }

  try {
    console.log(`📤 Uploading ${filename} to Cloudinary folder: ${folder}`);
    
    // Convert buffer to base64 data URI with proper MIME type detection
    const base64Data = buffer.toString('base64');
    
    // Basic MIME type detection based on file header
    let mimeType = 'image/jpeg'; // default
    if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = 'image/png';
    else if (buffer[0] === 0x47 && buffer[1] === 0x49) mimeType = 'image/gif';
    else if (buffer[0] === 0xFF && buffer[1] === 0xD8) mimeType = 'image/jpeg';
    else if (buffer[8] === 0x57 && buffer[9] === 0x45) mimeType = 'image/webp';
    
    const dataURI = `data:${mimeType};base64,${base64Data}`;

    // Simple upload options (avoid complex transformations that might cause errors)
    const uploadOptions = {
      folder: folder,
      public_id: filename.split('.')[0], // Remove extension
      resource_type: 'image' as const,
      overwrite: true,
      unique_filename: false,
      use_filename: true
    };

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions) as CloudinaryResponse;
    
    console.log(`✅ Successfully uploaded to Cloudinary:`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Size: ${Math.round(result.bytes / 1024)}KB`);
    console.log(`   Dimensions: ${result.width}x${result.height}`);
    console.log(`   Format: ${result.format}`);
    
    return result.secure_url;
    
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    
    // Log detailed error information for debugging
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', {
        message: (error as any).message,
        http_code: (error as any).http_code,
        error_code: (error as any).error?.code,
        error_message: (error as any).error?.message
      });
    }
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key') || (error as any).http_code === 401) {
        throw new Error('Invalid Cloudinary API Key. Please check your CLOUDINARY_API_KEY environment variable.');
      }
      if (error.message.includes('Invalid cloud name') || error.message.includes('cloud_name')) {
        throw new Error('Invalid Cloudinary Cloud Name. Please check your CLOUDINARY_CLOUD_NAME environment variable.');
      }
      if (error.message.includes('Invalid signature') || (error as any).http_code === 403) {
        throw new Error('Invalid Cloudinary API Secret. Please check your CLOUDINARY_API_SECRET environment variable.');
      }
      if (error.message.includes('Invalid extension') || error.message.includes('transformation')) {
        throw new Error(`Cloudinary configuration error: ${error.message}`);
      }
      throw new Error(`Cloudinary upload error: ${error.message}`);
    }
    
    throw new Error(`Failed to upload to Cloudinary: ${JSON.stringify(error)}`);
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`, result);
  } catch (error) {
    console.error('❌ Failed to delete from Cloudinary:', error);
    throw error;
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  const configured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
  if (!configured) {
    console.warn('⚠️ Cloudinary not configured. Missing environment variables:');
    if (!CLOUDINARY_CLOUD_NAME) console.warn('   - CLOUDINARY_CLOUD_NAME');
    if (!CLOUDINARY_API_KEY) console.warn('   - CLOUDINARY_API_KEY');
    if (!CLOUDINARY_API_SECRET) console.warn('   - CLOUDINARY_API_SECRET');
  }
  return configured;
}

/**
 * Get Cloudinary configuration status
 */
export function getCloudinaryStatus() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: CLOUDINARY_CLOUD_NAME ? '***' + CLOUDINARY_CLOUD_NAME.slice(-4) : 'Not set',
    apiKey: CLOUDINARY_API_KEY ? '***' + CLOUDINARY_API_KEY.slice(-4) : 'Not set',
    apiSecret: CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
  };
}
