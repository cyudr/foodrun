import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiHandler from './api/gemini.ts';
import healthHandler from './api/health.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Direct routes to /api/gemini.ts and /api/health.ts
app.all('/api/gemini.ts*', (req, res) => geminiHandler(req, res));
app.all('/api/gemini*', (req, res) => geminiHandler(req, res));
app.all('/api/health.ts*', (req, res) => healthHandler(req, res));
app.all('/api/health*', (req, res) => healthHandler(req, res));

// Direct routing for recipe discovery and identification
app.all('/api/identify-ingredients', (req, res) => {
  req.body = { ...req.body, action: 'identify' };
  return geminiHandler(req, res);
});

app.all('/api/recipes/find-recipes', (req, res) => {
  req.body = { ...req.body, action: 'find-recipes' };
  return geminiHandler(req, res);
});

app.all('/api/recipes/generate-custom', (req, res) => {
  req.body = { ...req.body, action: 'generate-recipe' };
  return geminiHandler(req, res);
});

app.all('/api/recipes/reverse-engineer', (req, res) => {
  req.body = { ...req.body, action: 'reverse-engineer' };
  return geminiHandler(req, res);
});

app.all('/api/adjust-dish-photo', (req, res) => {
  req.body = { ...req.body, action: 'adjust-dish-photo' };
  return geminiHandler(req, res);
});

app.all('/api/tts', (req, res) => {
  req.body = { ...req.body, action: 'tts' };
  return geminiHandler(req, res);
});

// Catch-all for /api to geminiHandler
app.all('/api*', (req, res) => geminiHandler(req, res));

// Host Vite or Static Build
const isProduction = process.env.NODE_ENV === 'production';

function getPort(): number {
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    return Number(process.argv[portIndex + 1]) || 3000;
  }
  return Number(process.env.PORT) || 3000;
}

function getHost(): string {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  return '0.0.0.0';
}

async function startServer() {
  const port = getPort();
  const host = getHost();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`SnapChef Server running on http://${host}:${port} (Gemini AI API)`);
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
