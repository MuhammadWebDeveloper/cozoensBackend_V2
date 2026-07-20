// C:\Users\HP\OneDrive\Desktop\Airbnb clone project\Backend\index.js

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
import chatRouter from './src/routes/chat.routes.js';
import SearchRoute from './src/routes/searchRoutes.routes.js';

import { initSocket } from './src/socket/socket.js';

import cron from 'node-cron';
import { pool } from './src/config/db.config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://cozones.netlify.app',
        'https://v1.co-zones.com',
        'https://co-zones.com',
        'https://www.co-zones.com',
        'http://76.13.20.95'
    ],
    credentials: true,
}));

// Routes
app.use('/api/auth', routes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/favorites', favoritesroutes);
app.use('/api/bookings', Bookingroutes);
app.use('/api/host-requests', Hostrouter);
app.use('/api/spaces', SearchRoute);
app.use('/api/chats', chatRouter);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Connect Database
connectDB();

// Auto-complete bookings job
const AUTO_COMPLETE_INTERVAL = '*/10 * * * *'; // Every 10 minutes

const startAutoCompleteJob = () => {
    console.log('🔄 Setting up auto-complete bookings job...');

    cron.schedule(AUTO_COMPLETE_INTERVAL, async () => {
        try {
            console.log(`🔄 Auto-complete check started at ${new Date().toISOString()}`);

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

            const completedBookings = response.completed_bookings || [];
            completedBookings.forEach((booking, index) => {
                console.log(`  ${index + 1}. ${booking.booking_ref} - ${booking.buyer_email}`);
            });

        } catch (error) {
            console.error('❌ Auto-complete job error:', error.message);
        }
    });

    console.log('✅ Auto-complete bookings job scheduled (every 10 minutes)');
};

// Conditional Socket.IO initialization
let server;
if (process.env.NODE_ENV !== 'production') {
    const httpServer = http.createServer(app);
    const io = initSocket(httpServer);
    app.set('io', io);
    server = httpServer;
} else {
    server = app;
}

// Start Server
if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Start auto-complete job
startAutoCompleteJob();

// Export for Vercel (serverless)
export default app;