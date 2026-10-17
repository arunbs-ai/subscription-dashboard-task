import { Router } from 'express';
import { CardController } from '../controllers/card.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// User payment cards endpoints (requires auth)
router.get('/my', authenticate, CardController.getMyCards);
router.post('/', authenticate, CardController.addCard);
router.patch('/:id/default', authenticate, CardController.setDefaultCard);
router.delete('/:id', authenticate, CardController.deleteCard);

export default router;
