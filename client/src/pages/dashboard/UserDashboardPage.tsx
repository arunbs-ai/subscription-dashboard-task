import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Zap,
  Users,
  HardDrive,
  FolderKanban,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Edit2,
  Clock,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  cancelSubscription,
  resumeSubscription,
  updatePaymentMethod,
  clearNotification,
} from '../../store/slices/subscriptionSlice';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

export const UserDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentSubscription, actionSuccessMessage } = useAppSelector(
    (state) => state.subscription
  );

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Payment form states
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExp, setCardExp] = useState('08/28');
  const [cardCvc, setCardCvc] = useState('•••');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Alex Morgan');

  if (!currentSubscription) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          No active subscription found
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Select a subscription tier to get started with your workspace.
        </p>
        <Link to="/plans" className="mt-4 inline-block">
          <Button variant="primary">Browse Available Plans</Button>
        </Link>
      </div>
    );
  }

  const handleConfirmCancel = () => {
    dispatch(cancelSubscription());
    setIsCancelModalOpen(false);
  };

  const handleResume = () => {
    dispatch(resumeSubscription());
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const last4 = cardNumber.replace(/\D/g, '').slice(-4) || '4242';
    const [monthStr, yearStr] = cardExp.split('/');
    const expMonth = parseInt(monthStr, 10) || 12;
    const expYear = parseInt('20' + (yearStr || '28'), 10);

    dispatch(
      updatePaymentMethod({
        brand: 'Visa',
        last4,
        expMonth,
        expYear,
      })
    );
    setIsPaymentModalOpen(false);
  };

  const formattedPeriodEnd = new Date(
    currentSubscription.currentPeriodEnd
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-sm text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => dispatch(clearNotification())}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Subscription Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your plan tier, monitor resource quotas, and review billing invoices
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/plans">
            <Button variant="outline" size="sm">
              Explore All Plans
            </Button>
          </Link>
          <Link to="/plans">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Cancellation Warning Banner if active */}
      {currentSubscription.cancelAtPeriodEnd && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                Your subscription is scheduled to cancel on {formattedPeriodEnd}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You will maintain full access until the current period concludes. No further charges will occur.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleResume}
            className="self-start sm:self-auto bg-amber-600 hover:bg-amber-700"
          >
            Resume Subscription
          </Button>
        </div>
      )}

      {/* Primary Current Plan Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2 relative overflow-hidden"
          title="Current Plan Details"
          subtitle={`Account Workspace: ${user?.company || 'Personal'}`}
          headerAction={
            <Badge status={currentSubscription.status} dot size="md" />
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {currentSubscription.planName}
                </h2>
                <Badge variant="indigo" size="sm">
                  {currentSubscription.billingCycle.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Renews automatically on{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {formattedPeriodEnd}
                </strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                ${currentSubscription.price}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                /{currentSubscription.billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                Auto-renewal active
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link to="/plans">
                <Button variant="primary" size="sm">
                  Change Tier
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Update Billing Method
              </Button>
            </div>

            {!currentSubscription.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline"
              >
                Cancel Subscription
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                Reactivate Subscription
              </button>
            )}
          </div>
        </Card>

        {/* Payment Method Card */}
        <Card
          title="Payment Method"
          subtitle="Primary card for automatic renewal"
          headerAction={
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Edit Card"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          }
        >
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <CreditCard className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                {currentSubscription.paymentMethod.brand}
              </span>
            </div>
            <p className="font-mono text-sm tracking-widest text-slate-200">
              •••• •••• •••• {currentSubscription.paymentMethod.last4}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{user?.name || 'Cardholder'}</span>
              <span>
                Exp:{' '}
                {String(currentSubscription.paymentMethod.expMonth).padStart(2, '0')}/
                {currentSubscription.paymentMethod.expYear.toString().slice(-2)}
              </span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Manage Payment Details
            </Button>
          </div>
        </Card>
      </div>

      {/* Quotas & Resource Usage Card */}
      <Card
        title="Resource Quota & Usage"
        subtitle="Live metrics tracking consumed limits against plan allowances"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                API Calls
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <ProgressBar
              value={currentSubscription.usage.apiRequests?.used ?? 0}
              max={currentSubscription.usage.apiRequests?.limit ?? 100000}
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Team Seats
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <ProgressBar
              value={currentSubscription.usage.teamMembers.used}
              max={currentSubscription.usage.teamMembers.limit}
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Cloud Storage
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <ProgressBar
              value={currentSubscription.usage.storageGB.used}
              max={currentSubscription.usage.storageGB.limit}
              unit="GB"
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Active Projects
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <ProgressBar
              value={currentSubscription.usage.projects.used}
              max={50}
              subLabel={`${currentSubscription.usage.projects.used} active`}
              showPercent={false}
            />
          </div>
        </div>
      </Card>

      {/* Invoices & Billing History Table */}
      <Card
        title="Billing History & Invoices"
        subtitle="Download tax receipts and review past transactions"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Invoice ID
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Billing Date
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Amount
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400 text-right">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {currentSubscription.invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 px-6 font-mono font-medium text-slate-900 dark:text-white">
                    {inv.id}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                    {new Date(inv.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                    ${inv.amount.toFixed(2)} {inv.currency}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Paid
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Downloading ${inv.id}.pdf receipt...`)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your active plan?"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Your plan will remain active until <strong>{formattedPeriodEnd}</strong>. After this date, your quota limits will revert to free tier limitations.
            </p>
          </div>
          <p>
            You won't be charged again. You can reactivate anytime before your period ends to keep your current pricing and configurations.
          </p>
        </div>
      </Modal>

      {/* Update Payment Method Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Update Payment Method"
        description="Add a new debit or credit card for automatic recurring billing"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdatePayment}
            >
              Save Payment Card
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          <Input
            label="Name on Card"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            required
          />
          <Input
            label="Card Number"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            leftIcon={<CreditCard className="w-4 h-4" />}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expiry (MM/YY)"
              value={cardExp}
              onChange={(e) => setCardExp(e.target.value)}
              placeholder="MM/YY"
              required
            />
            <Input
              label="CVC / CVV"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value)}
              placeholder="123"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
