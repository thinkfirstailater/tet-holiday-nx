# Migrations

Mongoose migrations using migrate-mongoose.

## Usage

```bash
# Create a new migration
npm run migration:create <migration-name>

# Run migrations
npm run migration:up

# Rollback last migration
npm run migration:down

# Check migration status
npm run migration:status
```

## When to Use Migrations

**Mongoose tự động sync schema** - Không cần migration cho:
- ✅ Thêm field mới (Mongoose tự động thêm khi save document mới)
- ❌ Xóa field (Mongoose KHÔNG tự động xóa - data cũ vẫn còn trong DB)
- ⚠️ Thay đổi type field (Mongoose không validate type cũ, chỉ validate document mới)

**Cần migration khi:**
- ❌ **Xóa field** - Cần migration để xóa field khỏi documents cũ
- 🔄 Transform data cũ sang format mới
- 📊 Thêm indexes cho performance
- 🌱 Seed initial data
- 🔀 Rename fields (cần migrate data từ field cũ sang mới)
- 🏗️ Thay đổi cấu trúc dữ liệu phức tạp
- 🔧 Set default values cho documents cũ khi thêm field mới

## Migration Template

```typescript
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

  const collection = db.collection('users');
  
  // Example: Add new field with default value
  await collection.updateMany(
    { phone: { $exists: false } },
    { $set: { phone: null } }
  );
  
  // Example: Create index
  await collection.createIndex({ phone: 1 });
  
  console.log('✅ Migration completed');
};

export const down: Migration = async () => {
  const uri = config().mongodb.uri;
  await connect(uri);
  
  const db = connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const collection = db.collection('users');
  
  // Rollback: Remove field
  await collection.updateMany(
    {},
    { $unset: { phone: '' } }
  );
  
  // Rollback: Drop index
  await collection.dropIndex('phone_1');
  
  console.log('✅ Rollback completed');
};
```

## Example: Add New Field

1. Update Entity:
```typescript
@Prop({ type: String })
phone?: string;
```

2. Create migration (if need to set default for existing data):
```bash
npm run migration:create add-phone-to-users
```

3. Run migration:
```bash
npm run migration:up
```
