import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool;


// Local development
pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});
console.log("✅ Using Local Database");


const connectDB = async () => {
    try {
        await pool.connect();
        console.log("✅ PostgreSQL Connected Successfully");
    } catch (error) {
        console.error("❌ Database Connection Error:", error.message);
        console.log("Please check your database credentials");
    }
};

export { pool, connectDB };
export default connectDB;


