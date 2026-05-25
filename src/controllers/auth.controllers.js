// Backend/src/controllers/auth.controllers.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import generateToken from "../utils/generateToken.js";
import { pool } from "../config/db.config.js";
import { sendWelcomeEmail, sendAdminNotification } from "../services/email.service.js";

// =============================
// SIGNUP
// =============================
export const signup = async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `SELECT * FROM sp_signup($1, $2, $3, $4)`,
            [full_name, email, password_hash, phone]
        );

        const userData = result.rows[0];

        if (userData.message === 'User already exists') {
            return res.status(400).json({
                success: false,
                message: userData.message,
            });
        }

        const token = generateToken(userData.user_id);

        // ✅ Prepare user object for email
        const newUser = {
            id: userData.user_id,
            full_name: userData.user_full_name,
            email: userData.user_email,
            role: userData.user_role,
        };

        // ✅ Send emails (don't await - run in background)
        sendWelcomeEmail(newUser);
        sendAdminNotification(newUser);

        res.status(201).json({
            success: true,
            message: userData.message + " Check your email for welcome message!",
            token,
            user: newUser,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// =============================
// LOGIN
// =============================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Call stored procedure - gets user + password_hash
        const result = await pool.query(
            `SELECT * FROM sp_login($1)`,
            [email]
        );

        // Check if user exists
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const user = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Generate token
        const token = generateToken(user.user_id);

        // ✅ Optional: Send login notification (commented by default)
        // Uncomment if you want login notifications
        // const loggedInUser = {
        //     id: user.user_id,
        //     full_name: user.user_full_name,
        //     email: user.user_email,
        //     role: user.user_role,
        // };
        // sendLoginNotification(loggedInUser, req);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.user_id,
                full_name: user.user_full_name,
                email: user.user_email,
                role: user.user_role,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// =============================
// GET CURRENT USER
// =============================
export const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM sp_get_user($1)`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const user = result.rows[0];

        res.status(200).json({
            success: true,
            user: {
                id: user.user_id,
                full_name: user.user_full_name,
                email: user.user_email,
                role: user.user_role,
                phone: user.user_phone,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// =============================
// LOGOUT
// =============================
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                const expiresAt = new Date(decoded.exp * 1000);
                const tokenHash = hashToken(token);

                await pool.query(
                    `INSERT INTO token_blacklist (token_hash, user_id, expires_at)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (token_hash) DO NOTHING`,
                    [tokenHash, req.user.id, expiresAt]
                );
            }
        }

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(200).json({
            success: true,
            message: "Logged out"
        });
    }
};