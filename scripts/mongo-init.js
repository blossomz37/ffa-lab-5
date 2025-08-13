// MongoDB initialization script for production deployment

// Create database and collections
db = db.getSiblingDB('book_analytics');

// Create collections with validation
db.createCollection('books', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['asin', 'title', 'author', 'genre', 'ingested_date'],
      properties: {
        asin: { bsonType: 'string', pattern: '^[A-Z0-9]{10}$' },
        title: { bsonType: 'string', minLength: 1 },
        author: { bsonType: 'string', minLength: 1 },
        genre: { bsonType: 'string', minLength: 1 },
        ingested_date: { bsonType: 'string' },
        rating: { bsonType: ['double', 'null'], minimum: 0, maximum: 5 },
        price: { bsonType: ['double', 'null'], minimum: 0 },
        review_count: { bsonType: ['int', 'null'], minimum: 0 }
      }
    }
  }
});

// Create indexes for performance
db.books.createIndex({ 'asin': 1 }, { unique: true });
db.books.createIndex({ 'genre': 1, 'ingested_date': 1 });
db.books.createIndex({ 'rating': -1 });
db.books.createIndex({ 'review_count': -1 });
db.books.createIndex({ 'price': 1 });
db.books.createIndex({ 'author': 1 });
db.books.createIndex({ 'title': 'text', 'author': 'text' });

// Create compound index for uniqueness
db.books.createIndex(
  { 'ingested_date': 1, 'genre': 1, 'asin': 1 }, 
  { unique: true }
);

// Create analytics collection for caching query results
db.createCollection('analytics_cache', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['query_key', 'result', 'created_at'],
      properties: {
        query_key: { bsonType: 'string' },
        result: { bsonType: 'object' },
        created_at: { bsonType: 'date' },
        expires_at: { bsonType: 'date' }
      }
    }
  }
});

db.analytics_cache.createIndex({ 'query_key': 1 }, { unique: true });
db.analytics_cache.createIndex({ 'expires_at': 1 }, { expireAfterSeconds: 0 });

// Create application user with limited permissions
db.createUser({
  user: 'book_app',
  pwd: 'app_password_456',
  roles: [
    {
      role: 'readWrite',
      db: 'book_analytics'
    }
  ]
});

print('MongoDB initialization completed successfully');
print('Database: book_analytics');
print('Collections: books, analytics_cache');
print('User: book_app (readWrite permissions)');
print('Indexes created for optimal query performance');