
export const NAME_MAX = 50;
export const COMPANY_MAX = 50;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 20;

export interface CountryCode {
  iso: string;
  name: string;
  dial: string;
  min: number;
  max: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'IN', name: 'India', dial: '+91', min: 10, max: 10 },
  { iso: 'US', name: 'United States', dial: '+1', min: 10, max: 10 },
  { iso: 'CA', name: 'Canada', dial: '+1', min: 10, max: 10 },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', min: 10, max: 10 },
  { iso: 'AU', name: 'Australia', dial: '+61', min: 9, max: 9 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', min: 9, max: 9 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', min: 9, max: 9 },
  { iso: 'SG', name: 'Singapore', dial: '+65', min: 8, max: 8 },
  { iso: 'MY', name: 'Malaysia', dial: '+60', min: 9, max: 10 },
  { iso: 'DE', name: 'Germany', dial: '+49', min: 10, max: 11 },
  { iso: 'FR', name: 'France', dial: '+33', min: 9, max: 9 },
  { iso: 'IT', name: 'Italy', dial: '+39', min: 9, max: 10 },
  { iso: 'ES', name: 'Spain', dial: '+34', min: 9, max: 9 },
  { iso: 'NL', name: 'Netherlands', dial: '+31', min: 9, max: 9 },
  { iso: 'CH', name: 'Switzerland', dial: '+41', min: 9, max: 9 },
  { iso: 'SE', name: 'Sweden', dial: '+46', min: 7, max: 9 },
  { iso: 'IE', name: 'Ireland', dial: '+353', min: 7, max: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', min: 8, max: 10 },
  { iso: 'ZA', name: 'South Africa', dial: '+27', min: 9, max: 9 },
  { iso: 'NG', name: 'Nigeria', dial: '+234', min: 10, max: 10 },
  { iso: 'KE', name: 'Kenya', dial: '+254', min: 9, max: 9 },
  { iso: 'BR', name: 'Brazil', dial: '+55', min: 10, max: 11 },
  { iso: 'MX', name: 'Mexico', dial: '+52', min: 10, max: 10 },
  { iso: 'JP', name: 'Japan', dial: '+81', min: 10, max: 10 },
  { iso: 'CN', name: 'China', dial: '+86', min: 11, max: 11 },
  { iso: 'KR', name: 'South Korea', dial: '+82', min: 9, max: 10 },
  { iso: 'PK', name: 'Pakistan', dial: '+92', min: 10, max: 10 },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', min: 10, max: 10 },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94', min: 9, max: 9 },
  { iso: 'NP', name: 'Nepal', dial: '+977', min: 10, max: 10 },
];

export const DEFAULT_COUNTRY_ISO = 'IN';

export const findCountry = (iso: string): CountryCode =>
  COUNTRY_CODES.find((c) => c.iso === iso) ||
  COUNTRY_CODES.find((c) => c.iso === DEFAULT_COUNTRY_ISO)!;

export const parsePhone = (stored?: string): { iso: string; number: string } => {
  const empty = { iso: DEFAULT_COUNTRY_ISO, number: '' };
  if (!stored) return empty;
  const trimmed = stored.trim();
  const match = trimmed.match(/^(\+\d{1,4})[\s-]*(.*)$/);
  if (!match) return { iso: DEFAULT_COUNTRY_ISO, number: trimmed.replace(/\D/g, '') };
  const country = COUNTRY_CODES.find((c) => c.dial === match[1]);
  return {
    iso: country ? country.iso : DEFAULT_COUNTRY_ISO,
    number: match[2].replace(/\D/g, ''),
  };
};

export const formatPhone = (iso: string, number: string): string =>
  number ? `${findCountry(iso).dial} ${number}` : '';

const collapseSpaces = (v: string) => v.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

export const sanitizeName = (v: string) =>
  collapseSpaces(v.replace(/[^A-Za-z ]/g, '')).slice(0, NAME_MAX);

export const sanitizeCompany = (v: string) => collapseSpaces(v).slice(0, COMPANY_MAX);

export const sanitizePhoneNumber = (v: string, iso: string) =>
  v.replace(/\D/g, '').slice(0, findCountry(iso).max);

export const sanitizePassword = (v: string) => v.replace(/\s/g, '').slice(0, PASSWORD_MAX);

export const validateName = (v: string): string => {
  if (!v) return 'First name is required.';
  if (v.startsWith(' ')) return 'Name must not start with a space.';
  if (/ {2,}/.test(v)) return 'Only one space is allowed between words.';
  if (/ $/.test(v)) return 'Name must not end with a space.';
  if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(v)) return 'Name can contain alphabets only.';
  if (v.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
  return '';
};

export const validateCompany = (v: string): string => {
  if (!v) return '';
  if (v.startsWith(' ')) return 'Company must not start with a space.';
  if (/ {2,}/.test(v)) return 'Only one space is allowed between words.';
  if (/ $/.test(v)) return 'Company must not end with a space.';
  if (v.length > COMPANY_MAX) return `Company must be at most ${COMPANY_MAX} characters.`;
  return '';
};

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const validateEmail = (v: string): string => {
  const email = v.trim();
  if (!email) return 'Work email is required.';
  if (email.length > 254 || !EMAIL_RE.test(email) || email.includes('..')) {
    return 'Enter a valid email address.';
  }
  return '';
};

export const validatePhone = (iso: string, number: string): string => {
  if (!number) return '';
  const c = findCountry(iso);
  if (!/^\d+$/.test(number)) return 'Phone number can contain digits only.';
  if (number.length < c.min || number.length > c.max) {
    return c.min === c.max
      ? `Phone number for ${c.name} must be ${c.min} digits.`
      : `Phone number for ${c.name} must be ${c.min}-${c.max} digits.`;
  }
  if (/^(\d)\1+$/.test(number)) return 'Enter a valid phone number.';
  return '';
};

export const validatePassword = (v: string): string => {
  if (!v) return 'Password is required.';
  if (/\s/.test(v)) return 'Password must not contain spaces.';
  if (v.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (v.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[a-z]/.test(v)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(v)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(v)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Password must include a special character.';
  return '';
};

export const PASSWORD_HINT = `${PASSWORD_MIN}-${PASSWORD_MAX} characters with uppercase, lowercase, number and special character; no spaces.`;

export const formatCardNumber = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

export const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const detectCardBrand = (number: string): string => {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(011|5)/.test(n)) return 'Discover';
  if (/^(60|65|81|82|508)/.test(n)) return 'RuPay';
  return 'Card';
};

const luhn = (digits: string) => {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

export const validateCardHolder = (v: string): string => {
  if (!v.trim()) return 'Name on card is required.';
  if (!/^[A-Za-z]+(?: [A-Za-z.]+)*$/.test(v.trim())) return 'Name can contain alphabets and single spaces only.';
  return '';
};

export const validateCardNumber = (v: string): string => {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Card number is required.';
  if (d.length < 13 || d.length > 19 || !luhn(d)) return 'Enter a valid card number.';
  return '';
};

export const parseExpiry = (v: string): { month: number; year: number } => {
  const [m, y] = v.split('/');
  return { month: parseInt(m, 10) || 0, year: y && y.length === 2 ? 2000 + parseInt(y, 10) : 0 };
};

export const validateExpiry = (v: string): string => {
  if (!v) return 'Expiry date is required.';
  const { month, year } = parseExpiry(v);
  if (!/^\d{2}\/\d{2}$/.test(v) || month < 1 || month > 12) return 'Use the MM/YY format.';
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return 'This card has expired.';
  }
  return '';
};

export const validateCvc = (v: string, brand: string): string => {
  const len = brand === 'Amex' ? 4 : 3;
  if (!new RegExp(`^\\d{${len}}$`).test(v)) return `CVC must be ${len} digits.`;
  return '';
};
