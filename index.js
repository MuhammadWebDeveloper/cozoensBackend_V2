// import express from 'express';
// const app = express();
// import dotenv from 'dotenv';
// import connectDB from './src/config/db.config.js';
// import routes from './src/routes/auth.routes.js';
// import spacesRoutes from './src/routes/spaces.routes.js';
// import cors from "cors";
// import favoritesroutes from './src/routes/favrioutes.routes.js';
// import Bookingroutes from './src/routes/bookings.routes.js';
// import Hostrouter from './src/routes/hostRequest.routes.js';

// dotenv.config();
// const PORT = process.env.PORT || 5000;

// // ✅ FIX: Increase payload limit for large base64 images
// app.use(express.json({ limit: '5mb' }));
// app.use(express.urlencoded({ extended: true, limit: '5mb' }));
// app.use(cors());

// // Routes
// app.use("/api/auth", routes);
// app.use("/api/spaces", spacesRoutes);
// app.use("/api/favorites", favoritesroutes);
// app.use("/api/bookings", Bookingroutes);

// app.use("/api/host-requests", Hostrouter);

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

// connectDB();
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });




import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './src/config/db.config.js';

import routes from './src/routes/auth.routes.js';
import spacesRoutes from './src/routes/spaces.routes.js';
import favoritesroutes from './src/routes/favrioutes.routes.js';
import Bookingroutes from './src/routes/bookings.routes.js';
import Hostrouter from './src/routes/hostRequest.routes.js';

// NEW
// import chatRoutes from './src/routes/chat.routes.js';
import { initSocket } from './src/socket/socket.js';
import chatRouter from './src/routes/chat.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP Server for Socket.IO
const httpServer = http.createServer(app);

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// Routes
app.use('/api/auth', routes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/favorites', favoritesroutes);
app.use('/api/bookings', Bookingroutes);
app.use('/api/host-requests', Hostrouter);

// NEW Chat Routes
app.use('/api/chats', chatRouter);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Initialize Socket.IO
const io = initSocket(httpServer);

// Make io available in controllers
app.set('io', io);

// Connect Database
connectDB();

// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };