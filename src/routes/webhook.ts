import { Router } from 'express';
import { handleIncomingMessage } from '../controllers/webhookController';

const router = Router();

router.post('/', handleIncomingMessage);

export const webhookRouter = router;
