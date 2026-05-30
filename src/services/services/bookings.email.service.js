// src/services/email.service.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure transporter once - SHARED across all controllers
let transporter = null;

const initializeTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Verify connection
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email service error:', error);
            } else {
                console.log('✅ Email service ready');
                console.log(`📧 Using email: ${process.env.EMAIL_USER}`);
            }
        });
    }
    return transporter;
};

// Generic email sender
export const sendEmail = async (to, subject, html, from = null) => {
    try {
        const mailTransporter = initializeTransporter();

        const mailOptions = {
            from: from || `"CoZones" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

// Email template for buyer confirmation
export const sendBookingConfirmationToBuyer = async (booking, buyer, unit, space) => {
    const subject = `✅ Booking Confirmed - ${booking.booking_ref}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>Booking Confirmed! ✅</h2>
            <p>Dear <strong>${buyer.full_name}</strong>,</p>
            <p>Your booking has been confirmed.</p>
            <div style="background: #f7fafc; padding: 20px; border-radius: 10px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.booking_ref}</p>
                <p><strong>Space:</strong> ${space.name}</p>
                <p><strong>Unit:</strong> ${unit.name || unit.unit_type}</p>
                <p><strong>From:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                <p><strong>To:</strong> ${new Date(booking.end_time).toLocaleString()}</p>
                <p><strong>Total:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/my-bookings" style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View My Bookings</a>
        </div>
    `;
    return await sendEmail(buyer.email, subject, html);
};

// Email template for owner notification
export const sendBookingNotificationToOwner = async (booking, buyer, unit, space, owner) => {
    const subject = `🔔 New Booking - ${booking.booking_ref}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>New Booking! 🎉</h2>
            <p>Dear <strong>${owner.full_name}</strong>,</p>
            <p>You have a new booking.</p>
            <div style="background: #f7fafc; padding: 20px; border-radius: 10px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.booking_ref}</p>
                <p><strong>Customer:</strong> ${buyer.full_name} (${buyer.email})</p>
                <p><strong>Space:</strong> ${space.name}</p>
                <p><strong>Unit:</strong> ${unit.name || unit.unit_type}</p>
                <p><strong>From:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                <p><strong>To:</strong> ${new Date(booking.end_time).toLocaleString()}</p>
                <p><strong>Total:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/owner-bookings" style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
        </div>
    `;
    return await sendEmail(owner.email, subject, html);
};

// Email template for cancellation
export const sendBookingCancellationEmail = async (booking, user, unit, space, isBuyer = true) => {
    const subject = isBuyer
        ? `✅ Booking Cancelled - ${booking.booking_ref}`
        : `❌ Booking Cancelled by User - ${booking.booking_ref}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>${isBuyer ? 'Booking Cancelled ✅' : 'Booking Cancelled by User ❌'}</h2>
            <p>Dear <strong>${user.full_name}</strong>,</p>
            <p>Your booking has been cancelled.</p>
            <div style="background: #f7fafc; padding: 20px; border-radius: 10px;">
                <h3>Cancelled Booking:</h3>
                <p><strong>Reference:</strong> ${booking.booking_ref}</p>
                <p><strong>Space:</strong> ${space.name}</p>
                <p><strong>Original Date:</strong> ${new Date(booking.start_time).toLocaleString()}</p>
                ${isBuyer ? `<p><strong>Refund Amount:</strong> PKR ${parseFloat(booking.total_price).toLocaleString()}</p>` : ''}
            </div>
        </div>
    `;
    return await sendEmail(user.email, subject, html);
};

// Add this after your other email template functions

// Email template for admin notification
export const sendBookingNotificationToAdmin = async (booking, buyer, unit, space, owner) => {
    const subject = `📊 New Booking Alert - ${booking.booking_ref}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #011CCD;">New Booking Created! 📊</h2>
            <p>Dear Admin,</p>
            <p>A new booking has been created on the platform.</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #011CCD; margin-top: 0;">Booking Details:</h3>
                <table width="100%" cellpadding="8">
                    <tr>
                        <td width="40%"><strong>Booking Reference:</strong></td>
                        <td>${booking.booking_ref}</td>
                    </tr>
                    <tr>
                        <td><strong>Status:</strong></td>
                        <td><span style="color: #10b981; font-weight: bold;">${booking.status}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Customer:</strong></td>
                        <td>${buyer.full_name}</td>
                    </tr>
                    <tr>
                        <td><strong>Customer Email:</strong></td>
                        <td>${buyer.email}</td>
                    </tr>
                    <tr>
                        <td><strong>Space:</strong></td>
                        <td>${space.name}</td>
                    </tr>
                    <tr>
                        <td><strong>Unit:</strong></td>
                        <td>${unit.name || unit.unit_type}</td>
                    </tr>
                    <tr>
                        <td><strong>Check-in:</strong></td>
                        <td>${new Date(booking.start_time).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td><strong>Check-out:</strong></td>
                        <td>${new Date(booking.end_time).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Price:</strong></td>
                        <td><strong style="color: #011CCD;">PKR ${parseFloat(booking.total_price).toLocaleString()}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Space Owner:</strong></td>
                        <td>${owner.full_name} (${owner.email})</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📌 Admin Actions:</strong></p>
                <p style="margin: 5px 0 0 0;">You can view all bookings in the admin dashboard.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.ADMIN_URL}/admin/bookings" 
                   style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View Admin Dashboard
                </a>
            </div>
            
            <p style="color: #666; font-size: 12px;">This is an automated notification from CoZones.</p>
        </div>
    `;
    return await sendEmail(process.env.ADMIN_EMAIL, subject, html);
};
// Export all functions
export default {
    sendEmail,
    sendBookingConfirmationToBuyer,
    sendBookingNotificationToOwner,
    sendBookingNotificationToAdmin,
    sendBookingCancellationEmail
};