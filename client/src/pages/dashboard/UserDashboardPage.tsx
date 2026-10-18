import React, { useEffect, useState } from 'react';
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
  History as HistoryIcon,
  Trash2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMySubscription,
  cancelSubscriptionThunk,
  reactivateSubscriptionThunk,
  fetchUserCards,
  fetchSubscriptionHistory,
  addCardThunk,
  setDefaultCardThunk,
  deleteCardThunk,
  clearNotification,
} from '../../store/slices/subscriptionSlice';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Modal } from '../../components/common/Modal';
import { CardForm, CardFormValues, emptyCard, toCardPayload, validateCardForm } from '../../components/common/CardForm';
import { toTitleCase } from '../../utils/text';
import { downloadReceiptPdf } from '../../utils/receiptPdf';

export const UserDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentSubscription, cards, history, invoices, actionSuccessMessage, isLoading } = useAppSelector(
    (state) => state.subscription
  );

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState<'period_end' | 'immediate'>('period_end');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [cardValues, setCardValues] = useState<CardFormValues>(emptyCard);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [isSavingCard, setIsSavingCard] = useState(false);

  useEffect(() => {
    dispatch(fetchMySubscription());
    dispatch(fetchUserCards());
    dispatch(fetchSubscriptionHistory());
  }, [dispatch]);

  const openCancelModal = (mode: 'period_end' | 'immediate' = 'period_end') => {
    setCancelMode(mode);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    await dispatch(
      cancelSubscriptionThunk({ immediately: cancelMode === 'immediate', reason: cancelReason.trim() })
    );
    setIsCancelling(false);
    setIsCancelModalOpen(false);
  };

  const handleCancelQueued = async (id: string) => {
    if (window.confirm('Cancel your upcoming plan? It will not start after your current plan ends.')) {
      await dispatch(cancelSubscriptionThunk({ subscriptionId: id }));
    }
  };

  const handleResume = () => {
    dispatch(reactivateSubscriptionThunk());
  };

  const openCardModal = () => {
    setCardValues({ ...emptyCard, holderName: '' });
    setCardErrors({});
    setIsPaymentModalOpen(true);
  };

  const handleSaveCard = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const errs = validateCardForm(cardValues);
    if (Object.keys(errs).length) {
      setCardErrors(errs);
      return;
    }
    setIsSavingCard(true);
    const result = await dispatch(addCardThunk({ ...toCardPayload(cardValues) }));
    setIsSavingCard(false);
    if (addCardThunk.fulfilled.match(result)) {
      setIsPaymentModalOpen(false);
    } else {
      setCardErrors({ cardNumber: (result.payload as string) || 'Could not save the card.' });
    }
  };

  const displayCard = cards.find((c) => c.isDefault) || cards[0];

  const paymentSection = (
        <Card
          title="Payment Method"
          subtitle="Primary card for automatic renewal"
        >
          {displayCard ? (
            <>
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-brand-950 text-white shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <CreditCard className="w-6 h-6 text-brand-300" />
                  <span className="text-xs font-bold tracking-wide text-brand-200">{displayCard.brand}</span>
                </div>
                <p className="font-mono text-sm tracking-widest text-slate-200">
                  •••• •••• •••• {displayCard.last4}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{displayCard.holderName}</span>
                  <span>
                    Exp: {String(displayCard.expMonth).padStart(2, '0')}/{String(displayCard.expYear).slice(-2)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setIsCardsModalOpen(true)}>
                  View Saved Cards ({cards.length})
                </Button>
                <Button variant="primary" size="sm" className="text-xs" onClick={openCardModal}>
                  Add New Card
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No Card Added Yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add a card to pay for your plan and enable automatic renewal.
              </p>
              <Button variant="primary" size="sm" onClick={openCardModal} leftIcon={<CreditCard className="w-4 h-4" />}>
                Add Card Details
              </Button>
            </div>
          )}
        </Card>
  );

  const downloadReceipt = (inv: (typeof invoices)[number]) =>
    downloadReceiptPdf(inv, { name: user?.name, email: user?.email, company: user?.company });

  const kindStyle: Record<string, string> = {
    new: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
    upgrade: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    downgrade: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  };

  const invoicesSection = (
    <Card
      title="Billing History & Invoices"
      subtitle="Every purchase, upgrade and downgrade on your account"
      noPadding
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
              {['Invoice ID', 'Date', 'Type', 'Description', 'Amount', 'Status'].map((h) => (
                <th key={h} className="py-3.5 px-5 font-semibold tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
              <th className="py-3.5 px-5 font-semibold tracking-wide text-slate-400 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-medium text-slate-900 dark:text-white">{inv.id}</td>
                  <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        kindStyle[inv.changeType || 'new']
                      }`}
                    >
                      {inv.changeType === 'upgrade' ? 'Upgrade' : inv.changeType === 'downgrade' ? 'Downgrade' : 'Purchase'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                    {inv.description || inv.planName || 'Subscription'}
                    {inv.billingCycle && (
                      <span className="text-slate-400"> ({toTitleCase(inv.billingCycle)})</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    ${inv.amount.toFixed(2)} {inv.currency}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Paid
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => downloadReceipt(inv)}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 font-medium hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const addCardModal = (
    <>
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Add Card Details"
        description="Add a debit or credit card for plan payments and renewals"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)} disabled={isSavingCard}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleSaveCard()} isLoading={isSavingCard}>
              Save Card
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCard} noValidate>
          <CardForm values={cardValues} errors={cardErrors} onChange={(v) => { setCardValues(v); setCardErrors({}); }} />
        </form>
      </Modal>

      <Modal
        isOpen={isCardsModalOpen}
        onClose={() => setIsCardsModalOpen(false)}
        title="Saved Cards"
        description={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'} added to your account`}
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCardsModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsCardsModalOpen(false);
                openCardModal();
              }}
            >
              Add New Card
            </Button>
          </>
        }
      >
        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No cards added yet.</p>
        ) : (
          <ul className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {cards.map((c) => (
              <li
                key={c._id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {c.brand} •••• {c.last4}
                    {c.isDefault && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.holderName} · Expires {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
                  </p>
                  {c.createdAt && (
                    <p className="text-slate-400 dark:text-slate-500">
                      Added {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                  {!c.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => dispatch(setDefaultCardThunk(c._id))}>
                      Make Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 dark:text-rose-400"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      if (window.confirm(`Remove the card ending in ${c.last4}?`)) {
                        dispatch(deleteCardThunk(c._id));
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Subscription History"
        description="Every plan you have bought, with its dates and cancellation details"
        maxWidth="2xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">You have not bought a plan yet.</p>
        ) : (
          <ul className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {history.map((h) => {
              const statusStyle: Record<string, string> = {
                active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                scheduled: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
                cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
                expired: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              };
              const fmt = (d: string) =>
                new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <li key={h.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{h.planName}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusStyle[h.status]}`}>
                        {toTitleCase(h.status)}
                      </span>
                      {h.changeType && h.changeType !== 'new' && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${kindStyle[h.changeType]}`}>
                          {h.changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                          {h.previousPlanName && ` From ${h.previousPlanName}`}
                        </span>
                      )}
                      {h.status === 'active' && h.cancelAtPeriodEnd && (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Cancels At Period End
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${h.price}
                      <span className="font-normal text-slate-400"> / {h.billingCycle === 'yearly' ? 'Year' : 'Month'}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-500 dark:text-slate-400">
                    <p>Bought: <span className="text-slate-700 dark:text-slate-300">{fmt(h.createdAt)}</span></p>
                    <p>Starts: <span className="text-slate-700 dark:text-slate-300">{fmt(h.startDate)}</span></p>
                    <p>{h.status === 'cancelled' && h.cancellationMode !== 'period_end' ? 'Ended' : 'Ends'}: <span className="text-slate-700 dark:text-slate-300">{fmt(h.endDate)}</span></p>
                    <p>Card: <span className="text-slate-700 dark:text-slate-300">{h.card ? `${h.card.brand} •••• ${h.card.last4}` : 'N/A'}</span></p>
                  </div>
                  {h.cancelledAt && (
                    <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-slate-600 dark:text-slate-300">
                      <p>
                        <span className="font-semibold">Cancelled On:</span> {fmt(h.cancelledAt)}
                        {h.cancellationMode && ` (${h.cancellationMode === 'immediate' ? 'Cancelled Immediately' : h.cancellationMode === 'plan_change' ? 'Replaced By Plan Change' : 'At Period End'})`}
                      </p>
                      {h.cancellationReason && (
                        <p className="mt-0.5"><span className="font-semibold">Reason:</span> {h.cancellationReason}</p>
                      )}
                    </div>
                  )}
                  {h.status === 'scheduled' && (
                    <div className="pt-1">
                      <Button variant="outline" size="sm" className="text-rose-600 dark:text-rose-400" onClick={() => handleCancelQueued(h.id)}>
                        Cancel Upcoming Plan
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );

  if (!currentSubscription) {
    if (isLoading) {
      return (
        <div className="py-24 text-center text-sm text-slate-400">Loading your subscription...</div>
      );
    }
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-sm text-emerald-800 dark:text-emerald-200">
            <span>{actionSuccessMessage}</span>
            <button onClick={() => dispatch(clearNotification())} className="text-xs font-medium hover:underline">
              Dismiss
            </button>
          </div>
        )}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">No Active Subscription Found</h2>
          <p className="text-sm text-slate-500 mt-2">
            Select a subscription tier to get started with your workspace.
          </p>
          <Link to="/plans" className="mt-4 inline-block">
            <Button variant="primary">Buy A Plan</Button>
          </Link>
          <Button variant="outline" className="mt-4 ml-2" onClick={() => setIsHistoryModalOpen(true)} leftIcon={<HistoryIcon className="w-4 h-4" />}>
            Subscription History
          </Button>
        </div>
        <div className="max-w-md mx-auto">{paymentSection}</div>
        {invoicesSection}
        {addCardModal}
      </div>
    );
  }

  const formattedPeriodEnd = new Date(
    currentSubscription.currentPeriodEnd
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
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
          <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(true)} leftIcon={<HistoryIcon className="w-4 h-4" />}>
            Subscription History
          </Button>
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
                  {toTitleCase(currentSubscription.billingCycle)}
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

          <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link to="/plans">
                <Button variant="primary" size="sm">
                  Change Tier
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={openCardModal}>
                {displayCard ? 'Add Another Card' : 'Add Card Details'}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {currentSubscription.cancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={handleResume}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                >
                  Reactivate Subscription
                </button>
              )}
              <button
                type="button"
                onClick={() => openCancelModal(currentSubscription.cancelAtPeriodEnd ? 'immediate' : 'period_end')}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline"
              >
                {currentSubscription.cancelAtPeriodEnd ? 'Cancel Immediately' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </Card>

        {paymentSection}
      </div>

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
              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
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
              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
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
              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
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
              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
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

      {invoicesSection}

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        description="You can cancel at any time. Choose when it should end."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
              Keep Subscription
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCancel} isLoading={isCancelling}>
              {cancelMode === 'immediate' ? 'Cancel Now' : 'Cancel At Period End'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          {([
            ['period_end', 'Cancel At Period End', `Keep full access until ${formattedPeriodEnd}. No further charges.`],
            ['immediate', 'Cancel Immediately', 'Access ends right now. No refund for the unused period.'],
          ] as const).map(([value, title, desc]) => (
            <label
              key={value}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                cancelMode === value
                  ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="cancel-mode"
                checked={cancelMode === value}
                onChange={() => setCancelMode(value)}
                className="mt-0.5 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                <span className="block mt-0.5">{desc}</span>
              </span>
            </label>
          ))}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you are leaving"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {cancelMode === 'period_end' && (
            <p>You can reactivate any time before {formattedPeriodEnd} to keep your plan.</p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            This cancellation is saved in your Subscription History.
          </p>
        </div>
      </Modal>

      {addCardModal}
    </div>
  );
};
