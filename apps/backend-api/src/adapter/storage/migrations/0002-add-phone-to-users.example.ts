import { Migration } from 'migrate-mongoose';
import { connect, connection } from 'mongoose';
import config from '../../../configuration';

export const up: Migration = async () => {
  const uri = config().mongodb.uri;
  await connect(uri);
  
  const db = connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCollection = db.collection('users');
  
  await usersCollection.updateMany(
    { phone: { $exists: false } },
    { $set: { phone: null } }
  );
  
  await usersCollection.createIndex({ phone: 1 });
  
  console.log('✅ Added phone field to users collection');
};

export const down: Migration = async () => {
  const uri = config().mongodb.uri;
  await connect(uri);
  
  const db = connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCollection = db.collection('users');
  
  await usersCollection.updateMany(
    {},
    { $unset: { phone: '' } }
  );
  
  await usersCollection.dropIndex('phone_1').catch(() => {
    // Ignore error if index doesn't exist
  });
  
  console.log('✅ Removed phone field from users collection');
};
