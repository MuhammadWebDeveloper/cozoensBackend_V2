// controllers/booking.controller.js
import { pool } from "../config/db.config.js";
import nodemailer from 'nodemailer';
import { sendBookingNotificationToOwner, sendBookingConfirmationToBuyer, sendBookingCancellationEmail, sendBookingNotificationToAdmin } from '../services/services/bookings.email.service.js';

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
// CREATE BOOKING (UPDATED with Email Service)
// ============================================
export const createBooking = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { space_unit_id, start_time, end_time, total_price } = req.body;

        console.log('📅 Booking request:', { space_unit_id, start_time, end_time, total_price, user_id });

        // Validation
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

        // Get unit and space details
        const unitDetails = await pool.query(
            `SELECT u.*, s.id as space_id, s.name as space_name, s.owner_id, 
                    s.address, s.city, s.area
             FROM space_units u
             JOIN spaces s ON s.id = u.space_id
             WHERE u.id = $1 AND u.is_active = true`,
            [space_unit_id]
        );

        if (unitDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Unit not found or inactive"
            });
        }

        const unit = unitDetails.rows[0];

        // Check if user is trying to book their own space
        if (user_id === unit.owner_id) {
            return res.status(400).json({
                success: false,
                message: "You cannot book your own space"
            });
        }

        // Check for overlapping bookings (excluding cancelled ones)
        const overlapCheck = await pool.query(
            `SELECT id, start_time, end_time, status, booking_ref
             FROM bookings 
             WHERE space_unit_id = $1 
             AND status NOT IN ('cancelled', 'cancelled_by_owner', 'rejected', 'completed')
             AND (
                 (start_time <= $2 AND end_time > $2) OR
                 (start_time < $3 AND end_time >= $3) OR
                 (start_time >= $2 AND end_time <= $3)
             )`,
            [space_unit_id, new Date(start_time), new Date(end_time)]
        );
        const formatDateForDisplay = (date) => {
            return new Date(date).toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };




        if (overlapCheck.rows.length > 0) {
            const conflictingBooking = overlapCheck.rows[0];
            console.log('❌ Conflict found:', conflictingBooking);
            const conflictstartDate = formatDateForDisplay(conflictingBooking.start_time);
            const conflictEndDate = formatDateForDisplay(conflictingBooking.end_time);
            const formatedStart = formatDateForDisplay(conflictstartDate);
            const formatedEnd = formatDateForDisplay(conflictEndDate);

            // Check if the conflicting booking is the user's own cancelled booking
            const isUserOwnCancelled = await pool.query(
                `SELECT id FROM bookings 
                 WHERE id = $1 AND user_id = $2 AND status = 'cancelled'`,
                [conflictingBooking.id, user_id]
            );

            if (isUserOwnCancelled.rows.length > 0) {
                // This is the user's own cancelled booking - allow rebooking
                console.log('✅ User is rebooking their cancelled booking');
                // Proceed with booking creation
            } else {
                return res.status(409).json({
                    success: false,
                    message: `This time slot is already booked from ${formatedStart} to ${formatedEnd}.Please select different dates.`,
                    conflictingBooking: {
                        booking_ref: conflictingBooking.booking_ref,
                        start_time: conflictingBooking.start_time,
                        end_time: conflictingBooking.end_time,
                        start_date_formatted: formattedStart,
                        end_date_formatted: formattedEnd,
                        status: conflictingBooking.status
                    }
                });
            }
        }

        // Get buyer details
        const buyerDetails = await pool.query(
            `SELECT id, full_name, email, phone FROM users WHERE id = $1`,
            [user_id]
        );

        if (buyerDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Buyer not found"
            });
        }

        const buyer = buyerDetails.rows[0];

        // Get owner details
        const ownerDetails = await pool.query(
            `SELECT id, full_name, email, phone FROM users WHERE id = $1`,
            [unit.owner_id]
        );

        if (ownerDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Owner not found"
            });
        }

        const owner = ownerDetails.rows[0];

        const booking_ref = generateBookingRef();

        // Create booking
        const result = await pool.query(
            `INSERT INTO bookings (user_id, space_unit_id, start_time, end_time, total_price, status, booking_ref)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, space_unit_id, start_time, end_time, total_price, 'confirmed', booking_ref]
        );

        const booking = result.rows[0];
        console.log('✅ Booking created:', booking.booking_ref);

        // Prepare data for emails
        const spaceData = {
            name: unit.space_name,
            id: unit.space_id,
            address: unit.address,
            city: unit.city,
            area: unit.area
        };

        const unitData = {
            name: unit.name,
            unit_type: unit.unit_type,
            total_capacity: unit.total_capacity
        };

        // Send emails using the email service
        const emailResults = {
            owner: { success: false },
            buyer: { success: false },
            admin: { success: false }
        };

        // Send email to OWNER
        try {
            await sendBookingNotificationToOwner(booking, buyer, unitData, spaceData, owner);
            emailResults.owner.success = true;
            console.log(`✅ Email sent to owner: ${owner.email}`);
        } catch (emailErr) {
            emailResults.owner.error = emailErr.message;
            console.error('❌ Email to owner failed:', emailErr.message);
        }

        // Send email to BUYER
        try {
            await sendBookingConfirmationToBuyer(booking, buyer, unitData, spaceData);
            emailResults.buyer.success = true;
            console.log(`✅ Email sent to buyer: ${buyer.email}`);
        } catch (emailErr) {
            emailResults.buyer.error = emailErr.message;
            console.error('❌ Email to buyer failed:', emailErr.message);
        }

        // Send email to ADMIN
        try {
            await sendBookingNotificationToAdmin(booking, buyer, unitData, spaceData, owner);
            emailResults.admin.success = true;
            console.log(`✅ Admin notification email sent to: ${process.env.ADMIN_EMAIL}`);
        } catch (emailErr) {
            emailResults.admin.error = emailErr.message;
            console.error('❌ Admin email failed:', emailErr.message);
        }

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
            emailStatus: emailResults // Optional: send email status back to client
        });

    } catch (error) {
        console.error("❌ createBooking error:", error);

        // Handle specific PostgreSQL errors
        if (error.code === '23P01' || error.message?.includes('no_overlap') || error.constraint === 'no_overlap') {
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
// 2. GET MY BOOKINGS (Buyer)
// ============================================
// export const getMyBookings = async (req, res) => {
//     try {
//         const user_id = req.user.id;

//         const result = await pool.query(
//             `SELECT b.*,
//                 json_build_object(
//                     'id', u.id,
//                     'name', u.name,
//                     'unit_type', u.unit_type,
//                     'total_capacity', u.total_capacity,
//                     'images', u.images
//                 ) as unit,
//                 json_build_object(
//                     'id', s.id,
//                     'name', s.name,
//                     'address', s.address,
//                     'city', s.city,
//                     'area', s.area
//                 ) as space
//              FROM bookings b
//              JOIN space_units u ON u.id = b.space_unit_id
//              JOIN spaces s ON s.id = u.space_id
//              WHERE b.user_id = $1
//              ORDER BY 
//                 CASE 
//                     WHEN b.status = 'pending' THEN 1 
//                     WHEN b.status = 'confirmed' THEN 2 
//                     ELSE 3 
//                 END,
//                 b.created_at DESC`,
//             [user_id]
//         );

//         return res.status(200).json({
//             success: true,
//             count: result.rows.length,
//             bookings: result.rows
//         });
//     } catch (error) {
//         console.error("getMyBookings error:", error.message);
//         return res.status(500).json({ success: false, message: "Server error" });
//     }
// };


export const getMyBookings = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT 
                b.id,
                b.space_unit_id,
                b.start_time,
                b.end_time,
                b.total_price,
                b.status,
                b.booking_ref,
                b.created_at,
                b.updated_at,
                u.id as unit_id,
                u.name as unit_name,
                u.unit_type,
                u.total_capacity,
                u.hourly_rate,
                u.daily_rate,
                u.monthly_rate,
                s.id as space_id,
                s.name as space_name,
                s.address,
                s.city,
                s.area,
                -- Get images from unit_images table
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', ui.id,
                            'image_base64', ui.image_base64,
                            'display_order', ui.display_order,
                            'is_primary', ui.is_primary
                        ) ORDER BY ui.display_order
                    ) FROM unit_images ui WHERE ui.unit_id = u.id),
                    '[]'::json
                ) as images
            FROM bookings b
            JOIN space_units u ON u.id = b.space_unit_id
            JOIN spaces s ON s.id = u.space_id
            WHERE b.user_id = $1
            ORDER BY 
                CASE 
                    WHEN b.status = 'pending' THEN 1 
                    WHEN b.status = 'confirmed' THEN 2 
                    ELSE 3 
                END,
                b.created_at DESC`,
            [user_id]
        );

        // Format the response with nested structure
        const bookings = result.rows.map(row => ({
            id: row.id,
            space_unit_id: row.space_unit_id,
            start_time: row.start_time,
            end_time: row.end_time,
            total_price: parseFloat(row.total_price),
            status: row.status,
            booking_ref: row.booking_ref,
            created_at: row.created_at,
            updated_at: row.updated_at,
            unit: {
                id: row.unit_id,
                name: row.unit_name,
                unit_type: row.unit_type,
                total_capacity: row.total_capacity,
                hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
                daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
                monthly_rate: row.monthly_rate ? parseFloat(row.monthly_rate) : null,
                images: row.images || []
            },
            space: {
                id: row.space_id,
                name: row.space_name,
                address: row.address,
                city: row.city,
                area: row.area
            }
        }));

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings: bookings
        });
    } catch (error) {
        console.error("getMyBookings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


// ============================================
// 3. GET BOOKING BY ID
// ============================================
export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT b.*,
                json_build_object(
                    'id', bu.id,
                    'full_name', bu.full_name,
                    'email', bu.email,
                    'phone', bu.phone
                ) as buyer,
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'unit_type', u.unit_type,
                    'total_capacity', u.total_capacity,
                    'images', u.images
                ) as unit,
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'address', s.address,
                    'city', s.city,
                    'area', s.area,
                    'owner_id', s.owner_id
                ) as space,
                json_build_object(
                    'id', ow.id,
                    'full_name', ow.full_name,
                    'email', ow.email
                ) as owner
             FROM bookings b
             JOIN users bu ON bu.id = b.user_id
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             JOIN users ow ON ow.id = s.owner_id
             WHERE b.id = $1`,
            [bookingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const booking = result.rows[0];

        // Authorization: Only buyer, owner, or admin can view
        if (booking.user_id !== user_id && booking.space?.owner_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Not authorized to view this booking" });
        }

        return res.status(200).json({ success: true, booking });
    } catch (error) {
        console.error("getBookingById error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ============================================
// 4. CANCEL BOOKING (Buyer)
// ============================================
// export const cancelBooking = async (req, res) => {
//     try {
//         const { bookingId } = req.params;
//         const user_id = req.user.id;

//         // Get booking details
//         const bookingDetails = await pool.query(
//             `SELECT b.*, u.name as unit_name, s.name as space_name, s.owner_id,
//                     bu.full_name as buyer_name, bu.email as buyer_email,
//                     ow.email as owner_email, ow.full_name as owner_name
//              FROM bookings b
//              JOIN space_units u ON u.id = b.space_unit_id
//              JOIN spaces s ON s.id = u.space_id
//              JOIN users bu ON bu.id = b.user_id
//              JOIN users ow ON ow.id = s.owner_id
//              WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'pending'`,
//             [bookingId, user_id]
//         );

//         if (bookingDetails.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found, already processed, or cannot be cancelled"
//             });
//         }

//         const booking = bookingDetails.rows[0];

//         // Update booking status
//         const result = await pool.query(
//             `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
//              WHERE id = $1 RETURNING *`,
//             [bookingId]
//         );

//         // Send cancellation email to OWNER
//         try {
//             await transporter.sendMail({
//                 from: `"CoZones" <${process.env.EMAIL_USER}>`,
//                 to: booking.owner_email,
//                 subject: `❌ Booking Cancelled - ${booking.booking_ref}`,
//                 html: `
//                     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//                         <h2 style="color: #e53e3e;">Booking Cancelled ❌</h2>
//                         <p>Hello <strong>${booking.owner_name}</strong>,</p>
//                         <p>A booking has been cancelled by the customer.</p>

//                         <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
//                             <h3>Cancelled Booking Details:</h3>
//                             <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
//                             <p><strong>Unit:</strong> ${booking.unit_name}</p>
//                             <p><strong>Space:</strong> ${booking.space_name}</p>
//                             <p><strong>Customer:</strong> ${booking.buyer_name}</p>
//                             <p><strong>Original Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</p>
//                         </div>

//                         <p>The unit is now available for other bookings.</p>
//                     </div>
//                 `,
//             });
//             console.log(`📧 Cancellation email sent to owner: ${booking.owner_email}`);
//         } catch (emailErr) {
//             console.error('❌ Cancellation email to owner failed:', emailErr.message);
//         }

//         // Send cancellation email to BUYER
//         try {
//             await transporter.sendMail({
//                 from: `"CoZones" <${process.env.EMAIL_USER}>`,
//                 to: booking.buyer_email,
//                 subject: `✅ Booking Cancelled - ${booking.booking_ref}`,
//                 html: `
//                     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//                         <h2 style="color: #38a169;">Booking Cancelled ✅</h2>
//                         <p>Hello <strong>${booking.buyer_name}</strong>,</p>
//                         <p>Your booking has been successfully cancelled as requested.</p>

//                         <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
//                             <h3>Cancelled Booking Details:</h3>
//                             <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
//                             <p><strong>Unit:</strong> ${booking.unit_name}</p>
//                             <p><strong>Space:</strong> ${booking.space_name}</p>
//                         </div>

//                         <p>We hope to serve you again in the future!</p>
//                     </div>
//                 `,
//             });
//             console.log(`📧 Cancellation email sent to buyer: ${booking.buyer_email}`);
//         } catch (emailErr) {
//             console.error('❌ Cancellation email to buyer failed:', emailErr.message);
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Booking cancelled successfully",
//             booking: result.rows[0]
//         });
//     } catch (error) {
//         console.error("cancelBooking error:", error.message);
//         return res.status(500).json({ success: false, message: "Server error" });
//     }
// };



// ============================================
// 8. OWNER CANCEL BOOKING (Owner se cancel)
// ============================================
// User cancels their own booking
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;

        console.log(`User ${user_id} attempting to cancel booking ${bookingId}`);

        // Get booking details with proper joins
        const bookingDetails = await pool.query(
            `SELECT b.*, u.name as unit_name, u.unit_type, s.name as space_name, 
                    s.owner_id, s.address, s.city,
                    bu.full_name as buyer_name, bu.email as buyer_email,
                    ow.email as owner_email, ow.full_name as owner_name
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             JOIN users bu ON bu.id = b.user_id
             JOIN users ow ON ow.id = s.owner_id
             WHERE b.id = $1 AND b.user_id = $2`,
            [bookingId, user_id]
        );

        if (bookingDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or you don't have permission to cancel it"
            });
        }

        const booking = bookingDetails.rows[0];

        // Check if booking can be cancelled (only confirmed bookings)
        if (booking.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel booking with status: ${booking.status}. Only confirmed bookings can be cancelled.`
            });
        }

        // Check if start time is in the future
        const startTime = new Date(booking.start_time);
        const now = new Date();

        if (startTime <= now) {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a booking that has already started or passed"
            });
        }

        // Update booking status to 'cancelled'
        const result = await pool.query(
            `UPDATE bookings 
             SET status = 'cancelled', 
                 updated_at = NOW()
             WHERE id = $1 
             RETURNING *`,
            [bookingId]
        );

        // Send email to OWNER (notify that user cancelled)
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: booking.owner_email,
                subject: `❌ Booking Cancelled by User - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e53e3e;">Booking Cancelled by User ❌</h2>
                        <p>Dear <strong>${booking.owner_name}</strong>,</p>
                        <p>The user has cancelled their booking.</p>
                        
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Cancelled Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>User:</strong> ${booking.buyer_name} (${booking.buyer_email})</p>
                            <p><strong>Unit:</strong> ${booking.unit_name}</p>
                            <p><strong>Space:</strong> ${booking.space_name}</p>
                            <p><strong>Original Date:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                            <p><strong>Total Amount:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
                        </div>
                        
                        <p>The space is now available for other users to book.</p>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:5173/owner-bookings" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                View My Bookings
                            </a>
                        </div>
                    </div>
                `,
            });
            console.log(`📧 Cancellation email sent to owner: ${booking.owner_email}`);
        } catch (emailErr) {
            console.error('❌ Email to owner failed:', emailErr.message);
            // Don't fail the cancellation if email fails
        }

        // Send email to USER (Buyer) - confirmation of cancellation
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: booking.buyer_email,
                subject: `✅ Booking Cancelled Successfully - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #38a169;">Booking Cancelled Successfully ✅</h2>
                        <p>Dear <strong>${booking.buyer_name}</strong>,</p>
                        <p>Your booking has been cancelled successfully.</p>
                        
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Cancelled Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${booking.unit_name}</p>
                            <p><strong>Space:</strong> ${booking.space_name}</p>
                            <p><strong>Original Date:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                            <p><strong>Refund Amount:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
                        </div>
                        
                        <p><strong>Refund will be processed within 5-7 business days.</strong></p>
                        <p>You can book another space anytime.</p>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:5173/spaces" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                Browse Spaces
                            </a>
                        </div>
                    </div>
                `,
            });
            console.log(`📧 Cancellation confirmation email sent to buyer: ${booking.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Email to buyer failed:', emailErr.message);
            // Don't fail the cancellation if email fails
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking: result.rows[0]
        });

    } catch (error) {
        console.error("cancelBooking error:", error.message);
        console.error("Error stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};









// ============================================
// 5. GET OWNER BOOKINGS
// ============================================
export const getOwnerBookings = async (req, res) => {
    try {
        const owner_id = req.user.id;

        const result = await pool.query(
            `SELECT b.*,
                json_build_object(
                    'id', bu.id,
                    'full_name', bu.full_name,
                    'email', bu.email,
                    'phone', bu.phone
                ) as buyer,
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'unit_type', u.unit_type,
                    'total_capacity', u.total_capacity
                ) as unit,
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'address', s.address,
                    'city', s.city,
                    'area', s.area
                ) as space
             FROM bookings b
             JOIN users bu ON bu.id = b.user_id
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             WHERE s.owner_id = $1
             ORDER BY 
                CASE WHEN b.status = 'pending' THEN 1 ELSE 2 END,
                b.created_at DESC`,
            [owner_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            bookings: result.rows
        });
    } catch (error) {
        console.error("getOwnerBookings error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ============================================
// 6. CONFIRM BOOKING (Owner)
// ============================================
export const confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        // Get booking details
        const bookingDetails = await pool.query(
            `SELECT b.*, u.name as unit_name, s.name as space_name, s.owner_id,
                    bu.full_name as buyer_name, bu.email as buyer_email
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             JOIN users bu ON bu.id = b.user_id
             WHERE b.id = $1 AND s.owner_id = $2 AND b.status = 'pending'`,
            [bookingId, owner_id]
        );

        if (bookingDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found, already processed, or not pending"
            });
        }

        const booking = bookingDetails.rows[0];

        // Update booking status
        const result = await pool.query(
            `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [bookingId]
        );

        // Send confirmation email to BUYER
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: booking.buyer_email,
                subject: `🎉 Booking Confirmed - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #38a169;">Booking Confirmed! 🎉</h2>
                        <p>Dear <strong>${booking.buyer_name}</strong>,</p>
                        <p>Great news! Your booking has been <strong style="color: #38a169;">CONFIRMED</strong> by the space owner.</p>
                        
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #011CCD;">Booking Details:</h3>
                            <table width="100%" cellpadding="8">
                                <tr>
                                    <td width="40%"><strong>Booking Ref:</strong></td>
                                    <td>${booking.booking_ref}</td>
                                </tr>
                                <tr>
                                    <td><strong>Unit:</strong></td>
                                    <td>${booking.unit_name}</td>
                                </tr>
                                <tr>
                                    <td><strong>Space:</strong></td>
                                    <td>${booking.space_name}</td>
                                </tr>
                                <tr>
                                    <td><strong>From:</strong></td>
                                    <td>${new Date(booking.start_time).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>To:</strong></td>
                                    <td>${new Date(booking.end_time).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Total Price:</strong></td>
                                    <td><strong style="color: #011CCD;">PKR ${parseFloat(booking.total_price).toLocaleString()}</strong></td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #e6f7e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0;">📌 <strong>What's Next?</strong></p>
                            <p style="margin: 5px 0 0 0;">Please arrive on time at the venue. You can contact the space owner for any special arrangements.</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/my-bookings" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View My Bookings
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 12px;">Thank you for choosing CoZones! Enjoy your booking.</p>
                    </div>
                `,
            });
            console.log(`📧 Confirmation email sent to buyer: ${booking.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Confirmation email failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking confirmed successfully",
            booking: result.rows[0]
        });
    } catch (error) {
        console.error("confirmBooking error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ============================================
// 7. REJECT BOOKING (Owner)
// ============================================
export const rejectBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        // Get booking details
        const bookingDetails = await pool.query(
            `SELECT b.*, u.name as unit_name, s.name as space_name, s.owner_id,
                    bu.full_name as buyer_name, bu.email as buyer_email
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             JOIN users bu ON bu.id = b.user_id
             WHERE b.id = $1 AND s.owner_id = $2 AND b.status = 'pending'`,
            [bookingId, owner_id]
        );

        if (bookingDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found, already processed, or not pending"
            });
        }

        const booking = bookingDetails.rows[0];

        // Update booking status
        const result = await pool.query(
            `UPDATE bookings SET status = 'rejected', updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [bookingId]
        );

        // Send rejection email to BUYER
        try {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: booking.buyer_email,
                subject: `❌ Booking Rejected - ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e53e3e;">Booking Rejected ❌</h2>
                        <p>Dear <strong>${booking.buyer_name}</strong>,</p>
                        <p>We regret to inform you that your booking request has been <strong style="color: #e53e3e;">REJECTED</strong> by the space owner.</p>
                        
                        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>Booking Details:</h3>
                            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                            <p><strong>Unit:</strong> ${booking.unit_name}</p>
                            <p><strong>Space:</strong> ${booking.space_name}</p>
                            <p><strong>Requested Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</p>
                        </div>
                        
                        <p>Don't worry! You can explore other available spaces and book them.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/spaces" 
                               style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Browse Other Spaces
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 12px;">We apologize for any inconvenience caused.</p>
                    </div>
                `,
            });
            console.log(`📧 Rejection email sent to buyer: ${booking.buyer_email}`);
        } catch (emailErr) {
            console.error('❌ Rejection email failed:', emailErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking rejected successfully",
            booking: result.rows[0]
        });
    } catch (error) {
        console.error("rejectBooking error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};



// ============================================
// 9. ADMIN GET ALL BOOKINGS
// ============================================
export const adminGetAllBookings = async (req, res) => {
    try {
        // Admin role check middleware se pehle hi ho jayega
        const { status, from_date, to_date, space_id, user_id } = req.query;

        let query = `
            SELECT b.*,
                json_build_object(
                    'id', bu.id,
                    'full_name', bu.full_name,
                    'email', bu.email,
                    'phone', bu.phone
                ) as buyer,
                json_build_object(
                    'id', ow.id,
                    'full_name', ow.full_name,
                    'email', ow.email
                ) as owner,
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'unit_type', u.unit_type
                ) as unit,
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'address', s.address,
                    'city', s.city
                ) as space
            FROM bookings b
            JOIN users bu ON bu.id = b.user_id
            JOIN space_units u ON u.id = b.space_unit_id
            JOIN spaces s ON s.id = u.space_id
            JOIN users ow ON ow.id = s.owner_id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (from_date) {
            query += ` AND b.start_time >= $${paramIndex}`;
            params.push(from_date);
            paramIndex++;
        }

        if (to_date) {
            query += ` AND b.end_time <= $${paramIndex}`;
            params.push(to_date);
            paramIndex++;
        }

        if (space_id) {
            query += ` AND s.id = $${paramIndex}`;
            params.push(space_id);
            paramIndex++;
        }

        if (user_id) {
            query += ` AND b.user_id = $${paramIndex}`;
            params.push(user_id);
            paramIndex++;
        }

        query += ` ORDER BY b.created_at DESC`;

        const result = await pool.query(query, params);

        // Calculate statistics
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = 'cancelled_by_owner' THEN 1 END) as cancelled_by_owner,
                SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END) as total_revenue
            FROM bookings
        `);

        return res.status(200).json({
            success: true,
            stats: stats.rows[0],
            count: result.rows.length,
            bookings: result.rows
        });
    } catch (error) {
        console.error("adminGetAllBookings error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

















// ============================================
// 10. CREATE DISPUTE
// ============================================
export const createDispute = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const user_id = req.user.id;
        const { reason, description } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Reason is required"
            });
        }

        // Check if booking exists and user is authorized
        const bookingCheck = await pool.query(
            `SELECT b.*, s.owner_id 
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             WHERE b.id = $1`,
            [bookingId]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookingCheck.rows[0];

        // Only buyer or owner can raise dispute
        if (booking.user_id !== user_id && booking.owner_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to raise dispute for this booking"
            });
        }

        // Check if dispute already exists
        const existingDispute = await pool.query(
            `SELECT id FROM disputes WHERE booking_id = $1 AND status != 'resolved'`,
            [bookingId]
        );

        if (existingDispute.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "A dispute already exists for this booking"
            });
        }

        // Create dispute
        const result = await pool.query(
            `INSERT INTO disputes (booking_id, raised_by, reason, description, status)
             VALUES ($1, $2, $3, $4, 'open')
             RETURNING *`,
            [bookingId, user_id, reason, description]
        );

        // Send email to admin
        try {
            const admins = await pool.query(`SELECT email FROM users WHERE role = 'admin'`);

            for (const admin of admins.rows) {
                await transporter.sendMail({
                    from: `"CoZones" <${process.env.EMAIL_USER}>`,
                    to: admin.email,
                    subject: `⚠️ New Dispute Raised - Booking ${booking.booking_ref}`,
                    html: `<p>A new dispute has been raised for booking: ${booking.booking_ref}</p>
                           <p>Reason: ${reason}</p>
                           <p>Please login to resolve.</p>`
                });
            }
        } catch (emailErr) {
            console.error("Email to admin failed:", emailErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Dispute raised successfully",
            dispute: result.rows[0]
        });
    } catch (error) {
        console.error("createDispute error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ============================================
// 11. GET ALL DISPUTES (Admin)
// ============================================
export const getAllDisputes = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT d.*,
                json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email) as raised_by_user,
                json_build_object('id', b.id, 'booking_ref', b.booking_ref, 'status', b.status) as booking,
                json_build_object('id', r.id, 'full_name', r.full_name) as resolved_by_user
            FROM disputes d
            JOIN users u ON u.id = d.raised_by
            JOIN bookings b ON b.id = d.booking_id
            LEFT JOIN users r ON r.id = d.resolved_by
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ` AND d.status = $1`;
            params.push(status);
        }

        query += ` ORDER BY d.created_at DESC`;

        const result = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            disputes: result.rows
        });
    } catch (error) {
        console.error("getAllDisputes error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ============================================
// 12. RESOLVE DISPUTE (Admin)
// ============================================
export const resolveDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const admin_id = req.user.id;
        const { resolution, decision } = req.body; // decision: refund, no_refund, partial_refund

        if (!resolution || !decision) {
            return res.status(400).json({
                success: false,
                message: "Resolution and decision are required"
            });
        }

        // Update dispute
        const result = await pool.query(
            `UPDATE disputes 
             SET status = 'resolved', 
                 resolution = $1,
                 resolved_by = $2,
                 updated_at = NOW()
             WHERE id = $3 AND status = 'open'
             RETURNING *`,
            [resolution, admin_id, disputeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Dispute not found or already resolved"
            });
        }

        const dispute = result.rows[0];

        // Get booking details for email
        const bookingDetails = await pool.query(
            `SELECT b.*, bu.email as buyer_email, bu.full_name as buyer_name
             FROM bookings b
             JOIN users bu ON bu.id = b.user_id
             WHERE b.id = $1`,
            [dispute.booking_id]
        );

        const booking = bookingDetails.rows[0];

        // If decision is refund, update booking status
        if (decision === 'refund') {
            await pool.query(
                `UPDATE bookings SET status = 'refunded' WHERE id = $1`,
                [dispute.booking_id]
            );
        }

        // Send email to both parties
        const parties = await pool.query(
            `SELECT DISTINCT u.email, u.full_name
             FROM bookings b
             JOIN users u ON u.id IN (b.user_id, (SELECT owner_id FROM spaces WHERE id = (SELECT space_id FROM space_units WHERE id = b.space_unit_id)))
             WHERE b.id = $1`,
            [dispute.booking_id]
        );

        for (const party of parties.rows) {
            await transporter.sendMail({
                from: `"CoZones" <${process.env.EMAIL_USER}>`,
                to: party.email,
                subject: `📋 Dispute Resolved - Booking ${booking.booking_ref}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Dispute Resolution Decision</h2>
                        <p>Dear ${party.full_name},</p>
                        <p>The dispute for booking ${booking.booking_ref} has been resolved.</p>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px;">
                            <p><strong>Admin Decision:</strong> ${decision}</p>
                            <p><strong>Resolution:</strong> ${resolution}</p>
                        </div>
                        <p>Thank you for your patience.</p>
                    </div>
                `
            });
        }

        return res.status(200).json({
            success: true,
            message: "Dispute resolved successfully",
            dispute: result.rows[0],
            decision
        });
    } catch (error) {
        console.error("resolveDispute error:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


// ============================================
// 8. OWNER CANCEL BOOKING (Add this at the end of your controller file)
// ============================================
// Backend/src/controllers/booking.controller.js

export const ownerCancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;
        const { reason } = req.body;

        console.log('Cancel request:', { bookingId, owner_id, reason }); // Debug log

        // Validate reason
        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Reason for cancellation is required"
            });
        }

        // Get booking details with proper validation
        const bookingDetails = await pool.query(
            `SELECT b.*, 
                    u.name as unit_name, 
                    s.name as space_name, 
                    s.owner_id,
                    bu.full_name as buyer_name, 
                    bu.email as buyer_email
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             JOIN users bu ON bu.id = b.user_id
             WHERE b.id = $1 
               AND s.owner_id = $2 
               AND b.status IN ('pending', 'confirmed')
               AND b.start_time > NOW()`,
            [bookingId, owner_id]
        );

        console.log('Booking found:', bookingDetails.rows.length); // Debug log

        if (bookingDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found, already processed, cannot be cancelled, or is in the past"
            });
        }

        const booking = bookingDetails.rows[0];

        // Update booking status
        const result = await pool.query(
            `UPDATE bookings 
             SET status = 'cancelled_by_owner', 
                 cancellation_reason = $1,
                 updated_at = NOW()
             WHERE id = $2 
             RETURNING *`,
            [reason.trim(), bookingId]
        );

        console.log('Booking cancelled:', result.rows[0].id); // Debug log

        // Send email to buyer (don't let email failure break the response)
        try {
            // Make sure transporter is defined and configured
            if (transporter) {
                await transporter.sendMail({
                    from: `"CoZones" <${process.env.EMAIL_USER}>`,
                    to: booking.buyer_email,
                    subject: `⚠️ Booking Cancelled by Owner - ${booking.booking_ref}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                            <h2 style="color: #e53e3e;">Booking Cancelled ❌</h2>
                            <p>Dear <strong>${booking.buyer_name}</strong>,</p>
                            <p>We regret to inform you that the space owner has cancelled your booking.</p>
                            
                            <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #011CCD;">Booking Details:</h3>
                                <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
                                <p><strong>Unit:</strong> ${booking.unit_name}</p>
                                <p><strong>Space:</strong> ${booking.space_name}</p>
                                <p><strong>Date:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                            </div>
                            
                            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Reason for cancellation:</strong></p>
                                <p>${reason}</p>
                            </div>
                            
                            <p>Your payment will be refunded as per our refund policy. Please contact support if you have any questions.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:5173/spaces" 
                                   style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Browse Other Spaces
                                </a>
                            </div>
                        </div>
                    `,
                });
                console.log(`📧 Cancellation email sent to buyer: ${booking.buyer_email}`);
            } else {
                console.warn('Email transporter not configured');
            }
        } catch (emailErr) {
            console.error('❌ Cancellation email failed:', emailErr.message);
            // Don't throw error - continue with response
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully. Customer has been notified.",
            booking: result.rows[0]
        });

    } catch (error) {
        console.error("ownerCancelBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// DELETE BOOKING (Owner) - Permanently remove booking
// ============================================
// Backend/src/controllers/booking.controller.js

// Backend/src/controllers/booking.controller.js

export const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const owner_id = req.user.id;

        // First, verify the booking belongs to the owner's space
        const bookingCheck = await pool.query(
            `SELECT b.id, b.booking_ref, s.owner_id
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             WHERE b.id = $1 AND s.owner_id = $2`,
            [bookingId, owner_id]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or you don't have permission to delete it"
            });
        }

        const booking = bookingCheck.rows[0];

        // ✅ NO STATUS CHECK - Delete any booking regardless of status
        const result = await pool.query(
            `DELETE FROM bookings 
             WHERE id = $1 
             RETURNING id, booking_ref`,
            [bookingId]
        );

        console.log(`✅ Booking ${result.rows[0].booking_ref} deleted by owner ${owner_id}`);

        return res.status(200).json({
            success: true,
            message: "Booking deleted successfully",
            deletedBooking: result.rows[0]
        });

    } catch (error) {
        console.error("deleteBooking error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};
// ============================================
// DELETE ALL BOOKINGS (for raw PostgreSQL)
// ============================================
export const deleteAllBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { force } = req.query;

        console.log(`🗑️ Delete all bookings request for user: ${userId}, force: ${force}`);

        // First, find all bookings for this user
        const bookingsResult = await pool.query(
            `SELECT b.*, 
                    u.name as unit_name, 
                    s.name as space_name,
                    s.owner_id
             FROM bookings b
             JOIN space_units u ON u.id = b.space_unit_id
             JOIN spaces s ON s.id = u.space_id
             WHERE b.user_id = $1`,
            [userId]
        );

        const bookings = bookingsResult.rows;

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No bookings found to delete'
            });
        }

        // Separate active/upcoming bookings from others
        const now = new Date();
        const activeBookings = bookings.filter(booking =>
            booking.status === 'confirmed' &&
            new Date(booking.start_time) > now
        );

        // If force=true, cancel all active bookings first
        if (force === 'true' && activeBookings.length > 0) {
            await pool.query(
                `UPDATE bookings 
                 SET status = 'cancelled', 
                     updated_at = NOW()
                 WHERE user_id = $1 
                 AND status = 'confirmed' 
                 AND start_time > NOW()`,
                [userId]
            );
            console.log(`✅ Cancelled ${activeBookings.length} active bookings`);
        }
        // If not force and there are active bookings, return error
        else if (activeBookings.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete ${activeBookings.length} active/upcoming booking(s). Please cancel them first or check the box to force delete.`,
                activeCount: activeBookings.length,
                activeBookings: activeBookings.map(b => ({
                    id: b.id,
                    booking_ref: b.booking_ref,
                    start_time: b.start_time,
                    end_time: b.end_time,
                    status: b.status
                }))
            });
        }

        // Delete all bookings for this user
        const deleteResult = await pool.query(
            `DELETE FROM bookings WHERE user_id = $1 RETURNING id, booking_ref`,
            [userId]
        );

        const deletedCount = deleteResult.rowCount;
        const deletedBookings = deleteResult.rows;

        console.log(`✅ Deleted ${deletedCount} bookings for user ${userId}`);

        return res.status(200).json({
            success: true,
            message: `${deletedCount} booking(s) deleted successfully${force === 'true' && activeBookings.length > 0 ? ' (active bookings were cancelled first)' : ''}`,
            deletedCount: deletedCount,
            activeCancelled: force === 'true' ? activeBookings.length : 0,
            deletedBookings: deletedBookings.map(b => b.booking_ref)
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



