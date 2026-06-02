// Backend/src/services/email.service.js
import nodemailer from 'nodemailer';

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send welcome email to new user
export const sendWelcomeEmail = async (user) => {
    try {
        const mailOptions = {
            from: `"CoZones" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to CoZones! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; border-bottom: 2px solid #011CCD; padding-bottom: 20px;">
                        <h1 style="color: #011CCD;">Welcome to CoZones!</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2>Hello ${user.full_name || 'there'}! 👋</h2>
                        <p>Thank you for joining CoZones! We're excited to have you on board.</p>
                        <p>With CoZones, you can:</p>
                        <ul>
                            <li>✓ Book premium coworking spaces</li>
                            <li>✓ Save your favorite spaces</li>
                            <li>✓ Manage your bookings easily</li>
                            <li>✓ Connect with workspace providers</li>
                        </ul>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/spaces" 
                               style="background-color: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Explore Spaces
                            </a>
                        </div>
                        <p>Best regards,<br>The CoZones Team</p>
                    </div>
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
                        <p>&copy; 2024 CoZones. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to:', user.email);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        return false;
    }
};

// Send admin notification for new user
export const sendAdminNotification = async (user) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cozones.com';

        const mailOptions = {
            from: `"CoZones System" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: '📝 New User Registration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; border-bottom: 2px solid #011CCD; padding-bottom: 20px;">
                        <h1 style="color: #011CCD;">New User Registered!</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>A new user has joined CoZones.</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>👤 Name:</strong> ${user.full_name || 'Not provided'}</p>
                            <p><strong>📧 Email:</strong> ${user.email}</p>
                            <p><strong>📅 Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>👥 Role:</strong> ${user.role || 'user'}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.ADMIN_URL || 'http://localhost:5173/admin/users'}" 
                               style="background-color: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View User
                            </a>
                        </div>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Admin notification sent for:', user.email);
        return true;
    } catch (error) {
        console.error('❌ Error sending admin notification:', error.message);
        return false;
    }
};

// Optional: Send login notification (commented by default)
export const sendLoginNotification = async (user, req) => {
    try {
        const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const mailOptions = {
            from: `"CoZones Security" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: '🔐 New Login to Your Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; border-bottom: 2px solid #011CCD; padding-bottom: 20px;">
                        <h1 style="color: #011CCD;">Login Alert</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2>Hello ${user.full_name || 'there'}!</h2>
                        <p>We noticed a new login to your CoZones account.</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>📅 Date & Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>🌐 IP Address:</strong> ${ipAddress}</p>
                            <p><strong>💻 Device:</strong> ${userAgent.substring(0, 100)}</p>
                        </div>
                        <p>If this was you, you can safely ignore this email.</p>
                        <p>If you didn't log in, please contact our support team immediately.</p>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Login notification sent to:', user.email);
        return true;
    } catch (error) {
        console.error('❌ Error sending login notification:', error.message);
        return false;
    }
};
// // Send booking notification to owner
// export const sendBookingNotificationToOwner = async (owner, buyer, unit, booking) => {
//     try {
//         await transporter.sendMail({
//             from: `"CoZones" <${process.env.EMAIL_USER}>`,
//             to: owner.email,
//             subject: `New Booking on Your Space - ${booking.booking_ref}`,
//             html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
//                     <h2 style="color: #011CCD;">New Booking Received!</h2>
//                     <p>Dear <strong>${owner.full_name}</strong>,</p>
//                     <p>Someone just booked your space unit.</p>
//                     <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
//                         <h3 style="color: #011CCD; margin-top: 0;">Booking Details</h3>
//                         <table width="100%" cellpadding="8">
//                             <tr><td><strong>Booking Ref:</strong></td><td>${booking.booking_ref}</td></tr>
//                             <tr><td><strong>Space:</strong></td><td>${unit.space_name}</td></tr>
//                             <tr><td><strong>Unit:</strong></td><td>${unit.name || unit.unit_type}</td></tr>
//                             <tr><td><strong>From:</strong></td><td>${new Date(booking.start_time).toLocaleString()}</td></tr>
//                             <tr><td><strong>To:</strong></td><td>${new Date(booking.end_time).toLocaleString()}</td></tr>
//                             <tr><td><strong>Amount:</strong></td><td><strong style="color: #011CCD;">PKR ${parseFloat(booking.total_price).toLocaleString()}</strong></td></tr>
//                         </table>
//                     </div>
//                     <div style="background: #e6f7e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
//                         <h3 style="color: #2d7a2d; margin-top: 0;">Customer Info</h3>
//                         <p><strong>Name:</strong> ${buyer.full_name}</p>
//                         <p><strong>Email:</strong> ${buyer.email}</p>
//                         <p><strong>Phone:</strong> ${buyer.phone || 'Not provided'}</p>
//                     </div>
//                     <div style="text-align: center; margin-top: 30px;">
//                         <a href="http://localhost:5173/owner-bookings" style="background: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in Dashboard</a>
//                     </div>
//                 </div>`
//         });
//         console.log('Owner booking email sent to: ' + owner.email);
//         return true;
//     } catch (error) {
//         console.error('Owner booking email failed: ' + error.message);
//         return false;
//     }
// };

// // Send booking notification to admin
// export const sendBookingNotificationToAdmin = async (owner, buyer, unit, booking) => {
//     try {
//         const adminEmail = process.env.ADMIN_EMAIL || 'admin@cozones.com';
//         await transporter.sendMail({
//             from: `"CoZones System" <${process.env.EMAIL_USER}>`,
//             to: adminEmail,
//             subject: `New Booking Alert - ${booking.booking_ref}`,
//             html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
//                     <h2 style="color: #011CCD;">New Booking on Platform</h2>
//                     <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
//                         <table width="100%" cellpadding="8">
//                             <tr><td><strong>Booking Ref:</strong></td><td>${booking.booking_ref}</td></tr>
//                             <tr><td><strong>Buyer:</strong></td><td>${buyer.full_name} (${buyer.email})</td></tr>
//                             <tr><td><strong>Owner:</strong></td><td>${owner.full_name} (${owner.email})</td></tr>
//                             <tr><td><strong>Space:</strong></td><td>${unit.space_name}</td></tr>
//                             <tr><td><strong>Unit:</strong></td><td>${unit.name || unit.unit_type}</td></tr>
//                             <tr><td><strong>From:</strong></td><td>${new Date(booking.start_time).toLocaleString()}</td></tr>
//                             <tr><td><strong>To:</strong></td><td>${new Date(booking.end_time).toLocaleString()}</td></tr>
//                             <tr><td><strong>Amount:</strong></td><td>PKR ${parseFloat(booking.total_price).toLocaleString()}</td></tr>
//                         </table>
//                     </div>
//                     <div style="text-align: center; margin-top: 30px;">
//                         <a href="http://localhost:5173/admin/bookings" style="background: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in Admin Panel</a>
//                     </div>
//                 </div>`
//         });
//         console.log('Admin booking notification sent to: ' + adminEmail);
//         return true;
//     } catch (error) {
//         console.error('Admin booking email failed: ' + error.message);
//         return false;
//     }
// };

// Send booking notification to owner
export const sendBookingNotificationToOwner = async (owner, buyer, unit, booking) => {
    try {
        await transporter.sendMail({
            from: `"CoZones" <${process.env.EMAIL_USER}>`,
            to: owner.email,
            subject: `New Booking on Your Space - ${booking.booking_ref}`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #011CCD;">New Booking Received!</h2>
                    <p>Dear <strong>${owner.full_name}</strong>,</p>
                    <p>Someone just booked your space unit.</p>
                    <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #011CCD; margin-top: 0;">Booking Details</h3>
                        <table width="100%" cellpadding="8">
                            <tr><td><strong>Booking Ref:</strong></td><td>${booking.booking_ref}</td></tr>
                            <tr><td><strong>Space:</strong></td><td>${unit.space_name}</td></tr>
                            <tr><td><strong>Unit:</strong></td><td>${unit.name || unit.unit_type}</td></tr>
                            <tr><td><strong>From:</strong></td><td>${new Date(booking.start_time).toLocaleString()}</td></tr>
                            <tr><td><strong>To:</strong></td><td>${new Date(booking.end_time).toLocaleString()}</td></tr>
                            <tr><td><strong>Amount:</strong></td><td><strong style="color: #011CCD;">PKR ${parseFloat(booking.total_price).toLocaleString()}</strong></td></tr>
                        </table>
                    </div>
                    <div style="background: #e6f7e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2d7a2d; margin-top: 0;">Customer Info</h3>
                        <p><strong>Name:</strong> ${buyer.full_name}</p>
                        <p><strong>Email:</strong> ${buyer.email}</p>
                        <p><strong>Phone:</strong> ${buyer.phone || 'Not provided'}</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173/owner-bookings" style="background: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in Dashboard</a>
                    </div>
                </div>`
        });
        console.log('Owner booking email sent to: ' + owner.email);
        return true;
    } catch (error) {
        console.error('Owner booking email failed: ' + error.message);
        return false;
    }
};

// Send booking notification to admin
export const sendBookingNotificationToAdmin = async (owner, buyer, unit, booking) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cozones.com';
        await transporter.sendMail({
            from: `"CoZones System" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `New Booking Alert - ${booking.booking_ref}`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #011CCD;">New Booking on Platform</h2>
                    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <table width="100%" cellpadding="8">
                            <tr><td><strong>Booking Ref:</strong></td><td>${booking.booking_ref}</td></tr>
                            <tr><td><strong>Buyer:</strong></td><td>${buyer.full_name} (${buyer.email})</td></tr>
                            <tr><td><strong>Owner:</strong></td><td>${owner.full_name} (${owner.email})</td></tr>
                            <tr><td><strong>Space:</strong></td><td>${unit.space_name}</td></tr>
                            <tr><td><strong>Unit:</strong></td><td>${unit.name || unit.unit_type}</td></tr>
                            <tr><td><strong>From:</strong></td><td>${new Date(booking.start_time).toLocaleString()}</td></tr>
                            <tr><td><strong>To:</strong></td><td>${new Date(booking.end_time).toLocaleString()}</td></tr>
                            <tr><td><strong>Amount:</strong></td><td>PKR ${parseFloat(booking.total_price).toLocaleString()}</td></tr>
                        </table>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173/admin/bookings" style="background: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in Admin Panel</a>
                    </div>
                </div>`
        });
        console.log('Admin booking notification sent to: ' + adminEmail);
        return true;
    } catch (error) {
        console.error('Admin booking email failed: ' + error.message);
        return false;
    }
};
// =============================
// SEND PASSWORD RESET EMAIL
// =============================
export const sendPasswordResetEmail = async (userData) => {
    try {
        const { email, full_name, resetUrl } = userData;

        // ✅ Just use the existing transporter, don't try to create a new one
        await transporter.sendMail({
            from: `"CoZones" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - CoZones',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #011CCD;">CoZones</h1>
                        <h2 style="color: #333;">Reset Your Password</h2>
                    </div>
                    
                    <p>Dear <strong>${full_name}</strong>,</p>
                    
                    <p>We received a request to reset your password for your CoZones account. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #011CCD; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>This link will expire in <strong>1 hour</strong>.</p>
                    
                    <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                    
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
                    
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        CoZones - Your Space, Your Way<br>
                        Need help? Contact us at support@cozones.com
                    </p>
                </div>
            `,
        });

        console.log(`✅ Password reset email sent to: ${email}`);

    } catch (error) {
        console.error('❌ Password reset email error:', error.message);
        // Don't throw error - just log it so the API doesn't fail
        // throw error;
    }
};

// =============================
// SEND HOST APPROVAL EMAIL
// =============================
export const sendHostApprovalEmail = async (userData) => {
    try {
        await transporter.sendMail({
            from: `"CoZones" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: '🎉 Congratulations! You are now a Host on CoZones',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #011CCD;">Welcome to the Host Family! 🎉</h2>
                    <p>Dear <strong>${userData.full_name}</strong>,</p>
                    <p>Great news! Your host application has been <strong style="color: green;">APPROVED</strong>.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>✓ List your spaces</li>
                        <li>✓ Manage bookings</li>
                        <li>✓ Earn money from your property</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/owner/dashboard" 
                           style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Go to Host Dashboard
                        </a>
                    </div>
                    <p>Start listing your spaces today!</p>
                    <p>Best regards,<br>The CoZones Team</p>
                </div>
            `
        });
        console.log(`✅ Host approval email sent to: ${userData.email}`);
    } catch (error) {
        console.error('❌ Host approval email error:', error.message);
    }
};

// =============================
// SEND HOST REJECTION EMAIL
// =============================
export const sendHostRejectionEmail = async (userData) => {
    try {
        await transporter.sendMail({
            from: `"CoZones" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Update on Your Host Application - CoZones',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e53e3e;">Host Application Update</h2>
                    <p>Dear <strong>${userData.full_name}</strong>,</p>
                    <p>Thank you for your interest in becoming a host on CoZones.</p>
                    <p>After careful review, we regret to inform you that your application has been <strong style="color: red;">REJECTED</strong>.</p>
                    <p><strong>Reason:</strong> ${userData.reason || 'Information provided does not meet our requirements'}</p>
                    <p>You can reapply after addressing the above concerns.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/become-host" 
                           style="background: #011CCD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Reapply
                        </a>
                    </div>
                    <p>If you have questions, contact our support team.</p>
                </div>
            `
        });
        console.log(`✅ Host rejection email sent to: ${userData.email}`);
    } catch (error) {
        console.error('❌ Host rejection email error:', error.message);
    }
};