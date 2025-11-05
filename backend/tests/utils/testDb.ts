import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
  // Create an in-memory MongoDB instance
  // Specify version that has available binaries for multiple platforms
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '5.0.13',
    },
  });
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
};

/**
 * Drop database, close the connection and stop the in-memory server
 */
export const closeDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all the data for all db collections
 */
export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};
