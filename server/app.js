import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import chatRouter from './src/routes/chat.js';
import clinicalTrialsRouter from './src/routes/clinicalTrials.js';
import healthRouter from './src/routes/health.js';
import pubmedRouter from './src/routes/pubmed.js';
import searchRouter from './src/routes/search.js';

const app = express();
const clientOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes('*') || clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.use('/chat', chatRouter);
app.use('/api/health', healthRouter);
app.use('/api/pubmed', pubmedRouter);
app.use('/api/clinical-trials', clinicalTrialsRouter);
app.use('/api/search', searchRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
