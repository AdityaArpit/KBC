import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes/api.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkAndSeedInitialData } from './src/server/seed/SeedData.ts';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API Router under /api/v1
  app.use('/api/v1', apiRouter);

  // Seed initial dataset in development if Firestore is empty
  checkAndSeedInitialData().catch((err) => {
    console.warn('Initial data seed notice:', err.message);
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KBC Event Command Center] Server operational on port ${PORT}`);
  });
}

startServer();
