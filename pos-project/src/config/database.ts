import mongoose from 'mongoose';
import { mockDatabase, connectToMockDatabase } from './mockDatabase';

// Flag to track if we're using mock database
export let usingMockDatabase = false;

// MongoDB connection URI (use environment variables in production)
// Using MongoDB Atlas free tier as default since local MongoDB isn't available
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pos_user:pos_password@cluster0.mongodb.net/pos_system?retryWrites=true&w=majority';

// Note: Replace the above connection string with your actual MongoDB Atlas connection string
// Sign up at https://www.mongodb.com/cloud/atlas/register for a free MongoDB Atlas account

// Connect to MongoDB with retry logic
export async function connectToDatabase() {
  try {
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);
    console.log('Connected to MongoDB');

    return mongoose.connection;
  } catch (err) {
    console.error('\n================================================');
    console.error('ERROR: Failed to connect to MongoDB');
    console.error('\nPossible solutions:');
    console.error('1. Make sure MongoDB is running on your local machine');
    console.error('2. Create a MongoDB Atlas account and use that connection string');
    console.error('3. Set the MONGODB_URI environment variable:');
    console.error('   export MONGODB_URI="your_connection_string"');
    console.error('\nOr update the connection string directly in src/config/database.ts');
    console.error('\nSwitching to mock database for development.');
    console.error('================================================\n');
    
    // Use mock database instead
    usingMockDatabase = true;
    return connectToMockDatabase();
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});