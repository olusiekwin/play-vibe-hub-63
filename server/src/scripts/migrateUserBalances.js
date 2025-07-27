import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { connectDB } from '../config/database.js';

// Migration script to update existing users with new balance fields
async function migrateUserBalances() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB for migration');

    // Find all users that don't have the new fields or have undefined values
    const users = await User.find({
      $or: [
        { demoBalance: { $exists: false } },
        { realBalance: { $exists: false } },
        { accountMode: { $exists: false } },
        { demoBalance: null },
        { realBalance: null },
        { accountMode: null }
      ]
    });

    console.log(`📊 Found ${users.length} users to migrate`);

    for (const user of users) {
      console.log(`🔄 Migrating user: ${user.email}`);
      
      // Set default values if they don't exist
      if (user.demoBalance === undefined || user.demoBalance === null) {
        user.demoBalance = 10000; // Default demo balance
      }
      
      if (user.realBalance === undefined || user.realBalance === null) {
        user.realBalance = 0; // Default real balance
      }
      
      if (!user.accountMode) {
        user.accountMode = 'demo'; // Default to demo mode
      }

      // If the legacy balance field is higher than both new balances, 
      // assume it was the user's demo balance
      if (user.balance > user.demoBalance && user.balance > user.realBalance) {
        user.demoBalance = user.balance;
      }

      await user.save();
      console.log(`✅ Updated user: ${user.email} - Demo: ${user.demoBalance}, Real: ${user.realBalance}, Mode: ${user.accountMode}`);
    }

    console.log(`🎉 Migration completed! Updated ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit();
  }
}

// Run the migration
migrateUserBalances();
