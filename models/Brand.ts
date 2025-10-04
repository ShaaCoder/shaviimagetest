/**
 * Brand Model
 * 
 * Mongoose schema and model for Brand entity
 */

import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Brand schema definition
const BrandSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      minlength: [1, 'Brand name must be at least 1 character'],
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
      index: true,
    },
    slug: {
      type: String,
      required: false, // Will be generated in pre-save middleware
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Logo is optional
          // Allow local upload paths
          const isLocalUpload = /^uploads\/brands\//.test(v);
          // Allow HTTP/HTTPS URLs
          const isValidUrl = /^https?:\/\/.+/i.test(v);
          return isLocalUpload || isValidUrl;
        },
        message: 'Logo must be either an uploaded file or a valid HTTP/HTTPS URL',
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Website is optional
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Website must be a valid HTTP/HTTPS URL',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

// Virtual for product count (populated when needed)
BrandSchema.virtual('productCount', {
  ref: 'Product',
  localField: 'name',
  foreignField: 'brand',
  count: true,
  match: { isActive: true }
});

// Indexes for better query performance
BrandSchema.index({ isActive: 1, isFeatured: 1 });
BrandSchema.index({ isActive: 1, sortOrder: 1 });
BrandSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
BrandSchema.pre('save', function (next) {
  // Always ensure slug exists, either from input or generated from name
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static method to find active brands
BrandSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Static method to find featured brands
BrandSchema.statics.findFeatured = function (limit = 10) {
  return this.find({ 
    isFeatured: true, 
    isActive: true 
  })
  .sort({ sortOrder: 1, name: 1 })
  .limit(limit);
};

// Create and export the Brand model
const Brand: Model<IBrand> = 
  mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;