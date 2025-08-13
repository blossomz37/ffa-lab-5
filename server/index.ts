import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import etlRoutes from './routes/etl';
import queryRoutes from './routes/query';
import exportRoutes from './routes/export';

// Import DuckDB manager
import DuckDBManager from './duck';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Express Server for Book Analytics API
 * Provides DuckDB-backed queries and DOCX export functionality
 * Designed to work with the React frontend from Phase 4
 */

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Book Analytics API',
    version: '1.0.0',
    description: 'Express server providing DuckDB-backed book analytics and DOCX export',
    endpoints: {
      health: 'GET /health',
      etl: {
        run: 'POST /etl/run',
        status: 'GET /etl/status',
      },
      query: {
        topRated: 'GET /query/top-rated',
        movers: 'GET /query/movers',
        priceBands: 'GET /query/price-bands',
        authorSearch: 'GET /query/author-search',
        newTitles: 'GET /query/new-titles',
        genreStats: 'GET /query/genre-stats',
        search: 'GET /query/search',
      },
      export: {
        docx: 'POST /export/docx',
        preview: 'POST /export/preview',
        formats: 'GET /export/formats',
      },
    },
    documentation: 'https://github.com/blossomz37/ffa-lab-5',
  });
});

// Mount route handlers
app.use('/etl', etlRoutes);
app.use('/query', queryRoutes);
app.use('/export', exportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: ['/health', '/api', '/etl/*', '/query/*', '/export/*'],
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    const duck = DuckDBManager.getInstance();
    await duck.close();
    console.log('✅ DuckDB connection closed');
  } catch (error) {
    console.error('❌ Error closing DuckDB:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    const duck = DuckDBManager.getInstance();
    await duck.close();
    console.log('✅ DuckDB connection closed');
  } catch (error) {
    console.error('❌ Error closing DuckDB:', error);
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize and validate DuckDB connection
    console.log('🚀 Initializing Book Analytics API Server...');
    
    const duck = DuckDBManager.getInstance();
    const isValid = await duck.validateDatabase();
    
    if (!isValid) {
      console.warn('⚠️ Database validation failed. ETL pipeline may need to be run first.');
      console.warn('⚠️ Server will start but some endpoints may not work until data is available.');
    } else {
      const stats = await duck.getStats();
      console.log('✅ Database validation successful:');
      console.log(`   - Clean books: ${stats.clean_count}`);
      console.log(`   - Genres: ${stats.genres.length}`);
    }
    
    // Start the Express server
    app.listen(PORT, () => {
      console.log('🎉 Book Analytics API Server is running!');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`📋 API Info: http://localhost:${PORT}/api`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log('🔗 Frontend should connect to this server for data');
      
      if (!isValid) {
        console.log('');
        console.log('⚠️  Note: Run ETL pipeline first if data endpoints return errors');
        console.log('   POST http://localhost:' + PORT + '/etl/run');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
