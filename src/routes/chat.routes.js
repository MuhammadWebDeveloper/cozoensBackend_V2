// src/routes/chat.routes.js

// const express = require('express');
import express from 'express';

const chatRouter = express.Router();
// const { protect } = require('../middleware/protect.middleware');
import protect from '../middleware/protect.middleware.js';
// const {
//   createOrGetChat,
//   getMyChats,
//   getChatById,
//   sendMessage,
//   getMessages,
//   markAsRead,
// } = require('../controllers/chat.controller');
import {
  createOrGetChat,
  getMyChats,
  getChatById,
  sendMessage,
  getMessages,
  markAsRead,
} from '../controllers/chat.controller.js';

// All chat routes require authentication
chatRouter.use(protect);

// Chat management
chatRouter.post('/creating', createOrGetChat);  // POST   /api/chats
chatRouter.get('/chat', getMyChats);        // GET    /api/chats
chatRouter.get('/chat/:id', getChatById);       // GET    /api/chats/:id

// Messages
chatRouter.post('/:id/sendmessages', sendMessage);     // POST   /api/chats/:id/messages
chatRouter.get('/:id/getmessages', getMessages);     // GET    /api/chats/:id/messages
chatRouter.patch('/:id/asread', markAsRead);      // PATCH  /api/chats/:id/read
export default chatRouter;