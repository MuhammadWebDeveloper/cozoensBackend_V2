import express from 'express';
const app = express();
import dotenv from 'dotenv';
import connectDB from './src/config/db.config.js';
import routes from './src/routes/auth.routes.js';
import spacesRoutes from './src/routes/spaces.routes.js';
import cors from "cors";
import favoritesroutes from './src/routes/favrioutes.routes.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

// ✅ FIX: Increase payload limit for large base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Routes
app.use("/api/auth", routes);
app.use("/api/spaces", spacesRoutes);
app.use("/api/favorites", favoritesroutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});