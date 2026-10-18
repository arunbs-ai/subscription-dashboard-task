import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateProfileThunk, changePasswordThunk } from '../../store/slices/authSlice';
import { PhoneInput } from './PhoneInput';
import {
  COMPANY_MAX,
  NAME_MAX,
  PASSWORD_HINT,
  PASSWORD_MAX,
  formatPhone,
  parsePhone,
  sanitizeCompany,
  sanitizeName,
  sanitizePassword,
  validateCompany,
  validateEmail,
  validateName,
  validatePassword as validatePasswordRule,
  validatePhone,
} from '../../utils/validation';
import { User as UserIcon, Building, Mail, CheckCircle2, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company || '');
  const [phone, setPhone] = useState(parsePhone(user?.phone).number);
  const [phoneIso, setPhoneIso] = useState(parsePhone(user?.phone).iso);
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCompany(user.company || '');
      const parsed = parsePhone(user.phone);
      setPhone(parsed.number);
      setPhoneIso(parsed.iso);
      setEmail(user.email);
    }
    setErrors({});
    setSuccessMessage(null);
  }, [user, isOpen]);

  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const validateDetails = (): boolean => {
    const errs: Record<string, string> = {};

    const nameErr = validateName(name.trimEnd());
    if (nameErr) errs.name = nameErr;

    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;

    const companyErr = validateCompany(company.trimEnd());
    if (companyErr) errs.company = companyErr;

    const phoneErr = validatePhone(phoneIso, phone);
    if (phoneErr) errs.phone = phoneErr;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = 'Current Password is required.';
    }

    const newPassErr = validatePasswordRule(newPassword);
    if (newPassErr) errs.newPassword = newPassErr;
    else if (newPassword === currentPassword) {
      errs.newPassword = 'New password must be different from the current password.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setErrors({});
    const result = await dispatch(
      updateProfileThunk({
        name: name.trimEnd(),
        email: email.trim().toLowerCase(),
        company: company.trimEnd(),
        phone: formatPhone(phoneIso, phone),
      })
    );

    if (updateProfileThunk.fulfilled.match(result)) {
      setSuccessMessage('Profile details updated successfully!');
      setTimeout(() => { setSuccessMessage(null); onClose(); }, 1200);
    } else {
      setErrors({ api: result.payload as string || 'Failed to update profile.' });
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    const result = await dispatch(
      changePasswordThunk({ currentPassword, newPassword })
    );

    if (changePasswordThunk.fulfilled.match(result)) {
      setCurrentPassword('');
      setNewPassword('');
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => { setSuccessMessage(null); onClose(); }, 1200);
    } else {
      setErrors({ currentPassword: result.payload as string || 'Failed to change password.' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile Settings"
      description="Manage your personal details, workspace company, and account security"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {successMessage ? (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> {successMessage}
            </span>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={activeTab === 'details' ? handleSaveDetails : handleSavePassword}
            >
              {activeTab === 'details' ? 'Save Profile' : 'Update Password'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            {getInitials(name || user?.name || '')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-base">
                {name || user?.name || 'User'}
              </h4>
              <Badge role={user?.role} size="sm" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {email || user?.email}
            </p>
            {company && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {company}
              </p>
            )}
          </div>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('details');
              setErrors({});
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Personal Details
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrors({});
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Password Change
          </button>
        </div>

        {activeTab === 'details' ? (
          <form className="space-y-4" onSubmit={handleSaveDetails} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => {
                  setName(sanitizeName(e.target.value));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                error={errors.name}
                leftIcon={<UserIcon className="w-4 h-4" />}
                required
              />
              <Input
                label="Work Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                error={errors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={company}
                maxLength={COMPANY_MAX}
                error={errors.company}
                onChange={(e) => {
                  setCompany(sanitizeCompany(e.target.value));
                  if (errors.company) setErrors((prev) => ({ ...prev, company: '' }));
                }}
                leftIcon={<Building className="w-4 h-4" />}
                placeholder="Acme Corp"
              />
              <PhoneInput
                id="profile-phone"
                label="Phone Number"
                countryIso={phoneIso}
                number={phone}
                onChange={(iso, num) => {
                  setPhoneIso(iso);
                  setPhone(num);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                error={errors.phone}
              />
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSavePassword} noValidate>
            <div className="relative">
              <Input
                label="Current Password"
                type={showCurrentPass ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: '' }));
                }}
                error={errors.currentPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="focus:outline-none hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            <div>
              <Input
                label="New Password"
                type={showNewPass ? 'text' : 'password'}
                placeholder="8-20 characters"
                maxLength={PASSWORD_MAX}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(sanitizePassword(e.target.value));
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                error={errors.newPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="focus:outline-none hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {PASSWORD_HINT}
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
};
