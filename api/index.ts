import { Router, Request, Response } from 'express';
import { handleGeminiServerless } from './gemini.ts';

export const apiRouter = Router();

// Root /api handler
apiRouter.all('/', (req: Request, res: Response) => {
  if (req.method === 'POST') {
    return handleGeminiServerless(req, res);
  }
  res.json({
    service: 'SnapChef AI API',
    endpoints: ['/api/gemini', '/api/health'],
    status: 'online',
  });
});

export default apiRouter;
