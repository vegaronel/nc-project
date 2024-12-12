import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config();
// Detect environment and configure database URL
const isProduction = process.env.NODE_ENV === "production";
const connectionString = isProduction
  ? process.env.DATABASE_URL
  : `postgresql://${process.env.db_User}:${process.env.db_Password}@${process.env.db_Host}:${process.env.db_Port}/${process.env.db_Database}`;

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL only in production
});

const init = async () => {
  try {
    const createUsersTable = await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "displayName" TEXT NOT NULL,
        password TEXT NOT NULL,
        type TEXT NOT NULL,
        email TEXT DEFAULT '' -- Allow empty string as default
      )
    `);
    console.log('Users table created or already exists');
  } catch (err) {
    console.error('Error creating users table:', err);
  }

  try {
    // Create the messages table if it doesn't exist
    const createMessagesTable = await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "displayName" TEXT NOT NULL,
        message TEXT NOT NULL,
        room TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Messages table created or already exists");
  } catch (err) {
    console.error("Error creating messages table:", err);
  }
};
init();

export default pool;
