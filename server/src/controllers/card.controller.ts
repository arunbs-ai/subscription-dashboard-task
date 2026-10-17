import { Response, NextFunction } from 'express';
import { UserCard } from '../models/UserCard.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class CardController {
  // ─── Get User's Cards ─────────────────────────────────────────────────────────
  static async getMyCards(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cards = await UserCard.find({ userId: req.user!._id }).sort({ isDefault: -1, createdAt: -1 });
      res.status(200).json({ success: true, data: { cards } });
    } catch (error) {
      next(error);
    }
  }

  // ─── Add New Card ─────────────────────────────────────────────────────────────
  static async addCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { holderName, brand, cardNumber, last4, expMonth, expYear, isDefault } = req.body;
      const userId = req.user!._id;

      const finalLast4 = cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : (last4 || '4242');

      const existingCardsCount = await UserCard.countDocuments({ userId });
      const makeDefault = isDefault || existingCardsCount === 0;

      if (makeDefault) {
        await UserCard.updateMany({ userId }, { isDefault: false });
      }

      const card = await UserCard.create({
        userId,
        holderName: holderName.trim(),
        brand: brand || 'Visa',
        last4: finalLast4,
        expMonth: Number(expMonth),
        expYear: Number(expYear),
        isDefault: makeDefault,
      });

      res.status(201).json({ success: true, message: 'Card added successfully.', data: { card } });
    } catch (error) {
      next(error);
    }
  }

  // ─── Set Default Card ─────────────────────────────────────────────────────────
  static async setDefaultCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const card = await UserCard.findOne({ _id: req.params.id, userId });
      if (!card) {
        res.status(404).json({ success: false, message: 'Card not found.' });
        return;
      }

      await UserCard.updateMany({ userId }, { isDefault: false });
      card.isDefault = true;
      await card.save();

      res.status(200).json({ success: true, message: 'Default card updated.', data: { card } });
    } catch (error) {
      next(error);
    }
  }

  // ─── Delete Card ──────────────────────────────────────────────────────────────
  static async deleteCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const card = await UserCard.findOneAndDelete({ _id: req.params.id, userId });
      if (!card) {
        res.status(404).json({ success: false, message: 'Card not found.' });
        return;
      }

      // If deleted card was default, set another card as default if available
      if (card.isDefault) {
        const nextCard = await UserCard.findOne({ userId });
        if (nextCard) {
          nextCard.isDefault = true;
          await nextCard.save();
        }
      }

      res.status(200).json({ success: true, message: 'Card removed successfully.' });
    } catch (error) {
      next(error);
    }
  }
}
