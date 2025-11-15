import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config();

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create test user
    const testUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123', // This will be hashed by the pre-save hook
      role: 'admin',
    });

    // Save the user
    await testUser.save();
    
    console.log('Test user created successfully:', {
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();
