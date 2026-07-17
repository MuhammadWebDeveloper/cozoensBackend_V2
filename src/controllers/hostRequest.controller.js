// backend/controllers/host.controller.js
import { pool } from "../config/db.config.js";
import {
    sendHostApprovalEmail,
    sendHostRejectionEmail,
    sendAdminHostRequestNotification
} from "../services/email.service.js";

// =============================
// SUBMIT HOST REQUEST
// =============================
export const submitHostRequest = async (req, res) => {
    try {
        const { cnic_number, cnic_front_image, cnic_back_image, phone_number, additional_info } = req.body;
        const user_id = req.user.id;

        if (!cnic_number || !cnic_front_image || !cnic_back_image || !phone_number) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT submit_host_request(
                $1::UUID, 
                $2::VARCHAR, 
                $3::TEXT, 
                $4::TEXT, 
                $5::VARCHAR, 
                $6::TEXT
            ) as result`,
            [user_id, cnic_number, cnic_front_image, cnic_back_image, phone_number, additional_info || null]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // ✅ SEND ADMIN NOTIFICATION
        console.log('📧 Sending admin notification for request:', response.request_id);
        await sendAdminHostRequestNotification({
            user_name: response.user.full_name,
            user_email: response.user.email,
            phone_number: phone_number,
            cnic_number: cnic_number,
            additional_info: additional_info || 'N/A',
            request_id: response.request_id,
            submitted_at: response.submitted_at
        });

        res.status(201).json({
            success: true,
            message: "Host request submitted successfully",
            request_id: response.request_id
        });

    } catch (error) {
        console.error("❌ Submit host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// GET PENDING HOST REQUESTS
// =============================
export const getPendingHostRequests = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_pending_host_requests() as result`
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        res.status(200).json({
            success: true,
            count: response.count || 0,
            requests: response.requests || []
        });

    } catch (error) {
        console.error("❌ Get pending requests error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// APPROVE HOST REQUEST
// =============================
export const approveHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const admin_notes = req.body?.admin_notes || null;
        const admin_id = req.user.id;

        console.log('✅ Approve request:', { requestId, admin_notes, admin_id });

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT approve_host_request($1::UUID, $2::UUID, $3::TEXT) as result`,
            [requestId, admin_id, admin_notes]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            if (response.message === 'Host request not found or already processed') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // ✅ SEND APPROVAL EMAIL
        console.log('📧 Sending approval email to:', response.data.user.email);
        await sendHostApprovalEmail({
            email: response.data.user.email,
            full_name: response.data.user.name
        });

        res.status(200).json({
            success: true,
            message: "Host request approved successfully. User role updated to owner.",
            data: response.data
        });

    } catch (error) {
        console.error("❌ Approve host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// REJECT HOST REQUEST
// =============================
export const rejectHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const rejection_reason = req.body?.rejection_reason || "No reason provided";
        const admin_id = req.user.id;

        console.log('❌ Reject request:', { requestId, rejection_reason, admin_id });

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT reject_host_request($1::UUID, $2::UUID, $3::TEXT) as result`,
            [requestId, admin_id, rejection_reason]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            if (response.message === 'Host request not found or already processed') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // ✅ SEND REJECTION EMAIL
        console.log('📧 Sending rejection email to:', response.data.user.email);
        await sendHostRejectionEmail({
            email: response.data.user.email,
            full_name: response.data.user.name,
            reason: rejection_reason
        });

        res.status(200).json({
            success: true,
            message: "Host request rejected successfully",
            data: response.data
        });

    } catch (error) {
        console.error("❌ Reject host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// GET STATUS OF SPECIFIC REQUEST (USER)
// =============================
export const getHostRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const user_id = req.user.id;

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_host_request_status($1::UUID, $2::UUID) as result`,
            [user_id, requestId || null]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            if (response.message === 'Host request not found') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        res.status(200).json({
            success: true,
            request: response.request
        });

    } catch (error) {
        console.error("❌ Get host request status error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// GET ALL REQUESTS FOR LOGGED-IN USER
// =============================
export const getMyHostRequests = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_my_host_requests($1::UUID) as result`,
            [user_id]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        res.status(200).json({
            success: true,
            count: response.count || 0,
            requests: response.requests || []
        });

    } catch (error) {
        console.error("❌ Get my host requests error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// =============================
// CHECK IF USER CAN SUBMIT REQUEST
// =============================
export const canSubmitHostRequest = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Call stored procedure
        const result = await pool.query(
            `SELECT can_submit_host_request($1::UUID) as result`,
            [user_id]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(500).json({
                success: false,
                canSubmit: false,
                message: response.message
            });
        }

        return res.status(200).json({
            success: true,
            canSubmit: response.canSubmit,
            message: response.message,
            ...(response.redirectTo && { redirectTo: response.redirectTo }),
            ...(response.status && { status: response.status }),
            ...(response.requestId && { requestId: response.requestId }),
            ...(response.warning && { warning: response.warning }),
            ...(response.previousRequestId && { previousRequestId: response.previousRequestId }),
            ...(response.previousRejectionDate && { previousRejectionDate: response.previousRejectionDate })
        });

    } catch (error) {
        console.error("❌ Error checking submission eligibility:", error);
        res.status(500).json({
            success: false,
            canSubmit: false,
            message: "Server error. Please try again later."
        });
    }
};