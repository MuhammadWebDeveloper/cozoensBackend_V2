// booking.routes.js - Final Version
import express from 'express';
import {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getOwnerBookings,
    confirmBooking,
    rejectBooking,
    ownerCancelBooking,      // ✅ ADD THIS
    adminGetAllBookings,      // ✅ ADD THIS
    createDispute,            // ✅ ADD THIS
    getAllDisputes,           // ✅ ADD THIS
    resolveDispute,      
    deleteAllBookings
} from '../controllers/booking.controller.js';
import protect from '../middleware/protect.middleware.js';
import { adminOnly, ownerOnly } from '../middleware/role.middleware.js'; // ✅ Create this

const Bookingroutes = express.Router();

// ============ USER (Buyer) Routes ============
Bookingroutes.post('/createbooking', protect, createBooking);
Bookingroutes.get('/my-bookings', protect, getMyBookings);
Bookingroutes.patch('/:bookingId/cancel', protect, cancelBooking);
// Add this route to your bookingRoutes.js file
Bookingroutes.delete('/delete-all', protect, deleteAllBookings);

// ============ OWNER Routes ============
Bookingroutes.get('/owner/requests', protect, ownerOnly, getOwnerBookings);
Bookingroutes.patch('/:bookingId/confirm', protect, ownerOnly, confirmBooking);
Bookingroutes.patch('/:bookingId/reject', protect, ownerOnly, rejectBooking);
Bookingroutes.patch('/:bookingId/owner-cancel', protect, ownerOnly, ownerCancelBooking); // ✅ NEW

// ============ ADMIN Routes ============
Bookingroutes.get('/admin/all-bookings', protect, adminOnly, adminGetAllBookings); // ✅ NEW

// ============ DISPUTE Routes ============
Bookingroutes.post('/:bookingId/dispute', protect, createDispute); // ✅ NEW
Bookingroutes.get('/admin/disputes', protect, adminOnly, getAllDisputes); // ✅ NEW
Bookingroutes.patch('/admin/disputes/:disputeId/resolve', protect, adminOnly, resolveDispute); // ✅ NEW

export default Bookingroutes;