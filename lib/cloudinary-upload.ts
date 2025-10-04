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
    
    // Convert buffer to base64 data URI
    const base64Data = buffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Data}`;

    // Upload options
    const uploadOptions = {
      folder: folder,
      public_id: filename.split('.')[0], // Remove extension
      resource_type: 'image' as const,
      format: 'auto', // Auto-detect format
      quality: 'auto:good', // Optimize quality
      fetch_format: 'auto', // Auto-select best format
      transformation: [
        {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ],
      overwrite: true,
      invalidate: true
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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key')) {
        throw new Error('Invalid Cloudinary API Key. Please check your CLOUDINARY_API_KEY environment variable.');
      }
      if (error.message.includes('Invalid cloud name')) {
        throw new Error('Invalid Cloudinary Cloud Name. Please check your CLOUDINARY_CLOUD_NAME environment variable.');
      }
      if (error.message.includes('Invalid signature')) {
        throw new Error('Invalid Cloudinary API Secret. Please check your CLOUDINARY_API_SECRET environment variable.');
      }
      throw new Error(`Cloudinary upload error: ${error.message}`);
    }
    
    throw new Error(`Failed to upload to Cloudinary: ${String(error)}`);
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
