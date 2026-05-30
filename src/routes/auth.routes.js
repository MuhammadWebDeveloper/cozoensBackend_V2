import express from "express"
import protect from "../middleware/protect.middleware.js"
import { getMe, login, logout, signup } from "../controllers/auth.controller.js"

const routes = express.Router()
routes.post("/register", signup)
routes.post("/login", login);
routes.get("/profile", protect, getMe);
routes.post("/logout", protect, logout);
export default routes;

