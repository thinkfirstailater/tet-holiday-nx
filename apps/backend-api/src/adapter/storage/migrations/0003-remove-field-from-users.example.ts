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
    {},
    { $unset: { oldField: '' } }
  );
  
  console.log('✅ Removed oldField from all users documents');
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
    { oldField: { $exists: false } },
    { $set: { oldField: null } }
  );
  
  console.log('✅ Restored oldField to users documents');
};
