import React from 'react';
import { CreditCard, Lock, User } from 'lucide-react';
import { Input } from './Input';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
  validateCardHolder,
  validateCardNumber,
  validateCvc,
  validateExpiry,
} from '../../utils/validation';

export interface CardFormValues {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export const emptyCard: CardFormValues = { holderName: '', cardNumber: '', expiry: '', cvc: '' };

export const validateCardForm = (v: CardFormValues): Record<string, string> => {
  const errs: Record<string, string> = {};
  const brand = detectCardBrand(v.cardNumber);
  const checks: [string, string][] = [
    ['holderName', validateCardHolder(v.holderName)],
    ['cardNumber', validateCardNumber(v.cardNumber)],
    ['expiry', validateExpiry(v.expiry)],
    ['cvc', validateCvc(v.cvc, brand)],
  ];
  checks.forEach(([k, msg]) => {
    if (msg) errs[k] = msg;
  });
  return errs;
};

export const toCardPayload = (v: CardFormValues) => {
  const { month, year } = parseExpiry(v.expiry);
  return {
    holderName: v.holderName.trim(),
    brand: detectCardBrand(v.cardNumber),
    last4: v.cardNumber.replace(/\D/g, '').slice(-4),
    expMonth: month,
    expYear: year,
  };
};

interface CardFormProps {
  values: CardFormValues;
  errors: Record<string, string>;
  onChange: (values: CardFormValues) => void;
}

export const CardForm: React.FC<CardFormProps> = ({ values, errors, onChange }) => {
  const brand = detectCardBrand(values.cardNumber);
  const set = (patch: Partial<CardFormValues>) => onChange({ ...values, ...patch });

  return (
    <div className="space-y-4">
      <Input
        label="Name On Card"
        placeholder="Alex Morgan"
        value={values.holderName}
        maxLength={50}
        onChange={(e) =>
          set({
            holderName: e.target.value
              .replace(/[^A-Za-z. ]/g, '')
              .replace(/^\s+/, '')
              .replace(/\s{2,}/g, ' '),
          })
        }
        error={errors.holderName}
        leftIcon={<User className="w-4 h-4" />}
      />
      <Input
        label={`Card Number${values.cardNumber ? ` (${brand})` : ''}`}
        placeholder="1234 5678 9012 3456"
        inputMode="numeric"
        autoComplete="cc-number"
        value={values.cardNumber}
        onChange={(e) => set({ cardNumber: formatCardNumber(e.target.value) })}
        error={errors.cardNumber}
        leftIcon={<CreditCard className="w-4 h-4" />}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Expiry (MM/YY)"
          placeholder="MM/YY"
          inputMode="numeric"
          autoComplete="cc-exp"
          value={values.expiry}
          onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
          error={errors.expiry}
        />
        <Input
          label="CVC"
          placeholder={brand === 'Amex' ? '1234' : '123'}
          inputMode="numeric"
          autoComplete="cc-csc"
          type="password"
          value={values.cvc}
          onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          error={errors.cvc}
          leftIcon={<Lock className="w-4 h-4" />}
        />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Only the last 4 digits and expiry are saved. The full number and CVC are never stored.
      </p>
    </div>
  );
};
