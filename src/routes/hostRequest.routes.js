import express from "express";
import { approveHostRequest, getPendingHostRequests, rejectHostRequest, submitHostRequest } from "../controllers/hostRequest.controller.js";
import { adminOnly } from "../middleware/role.middleware.js";
import protect from "../middleware/protect.middleware.js";


const Hostrouter = express.Router();

// User routes
Hostrouter.post("/submit", protect, submitHostRequest);

// Admin routes
Hostrouter.get("/pending", protect, adminOnly, getPendingHostRequests);
Hostrouter.patch("/:requestId/approve", protect, adminOnly, approveHostRequest);
Hostrouter.patch("/:requestId/reject", protect, adminOnly, rejectHostRequest);

export default Hostrouter;