import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './src/routes/chat.js';

const app = express();

/* ------------------ CORS ------------------ */
const clientOrigins = process.env.CLIENT_ORIGINS?.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || clientOrigins?.includes(origin)) {
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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});