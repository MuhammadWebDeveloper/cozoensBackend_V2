// src/models/chat.model.js
// All database queries for chats and messages using raw pg

import { pool } from '../config/db.config.js';

// ─── CHAT QUERIES ────────────────────────────────────────────

/**
 * Create a new chat room for a booking.
 * Automatically fetches owner from spaces table via space_units.
 */
const createChat = async ({ bookingId, userId }) => {
  // Get booking with space unit and space owner information
  const bookingQuery = `
    SELECT 
      b.*,
      su.space_id,
      s.owner_id as space_owner_id,
      s.name as space_name
    FROM bookings b
    LEFT JOIN space_units su ON b.space_unit_id = su.id
    LEFT JOIN spaces s ON su.space_id = s.id
    WHERE b.id = $1
  `;
  const bookingResult = await pool.query(bookingQuery, [bookingId]);

  if (bookingResult.rows.length === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const booking = bookingResult.rows[0];
  const bookerId = booking.user_id;
  const ownerId = booking.space_owner_id;

  if (!ownerId) {
    const error = new Error('Could not determine space owner for this booking');
    error.statusCode = 400;
    throw error;
  }

  // Determine chat participants
  let chatUserId, chatOwnerId;

  if (userId === bookerId) {
    chatUserId = bookerId;
    chatOwnerId = ownerId;
  } else {
    chatUserId = ownerId;
    chatOwnerId = bookerId;
  }

  const query = `
    INSERT INTO chats (booking_id, user_id, owner_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (booking_id) DO UPDATE
      SET updated_at = NOW()
    RETURNING *
  `;
  const { rows } = await pool.query(query, [bookingId, chatUserId, chatOwnerId]);
  return rows[0];
};

/**
 * Find a chat by its booking ID.
 */
const findChatByBookingId = async (bookingId) => {
  const { rows } = await pool.query(
    'SELECT * FROM chats WHERE booking_id = $1',
    [bookingId]
  );
  return rows[0] || null;
};

/**
 * Find a chat by its ID.
 */
const findChatById = async (chatId) => {
  const { rows } = await pool.query(
    'SELECT * FROM chats WHERE id = $1',
    [chatId]
  );
  return rows[0] || null;
};

/**
 * Get all chats for a user, with last message preview and unread count.
 */
const findChatsByUserId = async (userId) => {
  const query = `
    SELECT
      c.*,
      b.start_time,
      b.end_time,
      b.status as booking_status,
      b.booking_ref,
      s.name as space_name,
      s.cover_image as space_image,
      -- Last message preview
      lm.message          AS last_message,
      lm.created_at       AS last_message_at,
      lm.sender_id        AS last_message_sender_id,
      -- Unread count (messages not sent by this user and not yet read)
      COALESCE(uc.unread_count, 0) AS unread_count,
      -- Get other participant's full_name
      CASE 
        WHEN c.user_id = $1 THEN u2.full_name
        ELSE u1.full_name
      END AS other_participant_name,
      CASE 
        WHEN c.user_id = $1 THEN u2.email
        ELSE u1.email
      END AS other_participant_email
    FROM chats c
    LEFT JOIN bookings b ON c.booking_id = b.id
    LEFT JOIN space_units su ON b.space_unit_id = su.id
    LEFT JOIN spaces s ON su.space_id = s.id
    LEFT JOIN users u1 ON c.user_id = u1.id
    LEFT JOIN users u2 ON c.owner_id = u2.id
    LEFT JOIN LATERAL (
      SELECT message, created_at, sender_id
      FROM messages
      WHERE chat_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread_count
      FROM messages
      WHERE chat_id = c.id
        AND sender_id != $1
        AND is_read = FALSE
    ) uc ON true
    WHERE c.user_id = $1
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

/**
 * Get all chats for an owner, with last message preview and unread count.
 */
const findChatsByOwnerId = async (ownerId) => {
  const query = `
    SELECT
      c.*,
      b.start_time,
      b.end_time,
      b.status as booking_status,
      b.booking_ref,
      s.name as space_name,
      s.cover_image as space_image,
      lm.message          AS last_message,
      lm.created_at       AS last_message_at,
      lm.sender_id        AS last_message_sender_id,
      COALESCE(uc.unread_count, 0) AS unread_count,
      CASE 
        WHEN c.user_id = $1 THEN u2.full_name
        ELSE u1.full_name
      END AS other_participant_name,
      CASE 
        WHEN c.user_id = $1 THEN u2.email
        ELSE u1.email
      END AS other_participant_email
    FROM chats c
    LEFT JOIN bookings b ON c.booking_id = b.id
    LEFT JOIN space_units su ON b.space_unit_id = su.id
    LEFT JOIN spaces s ON su.space_id = s.id
    LEFT JOIN users u1 ON c.user_id = u1.id
    LEFT JOIN users u2 ON c.owner_id = u2.id
    LEFT JOIN LATERAL (
      SELECT message, created_at, sender_id
      FROM messages
      WHERE chat_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread_count
      FROM messages
      WHERE chat_id = c.id
        AND sender_id != $1
        AND is_read = FALSE
    ) uc ON true
    WHERE c.owner_id = $1
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
  `;
  const { rows } = await pool.query(query, [ownerId]);
  return rows;
};

// ─── MESSAGE QUERIES ─────────────────────────────────────────

/**
 * Insert a new message.
 */
const createMessage = async ({ chatId, senderId, message, messageType = 'text' }) => {
  const query = `
    INSERT INTO messages (chat_id, sender_id, message, message_type)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [chatId, senderId, message, messageType]);

  // Also bump the chat's updated_at so it floats to top of list
  await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

  return rows[0];
};

/**
 * Get paginated messages for a chat (newest-first pagination, then reversed for display).
 * @param {string} chatId
 * @param {number} limit  - messages per page
 * @param {number} offset - skip this many messages
 */
const findMessagesByChatId = async (chatId, limit = 50, offset = 0) => {
  const query = `
    SELECT *
    FROM messages
    WHERE chat_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const { rows } = await pool.query(query, [chatId, limit, offset]);
  // Return in chronological order for the frontend
  return rows.reverse();
};

/**
 * Get total message count for a chat (used for pagination metadata).
 */
const countMessagesByChatId = async (chatId) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*) AS total FROM messages WHERE chat_id = $1',
    [chatId]
  );
  return parseInt(rows[0].total, 10);
};

/**
 * Mark all messages in a chat as read for a given reader (not sent by them).
 */
const markMessagesAsRead = async (chatId, readerId) => {
  const query = `
    UPDATE messages
    SET is_read = TRUE, updated_at = NOW()
    WHERE chat_id = $1
      AND sender_id != $2
      AND is_read = FALSE
    RETURNING id
  `;
  const { rows } = await pool.query(query, [chatId, readerId]);
  return rows.map((r) => r.id);
};
/**
 * Get all chats where user is EITHER user_id OR owner_id
 * This shows ALL conversations for a user regardless of role
 */
const findChatsByParticipantId = async (participantId) => {
  const query = `
    SELECT
      c.*,
      b.start_time,
      b.end_time,
      b.status as booking_status,
      b.booking_ref,
      s.name as space_name,
      s.cover_image as space_image,
      lm.message AS last_message,
      lm.created_at AS last_message_at,
      lm.sender_id AS last_message_sender_id,
      COALESCE(uc.unread_count, 0) AS unread_count,
      CASE 
        WHEN c.user_id = $1 THEN u2.full_name
        ELSE u1.full_name
      END AS other_participant_name,
      CASE 
        WHEN c.user_id = $1 THEN u2.email
        ELSE u1.email
      END AS other_participant_email
    FROM chats c
    LEFT JOIN bookings b ON c.booking_id = b.id
    LEFT JOIN space_units su ON b.space_unit_id = su.id
    LEFT JOIN spaces s ON su.space_id = s.id
    LEFT JOIN users u1 ON c.user_id = u1.id
    LEFT JOIN users u2 ON c.owner_id = u2.id
    LEFT JOIN LATERAL (
      SELECT message, created_at, sender_id
      FROM messages
      WHERE chat_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread_count
      FROM messages
      WHERE chat_id = c.id
        AND sender_id != $1
        AND is_read = FALSE
    ) uc ON true
    WHERE c.user_id = $1 OR c.owner_id = $1
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
  `;
  const { rows } = await pool.query(query, [participantId]);
  return rows;
};
export default {
  createChat,
  findChatByBookingId,
  findChatById,
  findChatsByUserId,
  findChatsByOwnerId,
  createMessage,
  findMessagesByChatId,
  countMessagesByChatId,
  markMessagesAsRead,
  findChatsByParticipantId,
}