// src/jobs/autoCompleteBookings.js
import cron from 'node-cron';
import { pool } from '../config/db.config.js';

const AUTO_COMPLETE_INTERVAL = '*/10 * * * *'; // Every 10 minutes

export const startAutoCompleteJob = () => {
    console.log('🔄 Setting up auto-complete bookings job...');
    
    cron.schedule(AUTO_COMPLETE_INTERVAL, async () => {
        try {
            console.log(`🔄 Auto-complete check started at ${new Date().toISOString()}`);
            
            // Call the stored procedure
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
            
            // Log the completed bookings
            const completedBookings = response.completed_bookings || [];
            completedBookings.forEach((booking, index) => {
                console.log(`  ${index + 1}. ${booking.booking_ref} - ${booking.buyer_email}`);
            });
            
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
        const result = await pool.query(
            `SELECT auto_complete_bookings() as result`
        );
        
        const response = result.rows[0]?.result;
        
        if (!response || !response.success) {
            console.error('❌ Manual auto-complete failed:', response?.message);
            return { success: false, message: response?.message };
        }
        
        console.log(`✅ Manual auto-completed ${response.completed_count || 0} bookings`);
        
        return response;
        
    } catch (error) {
        console.error('❌ Manual auto-complete error:', error.message);
        return { success: false, message: error.message };
    }
};

export default { startAutoCompleteJob, manualAutoComplete };