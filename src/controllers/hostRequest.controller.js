import { pool } from "../config/db.config.js";
import { sendHostApprovalEmail, sendHostRejectionEmail } from "../services/email.service.js";

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

        const result = await pool.query(
            `INSERT INTO host_requests (
                user_id, cnic_number, cnic_front_image, cnic_back_image, 
                phone_number, additional_info, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW()) 
            RETURNING id`,
            [user_id, cnic_number, cnic_front_image, cnic_back_image, phone_number, additional_info || null]
        );

        res.status(201).json({
            success: true,
            message: "Host request submitted successfully",
            request_id: result.rows[0].id
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
// export const getPendingHostRequests = async (req, res) => {
//     try {
//         if (req.user.role !== 'admin') {
//             return res.status(403).json({
//                 success: false,
//                 message: "Access denied. Admin only."
//             });
//         }

//         const result = await pool.query(
//             `SELECT 
//                 hr.id, hr.cnic_number, hr.phone_number, hr.additional_info,
//                 hr.status, hr.created_at,
//                 u.id as user_id, u.email as user_email,
//                 u.full_name as user_name
//              FROM host_requests hr
//              JOIN users u ON hr.user_id = u.id
//              WHERE hr.status = 'pending'
//              ORDER BY hr.created_at ASC`
//         );

//         res.status(200).json({
//             success: true,
//             count: result.rows.length,
//             requests: result.rows
//         });

//     } catch (error) {
//         console.error("Get pending requests error:", error);
//         res.status(500).json({
//             success: false,
//             message: "Server error"
//         });
//     }
// };
export const getPendingHostRequests = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const result = await pool.query(
            `SELECT 
                hr.id, 
                hr.cnic_number, 
                hr.phone_number, 
                hr.additional_info,
                hr.status, 
                hr.created_at,
                hr.cnic_front_image,
                hr.cnic_back_image,
                u.id as user_id, 
                u.email as user_email,
                u.full_name as user_name
             FROM host_requests hr
             JOIN users u ON hr.user_id = u.id
             WHERE hr.status = 'pending'
             ORDER BY hr.created_at ASC`
        );

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
// export const approveHostRequest = async (req, res) => {
//     try {
//         const { requestId } = req.params;
//         const { admin_notes } = req.body;
//         const admin_id = req.user.id;

//         // Check if user is admin
//         if (req.user.role !== 'admin') {
//             return res.status(403).json({
//                 success: false,
//                 message: "Access denied. Admin only."
//             });
//         }

//         // Start a transaction to ensure both updates happen or none
//         await pool.query('BEGIN');

//         try {
//             // First, update the host request status
//             const requestResult = await pool.query(
//                 `UPDATE host_requests 
//                  SET status = 'approved',
//                      admin_notes = COALESCE($1, admin_notes),
//                      reviewed_at = NOW(),
//                      reviewed_by = $2,
//                      updated_at = NOW()
//                  WHERE id = $3 AND status = 'pending'
//                  RETURNING id, user_id`,
//                 [admin_notes, admin_id, requestId]
//             );

//             if (requestResult.rows.length === 0) {
//                 await pool.query('ROLLBACK');
//                 return res.status(404).json({
//                     success: false,
//                     message: "Host request not found or already processed"
//                 });
//             }

//             const { user_id } = requestResult.rows[0];

//             // Update the user's role to 'owner' or 'host'
//             const userUpdateResult = await pool.query(
//                 `UPDATE users 
//                  SET role = 'owner',
//                      updated_at = NOW()
//                  WHERE id = $1 AND role != 'admin'
//                  RETURNING id, role, email, name`,
//                 [user_id]
//             );

//             if (userUpdateResult.rows.length === 0) {
//                 await pool.query('ROLLBACK');
//                 return res.status(404).json({
//                     success: false,
//                     message: "User not found or cannot update admin role"
//                 });
//             }

//             // Commit the transaction
//             await pool.query('COMMIT');

//             // Send email notification (optional)
//             const user = userUpdateResult.rows[0];

//             res.status(200).json({
//                 success: true,
//                 message: "Host request approved successfully. User role updated to owner.",
//                 data: {
//                     request_id: requestId,
//                     user: {
//                         id: user.id,
//                         email: user.email,
//                         name: user.name,
//                         role: user.role
//                     }
//                 }
//             });

//         } catch (error) {
//             await pool.query('ROLLBACK');
//             throw error;
//         }

//     } catch (error) {
//         console.error("Approve host request error:", error);
//         res.status(500).json({
//             success: false,
//             message: "Server error: " + error.message
//         });
//     }
// };
// // =============================



export const approveHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        // ✅ FIX: Safely extract admin_notes with null check
        const admin_notes = req.body && req.body.admin_notes ? req.body.admin_notes : null;
        const admin_id = req.user.id;

        console.log('Approve request - Body:', req.body); // Debug log
        console.log('Admin notes:', admin_notes); // Debug log

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Start a transaction
        await pool.query('BEGIN');

        try {
            const requestResult = await pool.query(
                `UPDATE host_requests 
                 SET status = 'approved',
                     admin_notes = COALESCE($1, admin_notes),
                     reviewed_at = NOW(),
                     reviewed_by = $2,
                     updated_at = NOW()
                 WHERE id = $3 AND status = 'pending'
                 RETURNING id, user_id`,
                [admin_notes, admin_id, requestId]
            );

            if (requestResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: "Host request not found or already processed"
                });
            }

            const { user_id } = requestResult.rows[0];

            // ✅ FIX: Use full_name instead of name
            const userUpdateResult = await pool.query(
                `UPDATE users 
                 SET role = 'owner',
                     updated_at = NOW()
                 WHERE id = $1 AND role != 'admin'
                 RETURNING id, role, email, full_name as name`,
                [user_id]
            );

            if (userUpdateResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: "User not found or cannot update admin role"
                });
            }

            await pool.query('COMMIT');

            const user = userUpdateResult.rows[0];

            res.status(200).json({
                success: true,
                message: "Host request approved successfully. User role updated to owner.",
                data: {
                    request_id: requestId,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            });

        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error("Approve host request error:", error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};
// REJECT HOST REQUEST (ADMIN)
// =============================
// export const rejectHostRequest = async (req, res) => {
//     try {
//         const { requestId } = req.params;
//         const { rejection_reason } = req.body;
//         const admin_id = req.user.id;

//         if (req.user.role !== 'admin') {
//             return res.status(403).json({
//                 success: false,
//                 message: "Access denied. Admin only."
//             });
//         }

//         if (!rejection_reason) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Rejection reason is required"
//             });
//         }

//         const result = await pool.query(
//             `UPDATE host_requests 
//              SET status = 'rejected',
//                  admin_notes = $1,
//                  reviewed_at = NOW(),
//                  reviewed_by = $2,
//                  updated_at = NOW()
//              WHERE id = $3 AND status = 'pending'
//              RETURNING id`,
//             [rejection_reason, admin_id, requestId]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Host request not found or already processed"
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Host request rejected successfully"
//         });

//     } catch (error) {
//         console.error("Reject host request error:", error);
//         res.status(500).json({
//             success: false,
//             message: "Server error"
//         });
//     }
// };
// export const rejectHostRequest = async (req, res) => {
//     try {
//         const { requestId } = req.params;
//         // Handle case where body is empty or undefined
//         const rejection_reason = req.body?.rejection_reason || "No reason provided";
//         const admin_id = req.user.id;

//         if (req.user.role !== 'admin') {
//             return res.status(403).json({
//                 success: false,
//                 message: "Access denied. Admin only."
//             });
//         }

//         const result = await pool.query(
//             `UPDATE host_requests 
//              SET status = 'rejected',
//                  admin_notes = $1,
//                  reviewed_at = NOW(),
//                  reviewed_by = $2,
//                  updated_at = NOW()
//              WHERE id = $3 AND status = 'pending'
//              RETURNING id`,
//             [rejection_reason, admin_id, requestId]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Host request not found or already processed"
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Host request rejected successfully"
//         });

//     } catch (error) {
//         console.error("Reject host request error:", error);
//         res.status(500).json({
//             success: false,
//             message: "Server error: " + error.message
//         });
//     }
// };

export const rejectHostRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        // ✅ FIX: Safely extract rejection_reason
        const rejection_reason = req.body && req.body.rejection_reason ? req.body.rejection_reason : "No reason provided";
        const admin_id = req.user.id;

        console.log('Reject request - Body:', req.body); // Debug log
        console.log('Rejection reason:', rejection_reason); // Debug log

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const result = await pool.query(
            `UPDATE host_requests 
             SET status = 'rejected',
                 admin_notes = $1,
                 reviewed_at = NOW(),
                 reviewed_by = $2,
                 updated_at = NOW()
             WHERE id = $3 AND status = 'pending'
             RETURNING id`,
            [rejection_reason, admin_id, requestId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Host request not found or already processed"
            });
        }

        res.status(200).json({
            success: true,
            message: "Host request rejected successfully"
        });

    } catch (error) {
        console.error("Reject host request error:", error);
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

        let query;
        let params;

        if (!requestId) {
            query = `
                SELECT 
                    hr.id, hr.cnic_number, hr.phone_number, hr.additional_info,
                    hr.status, COALESCE(hr.admin_notes, '') as admin_comment,
                    hr.created_at, hr.updated_at,
                    u.email as user_email,
                    u.full_name as user_name
                FROM host_requests hr
                JOIN users u ON hr.user_id = u.id
                WHERE hr.user_id = $1
                ORDER BY hr.created_at DESC
                LIMIT 1
            `;
            params = [user_id];
        } else {
            query = `
                SELECT 
                    hr.id, hr.cnic_number, hr.phone_number, hr.additional_info,
                    hr.status, COALESCE(hr.admin_notes, '') as admin_comment,
                    hr.created_at, hr.updated_at,
                    u.email as user_email,
                    u.full_name as user_name
                FROM host_requests hr
                JOIN users u ON hr.user_id = u.id
                WHERE hr.id = $1 AND hr.user_id = $2
            `;
            params = [requestId, user_id];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Host request not found"
            });
        }

        const request = result.rows[0];
        const statusDescriptions = {
            'pending': 'Your request is being reviewed by admin',
            'approved': 'Congratulations! Your host request has been approved',
            'rejected': 'Your host request has been rejected'
        };

        res.status(200).json({
            success: true,
            request: {
                ...request,
                status_description: statusDescriptions[request.status] || 'Status unknown'
            }
        });

    } catch (error) {
        console.error("Get host request status error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// =============================
// GET ALL REQUESTS FOR LOGGED-IN USER
// =============================
export const getMyHostRequests = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT 
                id, cnic_number, phone_number, additional_info,
                status, COALESCE(admin_notes, '') as admin_comment,
                created_at, updated_at
             FROM host_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [user_id]
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            requests: result.rows
        });

    } catch (error) {
        console.error("Get my host requests error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }


};

// =============================
// CHECK IF USER CAN SUBMIT REQUEST
// =============================
export const canSubmitHostRequest = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Get the latest request for this user
        const result = await pool.query(
            `SELECT id, status, created_at 
             FROM host_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [user_id]
        );

        // No existing request
        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                canSubmit: true,
                message: "No existing request found. You can submit a new request."
            });
        }

        const latestRequest = result.rows[0];

        // Check status of existing request
        switch (latestRequest.status) {
            case 'pending':
                return res.status(200).json({
                    success: true,
                    canSubmit: false,
                    message: "You already have a pending request. Please wait for admin review.",
                    redirectTo: `/host-requests/status/${latestRequest.id}`,
                    status: 'pending',
                    requestId: latestRequest.id
                });

            case 'approved':
                return res.status(200).json({
                    success: true,
                    canSubmit: false,
                    message: "Your host request has already been approved! You are now a host.",
                    redirectTo: '/seller-dashboard',
                    status: 'approved',
                    requestId: latestRequest.id
                });

            case 'rejected':
                // Allow resubmission but with warning
                return res.status(200).json({
                    success: true,
                    canSubmit: true,
                    message: "Your previous request was rejected. You can submit a new request.",
                    warning: true,
                    previousRequestId: latestRequest.id,
                    previousRejectionDate: latestRequest.created_at,
                    status: 'rejected'
                });

            default:
                return res.status(200).json({
                    success: true,
                    canSubmit: true,
                    message: "You can submit a new request."
                });
        }

    } catch (error) {
        console.error("Error checking submission eligibility:", error);
        res.status(500).json({
            success: false,
            canSubmit: false,
            message: "Server error. Please try again later."
        });
    }
};