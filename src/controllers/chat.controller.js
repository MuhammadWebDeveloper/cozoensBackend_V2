// src/controllers/chat.controller.js
import chatModel from "../models/chat.model.js";

// ─── Helper ──────────────────────────────────────────────────

/**
 * Verify the requesting user is a participant of the chat.
 * Supports both 'user' and 'owner' roles.
 */
const assertChatAccess = (chat, requesterId) => {
  const isParticipant =
    chat.user_id === requesterId || chat.owner_id === requesterId;
  if (!isParticipant) {
    const error = new Error('Access denied: you are not a participant of this chat.');
    error.statusCode = 403;
    throw error;
  }
};

// ─── CONTROLLERS ─────────────────────────────────────────────

/**
 * POST /api/chats/creating
 * Create (or return existing) chat for a booking.
 * Body: { bookingId }
 */
const createOrGetChat = async (req, res) => {
  try {
    // Support both booking_id and bookingId from frontend
    const bookingId = req.body.booking_id || req.body.bookingId;
    // Get user from JWT token, not request body
    const userId = req.user.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'booking_id is required.',
      });
    }

    // Create chat (owner_id is automatically fetched from bookings table)
    const chat = await chatModel.createChat({ bookingId, userId });

    return res.status(200).json({
      success: true,
      ...chat,
      data: chat,
    });
  } catch (err) {
    console.error('[createOrGetChat]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error.',
    });
  }
};

/**
 * GET /api/chats/chat
 * Get all chats for the authenticated user (or owner).
 * Uses req.user.id and req.user.role from protect middleware.
 */
// const getMyChats = async (req, res) => {
//   try {
//     const { id: requesterId, role } = req.user;

//     let chats;
//     if (role === 'owner' || role === 'host') {
//       chats = await chatModel.findChatsByOwnerId(requesterId);
//     } else {
//       chats = await chatModel.findChatsByUserId(requesterId);
//     }

//     // Transform the response to match frontend expectations
//     const transformedChats = chats.map(chat => ({
//       ...chat,
//       user_name: chat.user_id === requesterId ? 'You' : chat.other_participant_name,
//       owner_name: chat.owner_id === requesterId ? 'You' : chat.other_participant_name,
//     }));

//     return res.status(200).json({
//       success: true,
//       count: transformedChats.length,
//       data: transformedChats,
//       chats: transformedChats, // For backward compatibility
//     });
//   } catch (err) {
//     console.error('[getMyChats]', err);
//     return res.status(500).json({ success: false, message: 'Server error.' });
//   }
// };


const getMyChats = async (req, res) => {
  try {
    const { id: requesterId, role } = req.user;

    // Dono taraf ki chats dikhao - chahe guest ho ya owner
    const chats = await chatModel.findChatsByParticipantId(requesterId);

    return res.status(200).json({
      success: true,
      count: chats.length,
      data: chats,
      chats: chats,
    });
  } catch (err) {
    console.error('[getMyChats]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/chats/chat/:id
 * Get a single chat by ID. Only participants can access.
 */
const getChatById = async (req, res) => {
  try {
    const chat = await chatModel.findChatById(req.params.id);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    assertChatAccess(chat, req.user.id);

    return res.status(200).json({ success: true, data: chat, chat: chat });
  } catch (err) {
    console.error('[getChatById]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error.',
    });
  }
};

/**
 * POST /api/chats/:id/sendmessages
 * Send a message in a chat.
 * Body: { message, messageType? }
 */
const sendMessage = async (req, res) => {
  try {
    const chatId = req.params.id;
    const senderId = req.user.id;
    const { message, messageType } = req.body;

    // Validate message content
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds 2000 character limit.',
      });
    }

    // Verify chat exists and requester is a participant
    const chat = await chatModel.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }
    assertChatAccess(chat, senderId);

    const newMessage = await chatModel.createMessage({
      chatId,
      senderId,
      message: message.trim(),
      messageType: messageType || 'text',
    });

    // Emit via Socket.IO (attached to req.app)
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('new_message', newMessage);
      // Notify both participants of chat list update
      io.to(`user:${chat.user_id}`).emit('chat_updated', {
        chatId,
        lastMessage: newMessage.message,
        lastMessageAt: newMessage.created_at,
      });
      io.to(`user:${chat.owner_id}`).emit('chat_updated', {
        chatId,
        lastMessage: newMessage.message,
        lastMessageAt: newMessage.created_at,
      });
    }

    return res.status(201).json({ success: true, data: newMessage, message: newMessage });
  } catch (err) {
    console.error('[sendMessage]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error.',
    });
  }
};

/**
 * GET /api/chats/:id/getmessages
 * Get paginated messages for a chat.
 * Query params: ?page=1&limit=50
 */
const getMessages = async (req, res) => {
  try {
    const chatId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    const chat = await chatModel.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }
    assertChatAccess(chat, req.user.id);

    const [messages, total] = await Promise.all([
      chatModel.findMessagesByChatId(chatId, limit, offset),
      chatModel.countMessagesByChatId(chatId),
    ]);

    return res.status(200).json({
      success: true,
      data: messages,
      messages: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + messages.length < total,
      },
    });
  } catch (err) {
    console.error('[getMessages]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error.',
    });
  }
};

/**
 * PATCH /api/chats/:id/asread
 * Mark all unread messages in a chat as read for the current user.
 */
const markAsRead = async (req, res) => {
  try {
    const chatId = req.params.id;
    const readerId = req.user.id;

    const chat = await chatModel.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }
    assertChatAccess(chat, readerId);

    const updatedIds = await chatModel.markMessagesAsRead(chatId, readerId);

    // Notify the sender their messages were read
    const io = req.app.get('io');
    if (io && updatedIds.length > 0) {
      io.to(`chat:${chatId}`).emit('messages_read', {
        chatId,
        readerId,
        messageIds: updatedIds,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${updatedIds.length} message(s) marked as read.`,
    });
  } catch (err) {
    console.error('[markAsRead]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error.',
    });
  }
};

export {
  createOrGetChat,
  getMyChats,
  getChatById,
  sendMessage,
  getMessages,
  markAsRead,
}