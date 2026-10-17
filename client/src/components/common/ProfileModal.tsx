import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateProfileThunk, changePasswordThunk } from '../../store/slices/authSlice';
import { userApi, ApiError } from '../../services/api';
import { User as UserIcon, Building, Phone, Mail, CheckCircle2, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

  // Details state
  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Errors & Feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setCompany(user.company || '');
      setPhone(user.phone || '');
      setEmail(user.email);
    }
    setErrors({});
    setSuccessMessage(null);
  }, [user, isOpen]);

  // Generate Initials from Name
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const validateDetails = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Full Name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Full Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = 'Email Address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (phone.trim() && !/^[+0-9()\s-]{7,20}$/.test(phone.trim())) {
      errs.phone = 'Please enter a valid phone number.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = 'Current Password is required.';
    }

    if (!newPassword) {
      errs.newPassword = 'New Password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'New Password must be at least 8 characters long.';
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      errs.newPassword = 'New Password must include both letters and numbers.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm New Password is required.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
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
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
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
      setConfirmPassword('');
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
        {/* User Card Header - Displayed dynamically based on Name */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('details');
              setErrors({});
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
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
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Password Change
          </button>
        </div>

        {activeTab === 'details' ? (
          <form className="space-y-4" onSubmit={handleSaveDetails}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
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
                onChange={(e) => setCompany(e.target.value)}
                leftIcon={<Building className="w-4 h-4" />}
                placeholder="Acme Corp"
              />
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                error={errors.phone}
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSavePassword}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type={showNewPass ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
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
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                error={errors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Password must be at least 8 characters and include a mixture of letters and numbers.
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
};
