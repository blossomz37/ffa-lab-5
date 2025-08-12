import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import DuckDBManager from '../duck';

const router = express.Router();

/**
 * ETL Routes
 * Provides endpoints to trigger ETL pipeline execution
 */

/**
 * POST /etl/run
 * Triggers the ETL pipeline to process raw data files
 */
router.post('/run', async (req, res) => {
  try {
    console.log('🚀 Starting ETL pipeline...');
    
    // Path to the ETL script
    const etlScriptPath = path.join(process.cwd(), 'scripts', 'etl.ts');
    
    // Spawn the ETL process
    const etlProcess = spawn('npx', ['tsx', etlScriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    etlProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('ETL stdout:', output);
    });

    etlProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error('ETL stderr:', output);
    });

    etlProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('✅ ETL pipeline completed successfully');
        
        try {
          // Validate the database after ETL
          const duck = DuckDBManager.getInstance();
          const isValid = await duck.validateDatabase();
          const stats = await duck.getStats();
          
          res.json({
            success: true,
            message: 'ETL pipeline completed successfully',
            database_valid: isValid,
            stats,
            execution_time: new Date().toISOString(),
          });
        } catch (dbError) {
          console.error('❌ Database validation error:', dbError);
          res.status(500).json({
            success: false,
            message: 'ETL completed but database validation failed',
            error: dbError instanceof Error ? dbError.message : 'Unknown database error',
            stdout,
            stderr,
          });
        }
      } else {
        console.error(`❌ ETL pipeline failed with exit code ${code}`);
        res.status(500).json({
          success: false,
          message: `ETL pipeline failed with exit code ${code}`,
          stdout,
          stderr,
          exit_code: code,
        });
      }
    });

    etlProcess.on('error', (error) => {
      console.error('❌ ETL process error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start ETL process',
        error: error.message,
      });
    });

    // Set a timeout for long-running ETL processes
    setTimeout(() => {
      if (etlProcess.exitCode === null) {
        console.warn('⚠️ ETL process timeout, killing process');
        etlProcess.kill('SIGTERM');
        res.status(408).json({
          success: false,
          message: 'ETL process timed out',
          stdout,
          stderr,
        });
      }
    }, 5 * 60 * 1000); // 5 minute timeout

  } catch (error) {
    console.error('❌ ETL route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /etl/status
 * Get current ETL pipeline status and database statistics
 */
router.get('/status', async (req, res) => {
  try {
    const duck = DuckDBManager.getInstance();
    const isValid = await duck.validateDatabase();
    
    if (isValid) {
      const stats = await duck.getStats();
      res.json({
        success: true,
        database_valid: true,
        stats,
        message: 'Database is ready and contains processed data',
      });
    } else {
      res.json({
        success: false,
        database_valid: false,
        message: 'Database not found or missing expected tables. Run ETL pipeline first.',
      });
    }
  } catch (error) {
    console.error('❌ ETL status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ETL status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
