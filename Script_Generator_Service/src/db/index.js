const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const options = {
      useNewUrlParser: true,
      dbName: process.env.DB_NAME || 'Script_Generator', // Tên database
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    // Log connection details
    console.log('MongoDB Connection Details:');
    console.log(`- Host: ${conn.connection.host}`);
    console.log(`- Database: ${conn.connection.db.databaseName}`);
    console.log(`- Collections: ${Object.keys(conn.connection.collections).join(', ')}`);
    
    // Test database connection by listing collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('\nAvailable Collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 