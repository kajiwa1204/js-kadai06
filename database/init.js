import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
};

const init = async () => {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);

    console.log('Creating database `tsumidoku` if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS tsumidoku');
    await connection.end();

    console.log('Connecting to `tsumidoku` database...');
    connection = await mysql.createConnection({
      ...dbConfig,
      database: 'tsumidoku',
    });

    console.log('Creating `books` table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100),
        status ENUM('unread', 'reading', 'read') DEFAULT 'unread',
        memo TEXT,
        image_filename VARCHAR(255),
        total_pages INT DEFAULT 0,
        current_page INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('books table created/checked');
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

init();
