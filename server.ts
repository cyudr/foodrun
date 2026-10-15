import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRouter from './api/health.ts';
import geminiRouter from './api/gemini.ts';
import apiRouter from './api/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));

// Mount Core API Routers with and without .ts extension
app.use('/api/gemini.ts', geminiRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/health.ts', healthRouter);
app.use('/api/health', healthRouter);
app.use('/api', apiRouter);

// Route recipe discovery and identification directly to Gemini
app.use('/api/identify-ingredients', (req, res, next) => {
  req.url = '/identify-ingredients';
  geminiRouter(req, res, next);
});

app.use('/api/recipes/find-recipes', (req, res, next) => {
  req.url = '/find-recipes';
  geminiRouter(req, res, next);
});

app.use('/api/recipes/generate-custom', (req, res, next) => {
  req.url = '/generate-recipe';
  geminiRouter(req, res, next);
});

app.use('/api/tts', (req, res, next) => {
  req.url = '/tts';
  geminiRouter(req, res, next);
});

// Host Vite or Static Build
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SnapChef Server running on http://0.0.0.0:${PORT} (Gemini AI Powered)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
