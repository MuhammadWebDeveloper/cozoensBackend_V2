import { pool } from "../config/db.config.js";
import { sendHostApprovalEmail, sendHostRejectionEmail } from "../services/email.service.js";

// =============================
// SUBMIT HOST REQUEST
// =============================
export const submitHostRequest = async (req, res) => {
    try {
        const { cnic_number, cnic_front_image, cnic_back_image, phone_number, additional_info } = req.body;
        const user_id = req.user.id;

        // Validate required fields
        if (!cnic_number || !cnic_front_image || !cnic_back_image || !phone_number) {
            return res.status(400).json({
                success: false,
                message: "All fields are required (CNIC number, images, and phone number)"
            });
        }

        const result = await pool.query(
            `SELECT * FROM sp_create_host_request($1, $2, $3, $4, $5, $6)`,
            [user_id, cnic_number, cnic_front_image, cnic_back_image, phone_number, additional_info || null]
        );

        const requestData = result.rows[0];

        if (!requestData.success) {
            return res.status(400).json({
                success: false,
                message: requestData.message
            });
        }

        res.status(201).json({
            success: true,
            message: requestData.message,
            request_id: requestData.request_id
        });

    } catch (error) {
        console.error("Submit host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// =============================
// GET PENDING REQUESTS (ADMIN)
// =============================
export const getPendingHostRequests = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const result = await pool.query(`SELECT * FROM sp_get_pending_host_requests()`);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            requests: result.rows
        });

    } catch (error) {
        console.error("Get pending requests error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// =============================
// APPROVE HOST REQUEST (ADMIN)
// =============================
export const approveHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { admin_notes } = req.body;
        const admin_id = req.user.id;

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const result = await pool.query(
            `SELECT * FROM sp_approve_host_request($1, $2, $3)`,
            [requestId, admin_id, admin_notes || null]
        );

        const approvalData = result.rows[0];

        if (!approvalData.success) {
            return res.status(400).json({
                success: false,
                message: approvalData.message
            });
        }

        // Send approval email
        await sendHostApprovalEmail({
            email: approvalData.user_email,
            full_name: approvalData.user_full_name
        });

        res.status(200).json({
            success: true,
            message: approvalData.message
        });

    } catch (error) {
        console.error("Approve host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// =============================
// REJECT HOST REQUEST (ADMIN)
// =============================
export const rejectHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { rejection_reason } = req.body;
        const admin_id = req.user.id;

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const result = await pool.query(
            `SELECT * FROM sp_reject_host_request($1, $2, $3)`,
            [requestId, admin_id, rejection_reason]
        );

        const rejectionData = result.rows[0];

        if (!rejectionData.success) {
            return res.status(400).json({
                success: false,
                message: rejectionData.message
            });
        }

        // Send rejection email
        await sendHostRejectionEmail({
            email: rejectionData.user_email,
            full_name: rejectionData.user_full_name,
            reason: rejection_reason
        });

        res.status(200).json({
            success: true,
            message: rejectionData.message
        });

    } catch (error) {
        console.error("Reject host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};