import { Migration } from 'migrate-mongoose';
import { connect } from 'mongoose';
import config from '../../../configuration';

export const up: Migration = async () => {
  const uri = config().mongodb.uri;
  await connect(uri);
  
  const db = (await import('mongoose')).connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCollection = db.collection('users');
  
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ createdAt: 1 });
  
  console.log('✅ Created indexes for users collection');
};

export const down: Migration = async () => {
  const uri = config().mongodb.uri;
  await connect(uri);
  
  const db = (await import('mongoose')).connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCollection = db.collection('users');
  
  await usersCollection.dropIndex('email_1');
  await usersCollection.dropIndex('createdAt_1');
  
  console.log('✅ Dropped indexes for users collection');
};
