// src/services/chat.service.js
// Auto-create a chat room when a booking is confirmed.
// Call this from your existing booking.controller.js

const chatModel = require('../models/chat.model');

/**
 * Called inside your createBooking controller after a booking is saved.
 *
 * Example usage in booking.controller.js:
 *
 *   const { createChatForBooking } = require('../services/chat.service');
 *
 *   // After saving booking to DB:
 *   await createChatForBooking({
 *     bookingId: newBooking.id,
 *     userId:    newBooking.user_id,
 *     ownerId:   newBooking.owner_id,   // or space.owner_id
 *   });
 */
const createChatForBooking = async ({ bookingId, userId, ownerId }) => {
  try {
    const chat = await chatModel.createChat({ bookingId, userId, ownerId });
    console.log(`[ChatService] Chat created/found for booking ${bookingId}: ${chat.id}`);
    return chat;
  } catch (err) {
    // Don't let chat creation failure break the booking flow
    console.error('[ChatService] Failed to create chat for booking:', err.message);
    return null;
  }
};

module.exports = { createChatForBooking };