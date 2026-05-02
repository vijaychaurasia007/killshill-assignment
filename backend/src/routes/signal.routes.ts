import { Router } from 'express';
import * as controller from '../controllers/signal.controller';
import { validate, createSignalSchema } from '../middleware/validate.middleware';

const router = Router();

router.post('/', validate(createSignalSchema), controller.createSignal);
router.get('/', controller.getAllSignals);
router.get('/:id', controller.getSignalById);
router.get('/:id/status', controller.getLiveStatus);
router.delete('/:id', controller.deleteSignal);

export default router;
