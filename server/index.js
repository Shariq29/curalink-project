import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './src/routes/chat.js';

// Debug log to verify .env loading 
console.log(`[Server Setup] Initializing server. Environment loaded. API Key Status: ${process.env.GROQ_API_KEY ? 'Present' : 'Missing'}`);

const app = express();

/* ------------------ CORS ------------------ */
const clientOrigins = process.env.CLIENT_ORIGINS?.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow request if no origin (Postman/Server-to-Server), if origins aren't defined (local dev fallback), or if matched
    if (!origin || !clientOrigins || clientOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

app.use(express.json());

/* ------------------ ROUTES ------------------ */
app.use('/chat', chatRouter);

app.get('/', (req, res) => {
  res.send('Curalink API is running 🚀');
});

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 5001; // Avoid common frontend port collision

app.listen(PORT, () => {
  console.log(`[Express] Server running on port ${PORT}`);
});