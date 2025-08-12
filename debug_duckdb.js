/**
 * Simple DuckDB parameter binding test
 */

const { Database } = require('duckdb');

// Create a simple test
const db = new Database(':memory:');
const conn = db.connect();

// Create a simple table
conn.run(`CREATE TABLE test_table (id INTEGER, name VARCHAR)`, (err) => {
  if (err) {
    console.error('Create table error:', err);
    return;
  }
  
  console.log('Table created successfully');
  
  // Try inserting with parameters
  conn.run(`INSERT INTO test_table VALUES (?, ?)`, [1, 'test'], (err) => {
    if (err) {
      console.error('Insert error:', err);
      return;
    }
    
    console.log('Insert successful');
    
    // Try selecting with parameters
    conn.all(`SELECT * FROM test_table WHERE id = ?`, [1], (err, result) => {
      if (err) {
        console.error('Select error:', err);
        return;
      }
      
      console.log('Select successful:', result);
      
      // Try a query with multiple parameters
      conn.all(`SELECT * FROM test_table WHERE id = ? AND name = ?`, [1, 'test'], (err, result) => {
        if (err) {
          console.error('Multi-param select error:', err);
        } else {
          console.log('Multi-param select successful:', result);
        }
        
        conn.close();
        db.close();
      });
    });
  });
});
