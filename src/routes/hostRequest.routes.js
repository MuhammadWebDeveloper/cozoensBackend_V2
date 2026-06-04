import express from "express";
import {
    approveHostRequest,
    canSubmitHostRequest,
    getHostRequestStatus,
    getMyHostRequests,
    getPendingHostRequests,
    rejectHostRequest,
    submitHostRequest
} from "../controllers/hostRequest.controller.js";
import { adminOnly } from "../middleware/role.middleware.js";
import protect from "../middleware/protect.middleware.js";

const Hostrouter = express.Router();

// User routes (for owners/users)
Hostrouter.post("/submit", protect, submitHostRequest);
Hostrouter.get("/my-requests", protect, getMyHostRequests);
// REMOVED the ? from route - use separate routes
Hostrouter.get("/status", protect, getHostRequestStatus);
Hostrouter.get("/status/:requestId", protect, getHostRequestStatus);
Hostrouter.get("/can-submit", protect, canSubmitHostRequest);

// Admin routes
Hostrouter.get("/pending", protect, adminOnly, getPendingHostRequests);
Hostrouter.patch("/:requestId/approve", protect, adminOnly, approveHostRequest);
Hostrouter.patch("/:requestId/reject", protect, adminOnly, rejectHostRequest);

export default Hostrouter;