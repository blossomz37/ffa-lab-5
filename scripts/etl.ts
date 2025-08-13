#!/usr/bin/env node

/**
 * ETL CLI Script
 * 
 * Command-line interface for running the book data ETL pipeline.
 * Usage: node scripts/etl.ts [options]
 */

/**
 * Main function that runs the ETL pipeline
 */
async function main(): Promise<void> {
  try {
    // Import ETL modules
    const { ETLRunner, parseETLArgs } = await import('../src/etl/run.js');
    
    // Parse command line arguments
    const args = process.argv.slice(2); // Remove 'node' and script path
    const config = parseETLArgs(args);
    
    // Create and run ETL pipeline
    const etlRunner = new ETLRunner(config);
    const result = await etlRunner.run();
    
    // Exit with appropriate code
    const exitCode = result.summary.failedFiles > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('💥 ETL script failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main();
