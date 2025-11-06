import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
};

/**
 * Drop database, close the connection and stop the in-memory server
 */
export const closeDatabase = async (): Promise<void> => {
  // readyState 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  // Using string comparison to avoid enum comparison issues
  const readyState = Number(mongoose.connection.readyState);
  if (readyState !== 0 && !Number.isNaN(readyState)) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer !== undefined && mongoServer !== null) {
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
