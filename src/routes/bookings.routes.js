// booking.routes.js - Updated
import express from 'express';
import {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getOwnerBookings,
    confirmBooking,
    rejectBooking,
    ownerCancelBooking,
    adminGetAllBookings,
    createDispute,
    getAllDisputes,
    getDisputeById,        // ✅ ADD THIS
    resolveDispute,
    deleteAllBookings,
    deleteBooking
} from '../controllers/booking.controller.js';
import protect from '../middleware/protect.middleware.js';
import { adminOnly, ownerOnly } from '../middleware/role.middleware.js';

const Bookingroutes = express.Router();

// ============ USER (Buyer) Routes ============
Bookingroutes.post('/createbooking', protect, createBooking);
Bookingroutes.get('/my-bookings', protect, getMyBookings);
Bookingroutes.patch('/:bookingId/cancel', protect, cancelBooking);
Bookingroutes.delete('/delete-all', protect, deleteAllBookings);

// ============ OWNER Routes ============
Bookingroutes.get('/owner/requests', protect, ownerOnly, getOwnerBookings);
Bookingroutes.patch('/:bookingId/confirm', protect, ownerOnly, confirmBooking);
Bookingroutes.patch('/:bookingId/reject', protect, ownerOnly, rejectBooking);
Bookingroutes.patch('/:bookingId/owner-cancel', protect, ownerOnly, ownerCancelBooking);
Bookingroutes.delete('/:bookingId/delete', protect, ownerOnly, deleteBooking);

// ============ ADMIN Routes ============
Bookingroutes.get('/admin/all-bookings', protect, adminOnly, adminGetAllBookings);

// ============ DISPUTE Routes ============
Bookingroutes.post('/:bookingId/dispute', protect, createDispute);
Bookingroutes.get('/admin/disputes', protect, adminOnly, getAllDisputes);
Bookingroutes.get('/admin/disputes/:disputeId', protect, adminOnly, getDisputeById); // ✅ ADD THIS
Bookingroutes.patch('/admin/disputes/:disputeId/resolve', protect, adminOnly, resolveDispute);

export default Bookingroutes;