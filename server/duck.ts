import Database from 'duckdb';
import path from 'path';

/**
 * DuckDB singleton instance for the Express server
 * Handles database connection and query execution
 * Uses the same database created during ETL Phase 2
 */
class DuckDBManager {
  private static instance: DuckDBManager;
  private db: Database.Database;
  private connection: Database.Connection | null = null;
  private readonly dbPath: string;

  private constructor() {
    // Use the database file created during ETL
    this.dbPath = path.join(process.cwd(), 'data', 'library.duckdb');
    this.db = new Database.Database(this.dbPath);
    console.log(`📊 DuckDB initialized with database: ${this.dbPath}`);
  }

  public static getInstance(): DuckDBManager {
    if (!DuckDBManager.instance) {
      DuckDBManager.instance = new DuckDBManager();
    }
    return DuckDBManager.instance;
  }

  /**
   * Get a database connection
   */
  public async getConnection(): Promise<Database.Connection> {
    if (!this.connection) {
      this.connection = this.db.connect();
      console.log('📡 DuckDB connection established');
    }
    return this.connection;
  }

  /**
   * Execute a query and return results
   * Uses string interpolation as workaround for parameter binding bug in DuckDB 1.3.2
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const connection = await this.getConnection();
      
      console.log(`🔍 Executing query: ${sql}`);
      if (params.length > 0) {
        console.log(`📝 Parameters: ${JSON.stringify(params)}`);
      }

      return new Promise((resolve, reject) => {
        connection.all(sql, (err, result) => {
          if (err) {
            console.error('❌ DuckDB query error:', err);
            reject(err);
          } else {
            console.log(`✅ Query returned ${result.length} rows`);
            resolve(result as T[]);
          }
        });
      });
    } catch (error) {
      console.error('❌ DuckDB connection error:', error);
      throw error;
    }
  }

  /**
   * Execute a parameterized query using string interpolation (workaround for DuckDB 1.3.2 bug)
   * Safely interpolates parameters into SQL string
   */
  public async queryWithParams<T = any>(sql: string, params: Record<string, any> = {}): Promise<T[]> {
    let interpolatedSql = sql;
    
    // Replace named parameters with actual values
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `$${key}`;
      let escapedValue: string;
      
      if (value === null || value === undefined) {
        escapedValue = 'NULL';
      } else if (typeof value === 'string') {
        // Escape single quotes in strings
        escapedValue = `'${value.replace(/'/g, "''")}'`;
      } else if (typeof value === 'number') {
        escapedValue = value.toString();
      } else if (typeof value === 'boolean') {
        escapedValue = value ? 'TRUE' : 'FALSE';
      } else {
        // For arrays or objects, convert to JSON string
        escapedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      }
      
      interpolatedSql = interpolatedSql.replace(new RegExp(`\\$${key}\\b`, 'g'), escapedValue);
    }
    
    return this.query<T>(interpolatedSql);
  }

  /**
   * Check if the database file exists and has the expected tables
   */
  public async validateDatabase(): Promise<boolean> {
    try {
      const tables = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
      `);
      
      const tableNames = tables.map((t: any) => t.table_name);
      const expectedTables = ['books_clean'];
      
      const hasAllTables = expectedTables.every(table => tableNames.includes(table));
      
      if (hasAllTables) {
        console.log('✅ Database validation successful - all expected tables found');
        return true;
      } else {
        console.warn('⚠️ Database missing expected tables:', expectedTables.filter(t => !tableNames.includes(t)));
        return false;
      }
    } catch (error) {
      console.error('❌ Database validation failed:', error);
      return false;
    }
  }

  /**
   * Get basic database statistics
   */
  public async getStats(): Promise<{ clean_count: number; genres: string[] }> {
    try {
      const [cleanCount] = await this.query('SELECT COUNT(*) as count FROM books_clean');
      const genres = await this.query('SELECT DISTINCT genre FROM books_clean ORDER BY genre');
      
      return {
        clean_count: cleanCount.count,
        genres: genres.map((g: any) => g.genre)
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.db.close();
    console.log('🔒 DuckDB connection closed');
  }
}

export default DuckDBManager;
