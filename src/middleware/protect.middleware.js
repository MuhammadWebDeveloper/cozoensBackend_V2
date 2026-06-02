// Backend/src/middleware/protect.middleware.js
import jwt from "jsonwebtoken";
import { pool } from "../config/db.config.js";

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized",
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ Fetch user from database to get role
        const result = await pool.query(
            'SELECT id, email, full_name, role FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        const user = result.rows[0];

        // ✅ Set full user object with role
        req.user = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role
        };

        next();
    } catch (error) {
        console.error("Protect middleware error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};

export default protect;