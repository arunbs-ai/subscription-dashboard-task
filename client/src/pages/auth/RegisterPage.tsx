import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, Building, Phone, CreditCard, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../store';
import { registerThunk, clearError } from '../../store/slices/authSlice';

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
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) errs.email = 'Email is required.';
    else if (!emailRe.test(formData.email)) errs.email = 'Enter a valid email address.';

    if (!formData.password) errs.password = 'Password is required.';
    else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters.';

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
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        company: formData.company.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      })
    );

    if (registerThunk.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create your SubPulse account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Start your {' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {preselectedPlan}
            </span>{' '}
            plan — free trial included
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-name"
                label="Full Name"
                placeholder="Alex Morgan"
                value={formData.name}
                onChange={set('name')}
                error={fieldErrors.name}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                id="reg-company"
                label="Company (Optional)"
                placeholder="Acme Corp"
                value={formData.company}
                onChange={set('company')}
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
              <Input
                id="reg-phone"
                label="Phone (Optional)"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={set('phone')}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={set('password')}
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
                value={formData.confirmPassword}
                onChange={set('confirmPassword')}
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

            {/* Trial info */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Includes 14-day full access trial. No credit card required during trial.</span>
            </div>

            {/* Terms */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (fieldErrors.agreed) setFieldErrors((prev) => ({ ...prev, agreed: '' }));
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</a>.
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
            <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
