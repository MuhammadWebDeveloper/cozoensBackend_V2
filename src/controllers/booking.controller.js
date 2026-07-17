// controllers/booking.controller.js
import { pool } from "../config/db.config.js";
import nodemailer from 'nodemailer';
import { sendBookingNotificationToOwner, sendBookingConfirmationToBuyer, sendBookingCancellationEmail, sendBookingNotificationToAdmin } from '../services/services/bookings.email.service.js';

// ✅ FIX 1: formatDateForDisplay moved to TOP LEVEL (outside any function)
const formatDateForDisplay = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
        return new Date(dateInput).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
};

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Generate unique booking reference
const generateBookingRef = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = 'BK-';
    for (let i = 0; i < 8; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
    return ref;
};

// ============================================
// 1. CREATE BOOKING
// ============================================
// ============================================
// CONTROLLER: createBooking with Stored Procedure
// ============================================

export const createBooking = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { space_unit_id, start_time, end_time, total_price } = req.body;

        console.log('📅 Booking request:', { space_unit_id, start_time, end_time, total_price, user_id });

        // ==========================================
        // 1. BASIC VALIDATION (Frontend/Controller level)
        // ==========================================

        if (!space_unit_id || !start_time || !end_time || !total_price) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time"
            });
        }

        if (parseFloat(total_price) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Total price must be greater than 0"
            });
        }

        // ==========================================
        // 2. CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT create_booking(
                $1::UUID, 
                $2::UUID, 
                $3::TIMESTAMP, 
                $4::TIMESTAMP, 
                $5::DECIMAL
            ) as result`,
            [user_id, space_unit_id, start_time, end_time, total_price]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // 3. HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            // Check if it's a conflict error
            if (response.conflictingBooking) {
                return res.status(409).json({
                    success: false,
                    message: response.message,
                    conflictingBooking: response.conflictingBooking
                });
            }

            // Handle other errors
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // ==========================================
        // 4. SEND EMAILS (Asynchronous)
        // ==========================================

        const booking = response.booking;
        const spaceData = response.space_data;
        const unitData = response.unit_data;
        const buyer = response.buyer;
        const owner = response.owner;

        // Prepare email data
        const emailResults = {
            owner: { success: false },
            buyer: { success: false },
            admin: { success: false }
        };

        // Send email to OWNER
        try {
            await sendBookingNotificationToOwner(
                { ...booking, created_at: booking.created_at },
                buyer,
                unitData,
                spaceData,
                owner
            );
            emailResults.owner.success = true;
            console.log(`✅ Email sent to owner: ${owner.email}`);
        } catch (emailErr) {
            emailResults.owner.error = emailErr.message;
            console.error('❌ Email to owner failed:', emailErr.message);
        }

        // Send email to BUYER
        try {
            await sendBookingConfirmationToBuyer(
                { ...booking, created_at: booking.created_at },
                buyer,
                unitData,
                spaceData
            );
            emailResults.buyer.success = true;
            console.log(`✅ Email sent to buyer: ${buyer.email}`);
        } catch (emailErr) {
            emailResults.buyer.error = emailErr.message;
            console.error('❌ Email to buyer failed:', emailErr.message);
        }

        // Send email to ADMIN
        try {
            await sendBookingNotificationToAdmin(
                { ...booking, created_at: booking.created_at },
                buyer,
                unitData,
                spaceData,
                owner
            );
            emailResults.admin.success = true;
            console.log(`✅ Admin notification email sent to: ${process.env.ADMIN_EMAIL}`);
        } catch (emailErr) {
            emailResults.admin.error = emailErr.message;
            console.error('❌ Admin email failed:', emailErr.message);
        }

        // ==========================================
        // 5. RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: {
                id: booking.id,
                booking_ref: booking.booking_ref,
                status: booking.status,
                start_time: booking.start_time,
                end_time: booking.end_time,
                total_price: booking.total_price,
                created_at: booking.created_at
            },
            emailStatus: emailResults
        });

    } catch (error) {
        console.error("❌ createBooking error:", error);

        // Handle PostgreSQL errors
        if (error.code === '23P01' || error.message?.includes('no_overlap')) {
            return res.status(409).json({
                success: false,
                message: "This time slot is already booked. Please select different dates and times.",
                errorType: "CONFLICT"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 2. GET MY BOOKINGS
// ============================================
// ============================================
// CONTROLLER: getMyBookings with Stored Procedure
// ============================================

export const getMyBookings = async (req, res) => {
    try {
        const user_id = req.user.id;

        console.log('📋 Fetching bookings for user:', user_id);

        // ==========================================
        // CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT get_user_bookings($1::UUID) as result`,
            [user_id]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to fetch bookings',
                error: response.error_code
            });
        }

        // ==========================================
        // OPTIONAL: Additional data transformation
        // if needed for frontend compatibility
        // ==========================================

        // The data is already formatted as needed,
        // but if you need to add any frontend-specific
        // transformations, do it here

        const bookings = response.bookings.map(booking => ({
            ...booking,
            // Ensure numeric fields are proper numbers
            total_price: parseFloat(booking.total_price) || 0,
            unit: {
                ...booking.unit,
                hourly_rate: booking.unit?.hourly_rate ? parseFloat(booking.unit.hourly_rate) : null,
                daily_rate: booking.unit?.daily_rate ? parseFloat(booking.unit.daily_rate) : null,
                monthly_rate: booking.unit?.monthly_rate ? parseFloat(booking.unit.monthly_rate) : null,
                images: booking.unit?.images || []
            }
        }));

        // ==========================================
        // RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            count: response.count || bookings.length,
            bookings: bookings
        });

    } catch (error) {
        console.error("❌ getMyBookings error:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message,
            error: error.message
        });
    }
};
// 3. GET BOOKING BY ID
// ============================================
// ============================================
// CONTROLLER: getBookingById with Stored Procedure
// ============================================

export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;
        const user_role = req.user.role || 'user';

        console.log('📄 Fetching booking details:', { bookingId, user_id, user_role });

        // Validate booking ID
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        // ==========================================
        // CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT get_booking_by_id($1::UUID, $2::UUID, $3::VARCHAR) as result`,
            [bookingId, user_id, user_role]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            // Handle specific error cases
            if (response.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            if (response.message === 'Not authorized to view this booking') {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to view this booking"
                });
            }

            // Handle other errors
            return res.status(400).json({
                success: false,
                message: response.message || 'Failed to fetch booking'
            });
        }

        // ==========================================
        // OPTIONAL: Additional data transformation
        // if needed for frontend compatibility
        // ==========================================

        const booking = response.booking;

        // Ensure numeric fields are proper numbers
        if (booking.total_price) {
            booking.total_price = parseFloat(booking.total_price);
        }

        if (booking.unit) {
            if (booking.unit.hourly_rate) {
                booking.unit.hourly_rate = parseFloat(booking.unit.hourly_rate);
            }
            if (booking.unit.daily_rate) {
                booking.unit.daily_rate = parseFloat(booking.unit.daily_rate);
            }
            if (booking.unit.monthly_rate) {
                booking.unit.monthly_rate = parseFloat(booking.unit.monthly_rate);
            }
        }

        // ==========================================
        // RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            booking: booking
        });

    } catch (error) {
        console.error("❌ getBookingById error:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 4. CANCEL BOOKING (Buyer)
// ============================================
// ============================================
// CONTROLLER: cancelBooking with Stored Procedure
// ============================================

export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;

        console.log(`🔍 User ${user_id} attempting to cancel booking ${bookingId}`);

        // Validate booking ID
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        // ==========================================
        // CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT cancel_booking($1::UUID, $2::UUID) as result`,
            [bookingId, user_id]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            // Handle specific error cases
            if (response.message === 'Booking not found' ||
                response.message === 'You do not have permission to cancel this booking') {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found or you don't have permission to cancel it"
                });
            }

            if (response.message && response.message.includes('Cannot cancel booking with status')) {
                return res.status(400).json({
                    success: false,
                    message: response.message
                });
            }

            if (response.message === 'Cannot cancel a booking that has already started or passed') {
                return res.status(400).json({
                    success: false,
                    message: response.message
                });
            }

            // Handle other errors
            return res.status(400).json({
                success: false,
                message: response.message || 'Failed to cancel booking'
            });
        }

        // ==========================================
        // SEND EMAILS (Asynchronous)
        // ==========================================

        const booking = response.booking;
        const details = response.booking_details;

        // Send cancellation email to OWNER
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: details.owner_email,
                subject: `❌ Booking Cancelled by User - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e53e3e;">Booking Cancelled by User ❌</h2>
                        <p>Dear <strong>${details.owner_name}</strong>,</p>
                        <p>The user has cancelled their booking.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Cancelled Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>User:</strong> ${details.buyer_name} (${details.buyer_email})</p>
                            <p><strong>Unit:</strong> ${details.unit_name}</p>
                            <p><strong>Space:</strong> ${details.space_name}</p>
                            <p><strong>Original Date:</strong> ${formatDateForDisplay(booking.start_time)}</p>
                            <p><strong>Total Amount:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
                        </div>
                        <p>The space is now available for other users to book.</p>
                    </div>
                `,
            });
            console.log(`📧 Cancellation email sent to owner: ${details.owner_email}`);
        } catch (emailErr) {
            console.error('❌ Email to owner failed:', emailErr.message);
        }

        // Send cancellation confirmation to BUYER
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: details.buyer_email,
                subject: `✅ Booking Cancelled Successfully - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #38a169;">Booking Cancelled Successfully ✅</h2>
                        <p>Dear <strong>${details.buyer_name}</strong>,</p>
                        <p>Your booking has been cancelled successfully.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Cancelled Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${details.unit_name}</p>
                            <p><strong>Space:</strong> ${details.space_name}</p>
                            <p><strong>Original Date:</strong> ${formatDateForDisplay(booking.start_time)}</p>
                            <p><strong>Refund Amount:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
                        </div>
                        <p><strong>Refund will be processed within 5-7 business days.</strong></p>
                        <p>You can book another space anytime.</p>
                    </div>
                `,
            });
            console.log(`📧 Cancellation confirmation email sent to buyer: ${details.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Email to buyer failed:', emailErr.message);
        }

        // ==========================================
        // RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking: booking
        });

    } catch (error) {
        console.error("❌ cancelBooking error:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};
// ============================================
// 5. GET OWNER BOOKINGS
// ============================================
// ============================================
// CONTROLLER: getOwnerBookings with Stored Procedure
// ============================================

export const getOwnerBookings = async (req, res) => {
    try {
        const owner_id = req.user.id;

        console.log('📋 Fetching owner bookings for user:', owner_id);

        // ==========================================
        // CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT get_owner_bookings($1::UUID) as result`,
            [owner_id]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to fetch owner bookings',
                error: response.error_code
            });
        }

        // ==========================================
        // OPTIONAL: Additional data transformation
        // if needed for frontend compatibility
        // ==========================================

        const bookings = response.bookings.map(booking => ({
            ...booking,
            total_price: parseFloat(booking.total_price) || 0,
            buyer: booking.buyer,
            unit: {
                ...booking.unit,
                hourly_rate: booking.unit?.hourly_rate ? parseFloat(booking.unit.hourly_rate) : null,
                daily_rate: booking.unit?.daily_rate ? parseFloat(booking.unit.daily_rate) : null,
                monthly_rate: booking.unit?.monthly_rate ? parseFloat(booking.unit.monthly_rate) : null
            },
            space: booking.space,
            disputes: booking.disputes || []
        }));

        // ==========================================
        // RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            count: response.count || bookings.length,
            bookings: bookings
        });

    } catch (error) {
        console.error("❌ getOwnerBookings error:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 6. CONFIRM BOOKING (Owner)
// ============================================
// ============================================
// CONTROLLER: confirmBooking with Stored Procedure
// ============================================

export const confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        console.log(`✅ Owner ${owner_id} attempting to confirm booking ${bookingId}`);

        // Validate booking ID
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        // ==========================================
        // CALL STORED PROCEDURE
        // ==========================================

        const result = await pool.query(
            `SELECT confirm_booking($1::UUID, $2::UUID) as result`,
            [bookingId, owner_id]
        );

        // Parse the JSON result
        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // ==========================================
        // HANDLE RESPONSE
        // ==========================================

        if (!response.success) {
            // Handle specific error cases
            if (response.message === 'Booking not found, already processed, or not pending') {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found, already processed, or not pending"
                });
            }

            // Handle other errors
            return res.status(400).json({
                success: false,
                message: response.message || 'Failed to confirm booking'
            });
        }

        // ==========================================
        // SEND CONFIRMATION EMAIL TO BUYER
        // ==========================================

        const booking = response.booking;
        const details = response.booking_details;

        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: details.buyer_email,
                subject: `🎉 Booking Confirmed - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #38a169;">Booking Confirmed! 🎉</h2>
                        <p>Dear <strong>${details.buyer_name}</strong>,</p>
                        <p>Great news! Your booking has been <strong style="color: #38a169;">CONFIRMED</strong> by the space owner.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #011CCD;">Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${details.unit_name}</p>
                            <p><strong>Space:</strong> ${details.space_name}</p>
                            <p><strong>From:</strong> ${formatDateForDisplay(booking.start_time)}</p>
                            <p><strong>To:</strong> ${formatDateForDisplay(booking.end_time)}</p>
                            <p><strong>Total Price:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
                        </div>
                        <p>Thank you for choosing CoZones! Enjoy your booking.</p>
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #6b7280;">
                            If you have any questions, please contact the space owner directly through the CoZones platform.
                        </p>
                    </div>
                `,
            });
            console.log(`📧 Confirmation email sent to buyer: ${details.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Confirmation email failed:', emailErr.message);
        }

        // ==========================================
        // RETURN SUCCESS RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Booking confirmed successfully",
            booking: booking
        });

    } catch (error) {
        console.error("❌ confirmBooking error:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};
// ============================================
// UPDATED CONTROLLERS USING STORED PROCEDURES
// ============================================

// import { pool } from '../config/database.js';
// import { transporter } from '../config/email.js';
// import { formatDateForDisplay } from '../utils/dateUtils.js';

// // ============================================
// // 7. REJECT BOOKING (Owner)
// // ============================================
export const rejectBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        console.log(`📌 Owner ${owner_id} rejecting booking ${bookingId}`);

        // Validate booking ID
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT reject_booking($1::UUID, $2::UUID) as result`,
            [bookingId, owner_id]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Booking not found, already processed, or not pending') {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found, already processed, or not pending"
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // Send email notification
        const booking = response.booking;
        const details = response.booking_details;

        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: details.buyer_email,
                subject: `❌ Booking Rejected - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e53e3e;">Booking Rejected ❌</h2>
                        <p>Dear <strong>${details.buyer_name}</strong>,</p>
                        <p>We regret to inform you that your booking request has been <strong style="color: #e53e3e;">REJECTED</strong> by the space owner.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${details.unit_name}</p>
                            <p><strong>Space:</strong> ${details.space_name}</p>
                            <p><strong>Requested Date:</strong> ${formatDateForDisplay(booking.start_time)}</p>
                        </div>
                        <p>Don't worry! You can explore other available spaces and book them.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://cozones.netlify.app" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Browse Spaces
                            </a>
                        </div>
                    </div>
                `,
            });
            console.log(`📧 Rejection email sent to buyer: ${details.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Rejection email failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking rejected successfully",
            booking: booking
        });
    } catch (error) {
        console.error("❌ rejectBooking error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 8. OWNER CANCEL BOOKING
// ============================================
export const ownerCancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;
        const { reason } = req.body;

        console.log('Cancel request:', { bookingId, owner_id, reason });

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Reason for cancellation is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT owner_cancel_booking($1::UUID, $2::UUID, $3::TEXT) as result`,
            [bookingId, owner_id, reason]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Booking not found, already processed, cannot be cancelled, or is in the past') {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found, already processed, cannot be cancelled, or is in the past"
                });
            }
            if (response.message === 'Reason for cancellation is required') {
                return res.status(400).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // Send email notification
        const booking = response.booking;
        const details = response.booking_details;

        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: details.buyer_email,
                subject: `⚠️ Booking Cancelled by Owner - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e53e3e;">Booking Cancelled ❌</h2>
                        <p>Dear <strong>${details.buyer_name}</strong>,</p>
                        <p>We regret to inform you that the space owner has cancelled your booking.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${details.unit_name}</p>
                            <p><strong>Space:</strong> ${details.space_name}</p>
                            <p><strong>Date:</strong> ${formatDateForDisplay(booking.start_time)}</p>
                        </div>
                        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Reason for cancellation:</strong></p>
                            <p>${reason}</p>
                        </div>
                        <p>Your payment will be refunded as per our refund policy.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://cozones.netlify.app/my-bookings" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View My Bookings
                            </a>
                        </div>
                    </div>
                `,
            });
            console.log(`📧 Cancellation email sent to buyer: ${details.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Cancellation email failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully. Customer has been notified.",
            booking: booking
        });
    } catch (error) {
        console.error("❌ ownerCancelBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 9. ADMIN GET ALL BOOKINGS
// ============================================
export const adminGetAllBookings = async (req, res) => {
    try {
        const { status, from_date, to_date, space_id, user_id } = req.query;

        console.log('📊 Admin fetching all bookings with filters:', { status, from_date, to_date, space_id, user_id });

        // Call stored procedure
        const result = await pool.query(
            `SELECT admin_get_all_bookings(
                $1::VARCHAR, 
                $2::TIMESTAMP, 
                $3::TIMESTAMP, 
                $4::UUID, 
                $5::UUID
            ) as result`,
            [status || null, from_date || null, to_date || null, space_id || null, user_id || null]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to fetch bookings'
            });
        }

        return res.status(200).json({
            success: true,
            stats: response.stats,
            count: response.count,
            bookings: response.bookings || []
        });
    } catch (error) {
        console.error("❌ adminGetAllBookings error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 10. DELETE BOOKING (Owner)
// ============================================
export const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        console.log(`🗑️ Owner ${owner_id} deleting booking ${bookingId}`);

        // Validate booking ID
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT delete_booking($1::UUID, $2::UUID) as result`,
            [bookingId, owner_id]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Booking not found or you don\'t have permission to delete it') {
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

        console.log(`✅ Booking ${response.deletedBooking.booking_ref} deleted by owner ${owner_id}`);

        return res.status(200).json({
            success: true,
            message: "Booking deleted successfully",
            deletedBooking: response.deletedBooking
        });
    } catch (error) {
        console.error("❌ deleteBooking error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 11. DELETE ALL BOOKINGS
// ============================================
export const deleteAllBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { force } = req.query;

        console.log(`🗑️ Delete all bookings request for user: ${userId}, force: ${force}`);

        // Call stored procedure
        const result = await pool.query(
            `SELECT delete_all_bookings($1::UUID, $2::BOOLEAN) as result`,
            [userId, force === 'true']
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.activeCount) {
                return res.status(400).json({
                    success: false,
                    message: response.message,
                    activeCount: response.activeCount,
                    activeBookings: response.activeBookings
                });
            }
            if (response.message === 'No bookings found to delete') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to delete bookings'
            });
        }

        console.log(`✅ Deleted ${response.deletedCount} bookings for user ${userId}`);

        return res.status(200).json({
            success: true,
            message: response.message,
            deletedCount: response.deletedCount,
            activeCancelled: response.activeCancelled || 0,
            deletedBookings: response.deletedBookings || []
        });
    } catch (error) {
        console.error('❌ Error in deleteAllBookings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete bookings',
            error: error.message
        });
    }
};

// ============================================
// 12. CREATE DISPUTE
// ============================================
export const createDispute = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;
        const { reason, description } = req.body;

        console.log(`⚠️ Creating dispute for booking ${bookingId} by user ${user_id}`);

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Reason is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT create_dispute($1::UUID, $2::UUID, $3::TEXT, $4::TEXT) as result`,
            [bookingId, user_id, reason, description || null]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            if (response.message === 'Not authorized to raise dispute for this booking') {
                return res.status(403).json({
                    success: false,
                    message: response.message
                });
            }
            if (response.message === 'A dispute already exists for this booking') {
                return res.status(400).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // Send admin notifications
        try {
            const admins = await pool.query(`SELECT email FROM users WHERE role = 'admin'`);
            for (const admin of admins.rows) {
                await transporter.sendMail({
                    from: `"CoZones" <${process.env.EMAIL_USER}>`,
                    to: admin.email,
                    subject: `⚠️ New Dispute Raised - Booking ${bookingId}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>New Dispute Raised ⚠️</h2>
                            <p>A new dispute has been raised for booking: <strong>${bookingId}</strong></p>
                            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>Reason:</strong> ${reason}</p>
                                <p><strong>Description:</strong> ${description || 'No additional details provided'}</p>
                            </div>
                            <p>Please login to resolve this dispute.</p>
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="https://cozones.netlify.app/admin/disputes" 
                                   style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    View Disputes
                                </a>
                            </div>
                        </div>
                    `
                });
            }
            console.log(`📧 Dispute notification sent to admins`);
        } catch (emailErr) {
            console.error("❌ Email to admin failed:", emailErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Dispute raised successfully",
            dispute: response.dispute
        });
    } catch (error) {
        console.error("❌ createDispute error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 13. GET ALL DISPUTES (Admin)
// ============================================
export const getAllDisputes = async (req, res) => {
    try {
        const { status } = req.query;

        console.log('📊 Admin fetching all disputes with status filter:', status);

        // Call stored procedure
        const result = await pool.query(
            `SELECT admin_get_all_disputes($1::VARCHAR) as result`,
            [status || null]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to fetch disputes'
            });
        }

        return res.status(200).json({
            success: true,
            count: response.count || 0,
            disputes: response.disputes || []
        });
    } catch (error) {
        console.error("❌ getAllDisputes error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 14. RESOLVE DISPUTE (Admin)
// ============================================
export const resolveDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const admin_id = req.user.id;
        const { resolution, decision } = req.body;

        console.log(`✅ Admin ${admin_id} resolving dispute ${disputeId}`);

        if (!resolution || !decision) {
            return res.status(400).json({
                success: false,
                message: "Resolution and decision are required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT resolve_dispute($1::UUID, $2::UUID, $3::TEXT, $4::TEXT) as result`,
            [disputeId, admin_id, resolution, decision]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Dispute not found or already resolved') {
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

        // Send email to both parties
        try {
            const parties = await pool.query(
                `SELECT DISTINCT u.email, u.full_name
                 FROM bookings b
                 JOIN users u ON u.id IN (b.user_id, (SELECT owner_id FROM spaces WHERE id = (SELECT space_id FROM space_units WHERE id = b.space_unit_id)))
                 WHERE b.id = $1`,
                [response.dispute.booking_id]
            );

            for (const party of parties.rows) {
                await transporter.sendMail({
                    from: `"CoZones" <${process.env.EMAIL_USER}>`,
                    to: party.email,
                    subject: `📋 Dispute Resolved - Booking ${response.booking.booking_ref}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #38a169;">Dispute Resolved ✅</h2>
                            <p>Dear <strong>${party.full_name}</strong>,</p>
                            <p>The dispute for booking <strong>${response.booking.booking_ref}</strong> has been resolved.</p>
                            <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <p><strong>Admin Decision:</strong> ${decision}</p>
                                <p><strong>Resolution:</strong> ${resolution}</p>
                            </div>
                            <p>Thank you for your patience.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://cozones.netlify.app/my-bookings" 
                                   style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    View Your Bookings
                                </a>
                            </div>
                        </div>
                    `
                });
            }
            console.log(`📧 Resolution emails sent to all parties`);
        } catch (emailErr) {
            console.error('❌ Resolution emails failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Dispute resolved successfully",
            dispute: response.dispute,
            decision: response.decision
        });
    } catch (error) {
        console.error("❌ resolveDispute error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 15. GET DISPUTE BY ID (Admin)
// ============================================
export const getDisputeById = async (req, res) => {
    try {
        const { disputeId } = req.params;

        console.log(`📋 Fetching dispute details: ${disputeId}`);

        // Validate dispute ID
        if (!disputeId) {
            return res.status(400).json({
                success: false,
                message: "Dispute ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_dispute_by_id($1::UUID) as result`,
            [disputeId]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Dispute not found') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(500).json({
                success: false,
                message: response.message || 'Failed to fetch dispute'
            });
        }

        return res.status(200).json({
            success: true,
            dispute: response.dispute
        });
    } catch (error) {
        console.error("❌ getDisputeById error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 16. DELETE DISPUTE (Admin)
// ============================================
export const deleteDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const admin_id = req.user.id;

        console.log(`🗑️ Admin ${admin_id} deleting dispute ${disputeId}`);

        // Validate dispute ID
        if (!disputeId) {
            return res.status(400).json({
                success: false,
                message: "Dispute ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT delete_dispute($1::UUID, $2::UUID) as result`,
            [disputeId, admin_id]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Dispute not found') {
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

        console.log(`🗑️ Dispute ${disputeId} deleted by admin ${admin_id} for booking ${response.deletedDispute.booking_ref}`);

        // Send admin notification
        try {
            const adminUser = await pool.query(
                `SELECT email, full_name FROM users WHERE id = $1`,
                [admin_id]
            );

            if (adminUser.rows.length > 0) {
                await transporter.sendMail({
                    from: `"CoZones Admin" <${process.env.EMAIL_USER}>`,
                    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                    subject: `🗑️ Dispute Deleted - Booking ${response.deletedDispute.booking_ref}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2 style="color: #e53e3e;">Dispute Deleted</h2>
                            <p>A dispute has been deleted by <strong>${adminUser.rows[0].full_name}</strong> (${adminUser.rows[0].email})</p>
                            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>Dispute ID:</strong> ${disputeId}</p>
                                <p><strong>Booking Ref:</strong> ${response.deletedDispute.booking_ref}</p>
                                <p><strong>Reason:</strong> ${response.deletedDispute.reason}</p>
                                <p><strong>Status:</strong> ${response.deletedDispute.status}</p>
                                <p><strong>Deleted At:</strong> ${new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.error('❌ Admin deletion email failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Dispute deleted successfully",
            deletedDispute: response.deletedDispute
        });
    } catch (error) {
        console.error("❌ deleteDispute error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// 17. REJECT DISPUTE (Admin)
// ============================================
export const rejectDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const admin_id = req.user.id;
        const { rejection_reason } = req.body;

        console.log(`❌ Admin ${admin_id} rejecting dispute ${disputeId}`);

        if (!rejection_reason || rejection_reason.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT reject_dispute($1::UUID, $2::UUID, $3::TEXT) as result`,
            [disputeId, admin_id, rejection_reason]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        // Handle response
        if (!response.success) {
            if (response.message === 'Dispute not found or already resolved') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            if (response.message === 'Rejection reason is required') {
                return res.status(400).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(400).json({
                success: false,
                message: response.message
            });
        }

        // Get admin details
        const adminDetails = await pool.query(
            `SELECT full_name FROM users WHERE id = $1`,
            [admin_id]
        );
        const adminName = adminDetails.rows[0]?.full_name || 'Admin';

        // Send rejection emails to all parties
        try {
            const parties = await pool.query(
                `SELECT DISTINCT u.email, u.full_name, u.id
                 FROM bookings b
                 JOIN users u ON u.id IN (b.user_id, (SELECT owner_id FROM spaces WHERE id = (SELECT space_id FROM space_units WHERE id = b.space_unit_id)))
                 WHERE b.id = $1`,
                [response.booking_details.booking_id]
            );

            for (const party of parties.rows) {
                const isBuyer = party.id === response.booking_details.buyer_id;
                const role = isBuyer ? 'Customer' : 'Space Owner';

                await transporter.sendMail({
                    from: `"CoZones Admin" <${process.env.EMAIL_USER}>`,
                    to: party.email,
                    subject: `❌ Dispute Rejected - Booking ${response.booking_details.booking_ref}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                            <h2 style="color: #e53e3e;">❌ Dispute Rejected</h2>
                            <p>Dear <strong>${party.full_name}</strong>,</p>
                            <p>The dispute for booking <strong>${response.booking_details.booking_ref}</strong> has been <strong style="color: #e53e3e;">REJECTED</strong> by admin <strong>${adminName}</strong>.</p>
                            
                            <div style="background: #fee2e2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e53e3e;">
                                <h3 style="color: #991b1b;">Rejection Reason:</h3>
                                <p style="background: white; padding: 10px; border-radius: 6px; margin-top: 10px;">
                                    ${rejection_reason}
                                </p>
                            </div>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://cozones.netlify.app/my-bookings" 
                                   style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    View Your Bookings
                                </a>
                            </div>

                            <p style="color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                                If you have any questions, please contact our support team.
                            </p>
                        </div>
                    `
                });
                console.log(`📧 Rejection email sent to ${role}: ${party.email}`);
            }
        } catch (emailErr) {
            console.error('❌ Rejection emails failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Dispute rejected successfully",
            dispute: response.dispute
        });
    } catch (error) {
        console.error("❌ rejectDispute error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

