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

        // ✅ Generate token with BOTH id and role
        const token = generateToken(userData.user_id, userData.user_role);

        // Prepare user object for email and response
        const newUser = {
            id: userData.user_id,
            full_name: userData.user_full_name,
            email: userData.user_email,
            role: userData.user_role,  // ✅ Role is included
        };

        // Send emails (don't await - run in background)
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

        // ✅ Generate token with BOTH id and role
        const token = generateToken(user.user_id, user.user_role);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.user_id,
                full_name: user.user_full_name,
                email: user.user_email,
                role: user.user_role,  // ✅ Role is included
                phone: user.user_phone
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


// =============================
// FORGOT PASSWORD - Request reset
// =============================
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Call stored procedure to save token
        const result = await pool.query(
            `SELECT * FROM sp_forgot_password($1, $2, $3)`,
            [email, resetToken, tokenExpiry]
        );

        const userData = result.rows[0];

        if (!userData.success) {
            return res.status(404).json({
                success: false,
                message: userData.message || 'User not found'
            });
        }

        // Send reset email
        const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

        // Import your email transporter (if not already imported)
        const { sendPasswordResetEmail } = await import('../services/email.service.js');

        await sendPasswordResetEmail({
            email: userData.user_email,
            full_name: userData.user_full_name,
            resetUrl: resetUrl
        });

        res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// =============================
// RESET PASSWORD - Set new password
// =============================
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Call stored procedure to reset password
        const result = await pool.query(
            `SELECT * FROM sp_reset_password($1, $2)`,
            [token, password_hash]
        );

        const resetData = result.rows[0];

        if (!resetData.success) {
            return res.status(400).json({
                success: false,
                message: resetData.message || 'Invalid or expired token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successful! You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// =============================
// VALIDATE RESET TOKEN
// =============================
export const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await pool.query(
            `SELECT * FROM sp_validate_reset_token($1)`,
            [token]
        );

        const tokenData = result.rows[0];

        if (!tokenData || !tokenData.is_valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            user: {
                email: tokenData.user_email,
                full_name: tokenData.user_full_name
            }
        });

    } catch (error) {
        console.error('Validate token error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};