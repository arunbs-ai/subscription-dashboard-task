import React from 'react';
import { COUNTRY_CODES, findCountry, sanitizePhoneNumber } from '../../utils/validation';

interface PhoneInputProps {
  id?: string;
  label?: string;
  countryIso: string;
  number: string;
  onChange: (countryIso: string, number: string) => void;
  error?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id = 'phone-input',
  label = 'Phone (Optional)',
  countryIso,
  number,
  onChange,
  error,
}) => {
  const country = findCountry(countryIso);
  const borderCls = error
    ? 'border-rose-400 bg-rose-50/30 text-rose-900 dark:border-rose-600 dark:bg-rose-950/20 dark:text-rose-200'
    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={countryIso}
          onChange={(e) => onChange(e.target.value, sanitizePhoneNumber(number, e.target.value))}
          className={`w-[5.25rem] shrink-0 rounded-xl border text-xs px-1.5 py-2.5 focus:outline-none ${borderCls}`}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.iso} {c.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={number}
          onChange={(e) => onChange(countryIso, sanitizePhoneNumber(e.target.value, countryIso))}
          placeholder={'0'.repeat(country.max)}
          maxLength={country.max}
          className={`flex-1 w-0 min-w-0 rounded-xl border text-sm px-3.5 py-2.5 focus:outline-none placeholder-slate-400 ${borderCls}`}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
