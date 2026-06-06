// src/socket/socket.js
// Socket.IO server - handles real-time messaging, typing, presence

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import chatModel from '../models/chat.model.js'; // Assuming chat.model.js also uses ES modules

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Reconnection handled client-side; keep server config clean
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // ─── JWT Authentication Middleware ─────────────────────────
    io.use((socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication token missing.'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // attach user to socket
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token.'));
        }
    });

    // ─── Connection Handler ─────────────────────────────────────
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`[Socket] Connected: ${userId} (${socket.id})`);

        // Track presence
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Each user joins their personal room for notifications
        socket.join(`user:${userId}`);

        // Broadcast online status to all rooms this user is in
        socket.broadcast.emit('user_online', { userId });

        // ─── Join a Chat Room ───────────────────────────────────
        socket.on('join_chat', async ({ chatId }) => {
            try {
                const chat = await chatModel.findChatById(chatId);
                if (!chat) return socket.emit('error', { message: 'Chat not found.' });

                const isParticipant =
                    chat.user_id === userId || chat.owner_id === userId;
                if (!isParticipant) {
                    return socket.emit('error', { message: 'Access denied.' });
                }

                socket.join(`chat:${chatId}`);
                socket.emit('joined_chat', { chatId });
                console.log(`[Socket] ${userId} joined chat:${chatId}`);
            } catch (err) {
                console.error('[Socket join_chat]', err);
                socket.emit('error', { message: 'Could not join chat.' });
            }
        });

        // ─── Leave a Chat Room ──────────────────────────────────
        socket.on('leave_chat', ({ chatId }) => {
            socket.leave(`chat:${chatId}`);
            console.log(`[Socket] ${userId} left chat:${chatId}`);
        });

        // ─── Send Message via Socket ────────────────────────────
        // Note: prefer using REST POST /api/chats/:id/messages
        // This is a fallback for ultra-low-latency needs
        socket.on('send_message', async ({ chatId, message, messageType }) => {
            try {
                if (!message || message.trim().length === 0) return;
                if (message.trim().length > 2000) {
                    return socket.emit('error', { message: 'Message too long.' });
                }

                const chat = await chatModel.findChatById(chatId);
                if (!chat) return socket.emit('error', { message: 'Chat not found.' });

                const isParticipant =
                    chat.user_id === userId || chat.owner_id === userId;
                if (!isParticipant) {
                    return socket.emit('error', { message: 'Access denied.' });
                }

                const newMessage = await chatModel.createMessage({
                    chatId,
                    senderId: userId,
                    message: message.trim(),
                    messageType: messageType || 'text',
                });

                // Broadcast to everyone in the chat room
                io.to(`chat:${chatId}`).emit('new_message', newMessage);

                // Update chat list for both participants
                const updatePayload = {
                    chatId,
                    lastMessage: newMessage.message,
                    lastMessageAt: newMessage.created_at,
                };
                io.to(`user:${chat.user_id}`).emit('chat_updated', updatePayload);
                io.to(`user:${chat.owner_id}`).emit('chat_updated', updatePayload);
            } catch (err) {
                console.error('[Socket send_message]', err);
                socket.emit('error', { message: 'Could not send message.' });
            }
        });

        // ─── Typing Indicators ──────────────────────────────────
        socket.on('typing_start', ({ chatId }) => {
            socket.to(`chat:${chatId}`).emit('typing_start', {
                chatId,
                userId,
            });
        });

        socket.on('typing_stop', ({ chatId }) => {
            socket.to(`chat:${chatId}`).emit('typing_stop', {
                chatId,
                userId,
            });
        });

        // ─── Mark Messages Read via Socket ──────────────────────
        socket.on('mark_read', async ({ chatId }) => {
            try {
                const chat = await chatModel.findChatById(chatId);
                if (!chat) return;

                const isParticipant =
                    chat.user_id === userId || chat.owner_id === userId;
                if (!isParticipant) return;

                const updatedIds = await chatModel.markMessagesAsRead(chatId, userId);
                if (updatedIds.length > 0) {
                    io.to(`chat:${chatId}`).emit('messages_read', {
                        chatId,
                        readerId: userId,
                        messageIds: updatedIds,
                    });
                }
            } catch (err) {
                console.error('[Socket mark_read]', err);
            }
        });

        // ─── Disconnect ─────────────────────────────────────────
        socket.on('disconnect', () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    // User is fully offline
                    socket.broadcast.emit('user_offline', { userId });
                }
            }
            console.log(`[Socket] Disconnected: ${userId} (${socket.id})`);
        });
    });

    return io;
};

/**
 * Utility: check if a user is currently online
 */
export const isUserOnline = (userId) => onlineUsers.has(userId);