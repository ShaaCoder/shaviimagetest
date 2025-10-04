/**
 * Offer Model
 * 
 * Mongoose schema and model for Offer/Coupon entity
 */

import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IOffer extends Document {
  title: string;
  description: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'bogo';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  categories: string[];
  brands: string[];
  products: string[];
  usageLimit?: number;
  usageCount: number;
  userUsageLimit: number;
  newCustomerOnly: boolean;
  applicableUserRoles: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Offer schema definition
const OfferSchema = new Schema<IOffer>(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    code: {
      type: String,
      required: [true, 'Offer code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Code must be at least 3 characters'],
      maxlength: [20, 'Code cannot exceed 20 characters'],
      validate: {
        validator: function (v: string) {
          return /^[A-Z0-9]+$/.test(v);
        },
        message: 'Code can only contain uppercase letters and numbers',
      },
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Offer type is required'],
      enum: {
        values: ['percentage', 'fixed', 'shipping', 'bogo'],
        message: 'Type must be one of: percentage, fixed, shipping, bogo'
      },
      index: true,
    },
    value: {
      type: Number,
      required: [true, 'Offer value is required'],
      min: [0, 'Value cannot be negative'],
      validate: {
        validator: function (this: IOffer, v: number) {
          if (this.type === 'percentage' && v > 100) {
            return false;
          }
          if (this.type === 'shipping' && v !== 0) {
            return false;
          }
          return true;
        },
        message: 'Invalid value for offer type',
      },
    },
    minAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum amount cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      min: [0, 'Maximum discount cannot be negative'],
      validate: {
        validator: function (this: IOffer, v: number) {
          // Only applicable for percentage discounts
          if (this.type === 'percentage' && v !== undefined) {
            return v > 0;
          }
          return true;
        },
        message: 'Maximum discount must be positive for percentage offers',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
      index: true,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (this: IOffer, v: Date) {
          return !v || v > this.startDate;
        },
        message: 'End date must be after start date',
      },
      index: true,
    },
    categories: [{
      type: String,
      trim: true,
    }],
    brands: [{
      type: String,
      trim: true,
    }],
    products: [{
      type: String,
      trim: true,
    }],
    usageLimit: {
      type: Number,
      min: [1, 'Usage limit must be at least 1'],
      validate: {
        validator: function (v: number) {
          return v === null || v === undefined || Number.isInteger(v);
        },
        message: 'Usage limit must be a whole number',
      },
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    userUsageLimit: {
      type: Number,
      default: 1,
      min: [1, 'User usage limit must be at least 1'],
    },
    newCustomerOnly: {
      type: Boolean,
      default: false,
      index: true,
    },
    applicableUserRoles: [{
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    }],
    createdBy: {
      type: String,
      trim: true,
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

// Virtual for remaining usage
OfferSchema.virtual('remainingUsage').get(function () {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usageCount);
});

// Virtual for usage percentage
OfferSchema.virtual('usagePercentage').get(function () {
  if (!this.usageLimit) return 0;
  return Math.min(100, (this.usageCount / this.usageLimit) * 100);
});

// Virtual for status
OfferSchema.virtual('status').get(function () {
  const now = new Date();
  
  if (!this.isActive) return 'inactive';
  if (this.startDate > now) return 'scheduled';
  if (this.endDate && this.endDate < now) return 'expired';
  if (this.usageLimit && this.usageCount >= this.usageLimit) return 'exhausted';
  
  return 'active';
});

// Indexes for better query performance
OfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
OfferSchema.index({ categories: 1, isActive: 1 });
OfferSchema.index({ brands: 1, isActive: 1 });
OfferSchema.index({ newCustomerOnly: 1, isActive: 1 });
OfferSchema.index({ type: 1, isActive: 1 });

// Static method to find active offers
OfferSchema.statics.findActive = function (filter = {}) {
  const now = new Date();
  return this.find({
    ...filter,
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: now } }
    ]
  });
};

// Static method to find offers by category
OfferSchema.statics.findByCategory = function (category: string) {
  return (this as any).findActive({ categories: category });
};

// Static method to find offers by brand
OfferSchema.statics.findByBrand = function (brand: string) {
  return (this as any).findActive({ brands: brand });
};

// Instance method to check if offer is currently valid
OfferSchema.methods.isValid = function () {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (this.startDate > now) return false;
  if (this.endDate && this.endDate < now) return false;
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  
  return true;
};

// Instance method to calculate discount
OfferSchema.methods.calculateDiscount = function (
  cartTotal: number, 
  items?: any[]
) {
  if (!this.isValid()) return 0;
  
  // Check minimum amount
  if (cartTotal < this.minAmount) return 0;
  
  let discount = 0;
  
  switch (this.type) {
    case 'percentage':
      discount = (cartTotal * this.value) / 100;
      if (this.maxDiscount) {
        discount = Math.min(discount, this.maxDiscount);
      }
      break;
      
    case 'fixed':
      discount = Math.min(this.value, cartTotal);
      break;
      
    case 'shipping':
      // For shipping offers, return the shipping cost to be deducted
      discount = this.value || 0;
      break;
      
    case 'bogo':
      // BOGO logic would need item-level calculation
      // This is simplified - you'd need to implement based on your cart structure
      discount = 0;
      break;
      
    default:
      discount = 0;
  }
  
  return Math.max(0, discount);
};

// Pre-save middleware to ensure code is uppercase
OfferSchema.pre('save', function (next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Create and export the Offer model
const Offer: Model<IOffer> = 
  mongoose.models.Offer || mongoose.model<IOffer>('Offer', OfferSchema);

export default Offer;