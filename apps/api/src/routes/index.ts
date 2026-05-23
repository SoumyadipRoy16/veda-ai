import { Router } from 'express';

import { assignmentsRouter } from './assignments';

export const apiRouter = Router();

apiRouter.get('/health', (_, response) => response.json({ status: 'ok' }));
apiRouter.use('/assignments', assignmentsRouter);export {};
