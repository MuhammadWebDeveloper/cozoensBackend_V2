// src/jobs/autoCompleteBookings.js
import cron from 'node-cron';
import { pool } from '../config/db.config.js';
import { 
    sendBookingConfirmationToBuyer,
    sendBookingNotificationToOwner 
} from '../services/email.service.js';

const AUTO_COMPLETE_INTERVAL = '*/10 * * * *'; // Every 10 minutes

export const startAutoCompleteJob = () => {
    console.log('🔄 Setting up auto-complete bookings job...');
    
    cron.schedule(AUTO_COMPLETE_INTERVAL, async () => {
        try {
            console.log(`🔄 Auto-complete check started at ${new Date().toISOString()}`);
            
            // Step 1: Auto-complete bookings using stored procedure
            const result = await pool.query(
                `SELECT auto_complete_bookings() as result`
            );
            
            const response = result.rows[0]?.result;
            
            if (!response || !response.success) {
                console.error('❌ Auto-complete failed:', response?.message || 'Unknown error');
                return;
            }
            
            const completedCount = response.completed_count || 0;
            
            if (completedCount === 0) {
                console.log('ℹ️ No bookings to auto-complete');
                return;
            }
            
            console.log(`✅ Auto-completed ${completedCount} bookings`);
            
            // Step 2: Send emails for each auto-completed booking
            const completedBookings = response.completed_bookings || [];
            
            for (const booking of completedBookings) {
                try {
                    // Prepare buyer object for email
                    const buyer = {
                        full_name: booking.buyer_name,
                        email: booking.buyer_email,
                        phone: booking.buyer_phone || 'N/A'
                    };
                    
                    // Prepare owner object for email
                    const owner = {
                        full_name: booking.owner_name || 'Space Owner',
                        email: booking.owner_email
                    };
                    
                    // Prepare unit object for email
                    const unit = {
                        name: booking.unit_name,
                        unit_type: booking.unit_type || 'Unit'
                    };
                    
                    // Prepare space object for email
                    const space = {
                        name: booking.space_name
                    };
                    
                    // Prepare booking object for email
                    const bookingData = {
                        booking_ref: booking.booking_ref,
                        start_time: booking.start_time,
                        end_time: booking.end_time,
                        total_price: booking.total_price,
                        status: 'completed'
                    };
                    
                    // Send email to BUYER (Using existing function)
                    await sendBookingConfirmationToBuyer(
                        bookingData,
                        buyer,
                        unit,
                        space
                    );
                    
                    console.log(`📧 Completion email sent to buyer: ${booking.buyer_email}`);
                    
                    // Send email to OWNER (Using existing function)
                    if (booking.owner_email) {
                        await sendBookingNotificationToOwner(
                            bookingData,
                            buyer,
                            unit,
                            space,
                            owner
                        );
                        console.log(`📧 Notification email sent to owner: ${booking.owner_email}`);
                    }
                    
                    // Mark email as sent in database
                    await pool.query(
                        `UPDATE bookings 
                         SET auto_complete_email_sent = true 
                         WHERE id = $1`,
                        [booking.booking_id]
                    );
                    
                } catch (emailError) {
                    console.error(`❌ Email failed for ${booking.booking_ref}:`, emailError.message);
                }
            }
            
            console.log(`✅ Auto-complete job completed at ${new Date().toISOString()}`);
            
        } catch (error) {
            console.error('❌ Auto-complete job error:', error.message);
            console.error('Stack:', error.stack);
        }
    });
    
    console.log(`✅ Auto-complete bookings job scheduled (runs every 10 minutes)`);
};

// Manual trigger for testing
export const manualAutoComplete = async () => {
    console.log('🔄 Manual auto-complete triggered...');
    
    try {
        // Step 1: Auto-complete bookings
        const result = await pool.query(
            `SELECT auto_complete_bookings() as result`
        );
        
        const response = result.rows[0]?.result;
        
        if (!response || !response.success) {
            console.error('❌ Manual auto-complete failed:', response?.message);
            return { success: false, message: response?.message };
        }
        
        const completedCount = response.completed_count || 0;
        console.log(`✅ Manual auto-completed ${completedCount} bookings`);
        
        // Step 2: Send emails
        const completedBookings = response.completed_bookings || [];
        
        for (const booking of completedBookings) {
            try {
                // Prepare data for email
                const buyer = {
                    full_name: booking.buyer_name,
                    email: booking.buyer_email,
                    phone: booking.buyer_phone || 'N/A'
                };
                
                const owner = {
                    full_name: booking.owner_name || 'Space Owner',
                    email: booking.owner_email
                };
                
                const unit = {
                    name: booking.unit_name,
                    unit_type: booking.unit_type || 'Unit'
                };
                
                const space = {
                    name: booking.space_name
                };
                
                const bookingData = {
                    booking_ref: booking.booking_ref,
                    start_time: booking.start_time,
                    end_time: booking.end_time,
                    total_price: booking.total_price,
                    status: 'completed'
                };
                
                // Send to buyer
                await sendBookingConfirmationToBuyer(
                    bookingData,
                    buyer,
                    unit,
                    space
                );
                console.log(`📧 Email sent to buyer: ${booking.buyer_email}`);
                
                // Send to owner
                if (booking.owner_email) {
                    await sendBookingNotificationToOwner(
                        bookingData,
                        buyer,
                        unit,
                        space,
                        owner
                    );
                    console.log(`📧 Email sent to owner: ${booking.owner_email}`);
                }
                
                await pool.query(
                    `UPDATE bookings 
                     SET auto_complete_email_sent = true 
                     WHERE id = $1`,
                    [booking.booking_id]
                );
                
            } catch (emailError) {
                console.error(`❌ Email failed for ${booking.booking_ref}:`, emailError.message);
            }
        }
        
        return response;
        
    } catch (error) {
        console.error('❌ Manual auto-complete error:', error.message);
        return { success: false, message: error.message };
    }
};

export default { startAutoCompleteJob, manualAutoComplete };