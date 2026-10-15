import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);

  res.status(200).json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    engine: 'Gemini AI',
    environment: {
      geminiKeyConfigured: hasGeminiKey,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
});

export default healthRouter;
