import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, Building, CreditCard, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../store';
import { registerThunk, clearError } from '../../store/slices/authSlice';
import { PhoneInput } from '../../components/common/PhoneInput';
import {
  DEFAULT_COUNTRY_ISO,
  NAME_MAX,
  COMPANY_MAX,
  PASSWORD_MAX,
  PASSWORD_HINT,
  formatPhone,
  sanitizeName,
  sanitizeCompany,
  sanitizePassword,
  validateName,
  validateCompany,
  validateEmail,
  validatePhone,
  validatePassword,
} from '../../utils/validation';
import { env } from '../../config/env';

export const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { isLoading, error } = useAppSelector((state) => state.auth);
  const preselectedPlan = searchParams.get('plan') || 'Professional';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    phoneIso: DEFAULT_COUNTRY_ISO,
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set =
    (field: string, sanitize: (v: string) => string = (v) => v) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: sanitize(e.target.value) }));
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    };

  const setPhone = (iso: string, number: string) => {
    setFormData((prev) => ({ ...prev, phoneIso: iso, phone: number }));
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const nameErr = validateName(formData.name.trimEnd());
    if (nameErr) errs.name = nameErr;

    const companyErr = validateCompany(formData.company.trimEnd());
    if (companyErr) errs.company = companyErr;

    const emailErr = validateEmail(formData.email);
    if (emailErr) errs.email = emailErr;

    const phoneErr = validatePhone(formData.phoneIso, formData.phone);
    if (phoneErr) errs.phone = phoneErr;

    const passwordErr = validatePassword(formData.password);
    if (passwordErr) errs.password = passwordErr;

    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match.';

    if (!agreed) errs.agreed = 'Please accept the Terms of Service.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (!validate()) return;

    const result = await dispatch(
      registerThunk({
        name: formData.name.trimEnd(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        company: formData.company.trimEnd() || undefined,
        phone: formatPhone(formData.phoneIso, formData.phone) || undefined,
      })
    );

    if (registerThunk.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/25 mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create your {env.appName} account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Start your {' '}
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {preselectedPlan}
            </span>{' '}
            plan
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-name"
                label="First Name"
                placeholder="Alex Morgan"
                maxLength={NAME_MAX}
                value={formData.name}
                onChange={set('name', sanitizeName)}
                error={fieldErrors.name}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                id="reg-company"
                label="Company (Optional)"
                placeholder="Acme Corp"
                maxLength={COMPANY_MAX}
                value={formData.company}
                onChange={set('company', sanitizeCompany)}
                error={fieldErrors.company}
                leftIcon={<Building className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-email"
                label="Work Email"
                type="email"
                placeholder="alex@acmecorp.com"
                value={formData.email}
                onChange={set('email')}
                error={fieldErrors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <PhoneInput
                id="reg-phone"
                countryIso={formData.phoneIso}
                number={formData.phone}
                onChange={setPhone}
                error={fieldErrors.phone}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="8-20 characters"
                maxLength={PASSWORD_MAX}
                helperText={PASSWORD_HINT}
                value={formData.password}
                onChange={set('password', sanitizePassword)}
                error={fieldErrors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none hover:text-slate-600 dark:hover:text-slate-200">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
              <Input
                id="reg-confirm-password"
                label="Confirm Password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                maxLength={PASSWORD_MAX}
                value={formData.confirmPassword}
                onChange={set('confirmPassword', sanitizePassword)}
                error={fieldErrors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="focus:outline-none hover:text-slate-600 dark:hover:text-slate-200">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (fieldErrors.agreed) setFieldErrors((prev) => ({ ...prev, agreed: '' }));
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">Privacy Policy</a>.
                </span>
              </label>
              {fieldErrors.agreed && (
                <p className="text-xs text-rose-500 mt-1 ml-6">{fieldErrors.agreed}</p>
              )}
            </div>

            <Button
              id="register-submit"
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account & Continue
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
