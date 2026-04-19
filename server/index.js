import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './lib/db.js';

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase(process.env.MONGODB_URI);

    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

startServer();
