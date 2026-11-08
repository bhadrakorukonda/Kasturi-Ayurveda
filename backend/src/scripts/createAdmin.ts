import mongoose from 'mongoose';
import { env } from '../config/env';
import User from '../models/User.model';

const createAdminUser = async (): Promise<void> => {
  try {
    const adminEmail = env.ADMIN_EMAIL || process.argv[2];
    const adminPassword = env.ADMIN_PASSWORD || process.argv[3];

    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be provided in .env or as CLI arguments.');
      console.error('Usage: npx ts-node src/scripts/createAdmin.ts <email> <password>');
      process.exit(1);
    }

    if (adminPassword.length < 12) {
      console.error('❌ Error: Admin password must be at least 12 characters long.');
      process.exit(1);
    }

    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Check if admin exists
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (adminExists) {
      console.log(`⚠️  Admin user with email ${adminEmail} already exists`);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });

    console.log('✅ Admin user created successfully');
    console.log(`Email: ${admin.email}`);
    // Never print the password

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdminUser();
