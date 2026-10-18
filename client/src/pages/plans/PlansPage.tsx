import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setBillingCycle, fetchActivePlans, fetchAdminPlans } from '../../store/slices/planSlice';
import {
  purchaseSubscriptionThunk,
  fetchMySubscription,
  fetchUserCards,
} from '../../store/slices/subscriptionSlice';
import { CardForm, CardFormValues, emptyCard, toCardPayload, validateCardForm } from '../../components/common/CardForm';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Plan } from '../../types';
import { AdminPlansManagement } from './AdminPlansManagement';

export const PlansPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { plans, billingCycle, isLoading } = useAppSelector((state) => state.plans);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const role = user?.role;
  const { currentSubscription, cards } = useAppSelector(
    (state) => state.subscription
  );

  type ChangeKind = 'buy' | 'upgrade' | 'downgrade';
  const [confirmPlanModal, setConfirmPlanModal] = useState<{
    isOpen: boolean;
    plan: Plan | null;
    kind: ChangeKind;
    price: number;
  }>({ isOpen: false, plan: null, kind: 'buy', price: 0 });
  const [cardValues, setCardValues] = useState<CardFormValues>(emptyCard);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (role === 'admin') {
      dispatch(fetchAdminPlans(true));
    } else {
      dispatch(fetchActivePlans());
    }
  }, [dispatch, role]);

  useEffect(() => {
    if (isAuthenticated && role !== 'admin') {
      dispatch(fetchMySubscription());
      dispatch(fetchUserCards());
    }
  }, [dispatch, isAuthenticated, role]);

  if (isAuthenticated && role === 'admin') {
    return <AdminPlansManagement />;
  }

  const activePlans = plans.filter((p) => p.isActive && !p.isDeleted);

  const featureLabel = (f: Plan['features'][number]) => (typeof f === 'string' ? f : f.label);
  const planHasFeature = (plan: Plan, label: string) =>
    plan.features.some(
      (f) =>
        featureLabel(f).trim().toLowerCase() === label.trim().toLowerCase() &&
        (typeof f === 'string' || f.included !== false)
    );
  const specRows = [
    { label: 'Team Seats', value: (p: Plan) => String(p.limits?.teamMembers ?? p.maxUsers ?? '-') },
    {
      label: 'Monthly API Requests',
      value: (p: Plan) => (p.apiRequests ?? p.limits?.apiRequests)?.toLocaleString() ?? '-',
    },
    { label: 'Cloud Storage', value: (p: Plan) => `${p.limits?.storageGB ?? p.storageGB ?? '-'} GB` },
  ];
  const featureRows: string[] = [];
  activePlans.forEach((p) =>
    p.features.forEach((f) => {
      const label = featureLabel(f).trim();
      if (label && !featureRows.some((r) => r.toLowerCase() === label.toLowerCase())) featureRows.push(label);
    })
  );

  const hasActivePlan = Boolean(currentSubscription);
  const hasCard = cards.length > 0;
  const defaultCard = cards.find((c) => c.isDefault) || cards[0];
  const currentMonthly = currentSubscription?.plan?.monthlyPrice ?? currentSubscription?.price ?? 0;

  const getChangeKind = (plan: Plan): ChangeKind => {
    if (!hasActivePlan) return 'buy';
    return plan.monthlyPrice >= currentMonthly ? 'upgrade' : 'downgrade';
  };

  const kindLabel = (kind: ChangeKind) =>
    kind === 'buy' ? 'Buy Plan' : kind === 'upgrade' ? 'Upgrade' : 'Downgrade';

  const handlePlanClick = (plan: Plan) => {
    if (!isAuthenticated) {
      navigate(`/register?plan=${encodeURIComponent(plan.name)}`);
      return;
    }
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    setCardValues(emptyCard);
    setCardErrors({});
    setPurchaseError(null);
    setConfirmPlanModal({ isOpen: true, plan, kind: getChangeKind(plan), price });
  };

  const closeConfirm = () => setConfirmPlanModal((prev) => ({ ...prev, isOpen: false }));

  const handleConfirmSwitch = async () => {
    const plan = confirmPlanModal.plan;
    if (!plan) return;
    const planId = plan._id || plan.id || '';

    let cardDetails: ReturnType<typeof toCardPayload> | undefined;
    if (!hasCard) {
      const errs = validateCardForm(cardValues);
      if (Object.keys(errs).length) {
        setCardErrors(errs);
        return;
      }
      cardDetails = toCardPayload(cardValues);
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    const result = await dispatch(
      purchaseSubscriptionThunk({
        planId,
        billingCycle,
        ...(cardDetails ? { cardDetails } : { cardId: defaultCard?._id }),
      })
    );
    setIsPurchasing(false);
    if (purchaseSubscriptionThunk.fulfilled.match(result)) {
      closeConfirm();
      navigate('/dashboard');
    } else {
      setPurchaseError((result.payload as string) || 'Purchase failed. Please try again.');
    }
  };

  if (isLoading && plans.length === 0) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <Badge variant="indigo" className="mb-3">
          Flexible & Transparent Pricing
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Choose the plan designed for your growth
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400">
          Scale effortlessly from early startup to enterprise infrastructure. Switch or cancel whenever you need.
        </p>

        <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => dispatch(setBillingCycle('monthly'))}
            className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => dispatch(setBillingCycle('yearly'))}
            className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
        {activePlans.map((plan) => {
          const isCurrentPlan = isAuthenticated && currentSubscription?.planId === plan._id;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPricePerMonth =
            billingCycle === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;

          return (
            <div
              key={plan._id}
              className={`relative flex flex-col rounded-3xl transition-all duration-200 ${
                plan.isFeatured
                  ? 'bg-white dark:bg-slate-900 border-2 border-brand-500 shadow-xl shadow-brand-500/10 md:-translate-y-2'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
              } p-7 sm:p-8`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-600 to-brand-600 text-white shadow-md shadow-brand-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  {isCurrentPlan && (
                    <Badge variant="emerald" dot size="sm">
                      Current Plan
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[36px]">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    ${displayPricePerMonth}
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    / user / month
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {billingCycle === 'yearly'
                    ? `Billed annually at $${price}/year`
                    : 'Billed monthly, cancel anytime'}
                </p>
              </div>

              <div className="mb-8">
                {isCurrentPlan ? (
                  <Button
                    variant="secondary"
                    className="w-full cursor-default"
                    disabled
                  >
                    Active Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => handlePlanClick(plan)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {!isAuthenticated
                      ? 'Get Started'
                      : getChangeKind(plan) === 'buy'
                      ? `Buy ${plan.name}`
                      : `${kindLabel(getChangeKind(plan))} To ${plan.name}`}
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  Included in {plan.name}:
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  {plan.features.map((feature, idx) => {
                    const isObj = typeof feature === 'object' && feature !== null;
                    const included = isObj ? (feature as any).included !== false : true;
                    const label = isObj ? (feature as any).label : String(feature);
                    return (
                      <li key={idx} className="flex items-start gap-2.5">
                        {included ? (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <span className={!included ? 'text-slate-400 dark:text-slate-600 line-through' : ''}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {activePlans.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 mb-12 overflow-x-auto shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Detailed Feature Comparison
          </h3>
          <table className="w-full text-left border-collapse" style={{ minWidth: 220 + activePlans.length * 160 }}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold tracking-wide text-slate-400">
                  Resource & Capability
                </th>
                {activePlans.map((plan) => (
                  <th
                    key={plan._id || plan.id}
                    className={`py-3 px-4 text-xs font-bold ${
                      plan.isFeatured || plan.popular
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {plan.name}
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      ${billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                      {billingCycle === 'yearly' ? ' / Year' : ' / Month'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {specRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                  {activePlans.map((plan) => (
                    <td
                      key={plan._id || plan.id}
                      className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {row.value(plan)}
                    </td>
                  ))}
                </tr>
              ))}
              {featureRows.map((label) => (
                <tr key={label.toLowerCase()}>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{label}</td>
                  {activePlans.map((plan) => (
                    <td key={plan._id || plan.id} className="py-3 px-4">
                      {planHasFeature(plan, label) ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-4 h-4" /> Included
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">
                          <X className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={confirmPlanModal.isOpen}
        onClose={closeConfirm}
        title={
          confirmPlanModal.kind === 'buy'
            ? 'Confirm Purchase'
            : `Confirm ${kindLabel(confirmPlanModal.kind)}`
        }
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeConfirm} disabled={isPurchasing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmSwitch} isLoading={isPurchasing}>
              {confirmPlanModal.kind === 'buy'
                ? `Pay $${confirmPlanModal.price} & Buy`
                : `Confirm ${kindLabel(confirmPlanModal.kind)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {purchaseError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
              {purchaseError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {confirmPlanModal.kind === 'buy' ? 'You are buying the ' : 'You are switching to the '}
            <strong className="text-brand-600 dark:text-brand-400">{confirmPlanModal.plan?.name}</strong> plan at{' '}
            <strong>
              ${confirmPlanModal.price}/{billingCycle === 'yearly' ? 'year' : 'month'}
            </strong>
            .
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Starts Immediately
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasActivePlan
                ? `Your new plan is active as soon as you confirm. Your current ${currentSubscription?.planName || ''} plan is cancelled automatically and the change is saved in your billing history.`
                : 'Your quotas become active as soon as the payment is confirmed.'}
            </p>
          </div>

          {hasCard && defaultCard ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {defaultCard.brand} Ending In {defaultCard.last4}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Expires {String(defaultCard.expMonth).padStart(2, '0')}/{String(defaultCard.expYear).slice(-2)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add A Payment Card To Continue
              </p>
              <CardForm values={cardValues} errors={cardErrors} onChange={(v) => { setCardValues(v); setCardErrors({}); }} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
