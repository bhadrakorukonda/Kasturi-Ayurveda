import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';

dotenv.config();

const createAdminUser = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ MongoDB Connected');

    // Check if admin exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@kasturiayurveda.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
    });

    console.log('✅ Admin user created successfully');
    console.log(`Email: ${admin.email}`);
    console.log('Password: (as set in .env or default)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdminUser();
