import express from "express"
import protect from "../middleware/protect.middleware.js"
import {
    getMe,
    login,
    logout,
    signup,
    forgotPassword,
    resetPassword,
    validateResetToken
} from "../controllers/auth.controller.js"

const routes = express.Router()

// Existing routes
routes.post("/register", signup)
routes.post("/login", login);
routes.get("/profile", protect, getMe);
routes.post("/logout", protect, logout);

// Password reset routes (no authentication required)
routes.post("/forgot-password", forgotPassword);
routes.post("/reset-password", resetPassword);
routes.get("/validate-reset-token/:token", validateResetToken);

export default routes;