// create-admin.js - Run this file directly
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function createAdmin() {
    const email = 'admin@cozones.com';
    const password = 'Admin@123';
    const full_name = 'System Admin';

    // Generate proper hash
    const password_hash = await bcrypt.hash(password, 10);

    console.log('Generated hash:', password_hash);

    try {
        // Check if user exists
        const checkQuery = 'SELECT id FROM users WHERE email = $1';
        const existing = await pool.query(checkQuery, [email]);

        if (existing.rows.length > 0) {
            // Update existing user to admin
            const updateQuery = `
                UPDATE users 
                SET password_hash = $1, role = 'admin', full_name = $2, is_verified = true
                WHERE email = $3
                RETURNING id, email, role
            `;
            const result = await pool.query(updateQuery, [password_hash, full_name, email]);
            console.log('✅ Updated existing user to admin:', result.rows[0]);
        } else {
            // Create new admin
            const insertQuery = `
                INSERT INTO users (email, password_hash, full_name, role, is_verified)
                VALUES ($1, $2, $3, 'admin', true)
                RETURNING id, email, role
            `;
            const result = await pool.query(insertQuery, [email, password_hash, full_name]);
            console.log('✅ Created new admin:', result.rows[0]);
        }

        console.log('\n🎉 Admin user ready!');
        console.log('Email: admin@cozones.com');
        console.log('Password: Admin@123');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createAdmin();