const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Offer Schema (simplified for script)
const OfferSchema = new mongoose.Schema({
  title: String,
  description: String,
  code: String,
  type: String,
  value: Number,
  minAmount: Number,
  maxDiscount: Number,
  isActive: Boolean,
  startDate: Date,
  endDate: Date,
  categories: [String],
  brands: [String],
  products: [String],
  usageLimit: Number,
  usageCount: Number,
  userUsageLimit: Number,
  newCustomerOnly: Boolean,
  applicableUserRoles: [String],
}, { timestamps: true });

const Offer = mongoose.models.Offer || mongoose.model('Offer', OfferSchema);

async function addSampleOffers() {
  try {
    await connectDB();
    
    // Check if offers already exist
    const existingOffers = await Offer.countDocuments();
    if (existingOffers > 0) {
      console.log(`🔍 Found ${existingOffers} existing offers`);
      const offers = await Offer.find({}).limit(5);
      console.log('📋 Existing offers:');
      offers.forEach(offer => {
        console.log(`  - ${offer.title} (${offer.code})`);
      });
      return;
    }

    // Sample offers data
    const sampleOffers = [
      {
        title: 'Second Purchase Discount',
        description: 'Get 41% off on your second purchase. Valid on all beauty products.',
        code: 'SECOND15',
        type: 'percentage',
        value: 41,
        minAmount: 199,
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-10-08'),
        categories: ['beauty', 'skincare'],
        brands: ['Dymatize', 'shavi', 'GNC'],
        products: [],
        usageLimit: 40,
        usageCount: 0,
        userUsageLimit: 1,
        newCustomerOnly: true,
        applicableUserRoles: ['customer'],
      },
      {
        title: 'Free Shipping Offer',
        description: 'Get free shipping on orders above ₹198. Valid for first-time customers.',
        code: 'FIRSTSAVE10',
        type: 'shipping',
        value: 0,
        minAmount: 198,
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-10-22'),
        categories: [],
        brands: ['shavi', 'Dymatize'],
        products: [],
        usageLimit: 40,
        usageCount: 0,
        userUsageLimit: 1,
        newCustomerOnly: false,
        applicableUserRoles: ['customer'],
      },
      {
        title: 'Mega Sale - 50% Off',
        description: 'Huge discount on selected beauty products. Limited time offer!',
        code: 'MEGA50',
        type: 'percentage',
        value: 50,
        minAmount: 500,
        maxDiscount: 2000,
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        categories: ['beauty', 'makeup'],
        brands: [],
        products: [],
        usageLimit: 100,
        usageCount: 25,
        userUsageLimit: 1,
        newCustomerOnly: false,
        applicableUserRoles: ['customer'],
      }
    ];

    // Insert sample offers
    const insertedOffers = await Offer.insertMany(sampleOffers);
    
    console.log(`✅ Successfully added ${insertedOffers.length} sample offers:`);
    insertedOffers.forEach(offer => {
      console.log(`  - ${offer.title} (${offer.code})`);
    });

  } catch (error) {
    console.error('❌ Error adding sample offers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

addSampleOffers();