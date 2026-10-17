import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setBillingCycle, fetchActivePlans, fetchAdminPlans } from '../../store/slices/planSlice';
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
  const currentSubscription = useAppSelector(
    (state) => state.subscription.currentSubscription
  );

  // Fetch plans on mount
  useEffect(() => {
    if (role === 'admin') {
      dispatch(fetchAdminPlans(true));
    } else {
      dispatch(fetchActivePlans());
    }
  }, [dispatch, role]);

  // If user is Admin, render the dedicated Admin Plan Management Dashboard
  if (isAuthenticated && role === 'admin') {
    return <AdminPlansManagement />;
  }

  // USER / PUBLIC VIEW — only active, non-deleted plans
  const activePlans = plans.filter((p) => p.isActive && !p.isDeleted);


  const [confirmPlanModal, setConfirmPlanModal] = useState<{
    isOpen: boolean;
    planId: string;
    planName: string;
    price: number;
  }>({
    isOpen: false,
    planId: '',
    planName: '',
    price: 0,
  });

  const handlePlanClick = (plan: Plan) => {
    if (!isAuthenticated) {
      navigate(`/register?plan=${encodeURIComponent(plan.name)}`);
      return;
    }
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    setConfirmPlanModal({ isOpen: true, planId: plan._id || plan.id || '', planName: plan.name, price });
  };

  const handleConfirmSwitch = () => {
    setConfirmPlanModal((prev) => ({ ...prev, isOpen: false }));
    navigate('/dashboard');
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
      {/* Title & Description */}
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

        {/* Billing Interval Toggle (Monthly / Yearly) */}
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
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid for Users (Only Active Plans) */}
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
                  ? 'bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 md:-translate-y-2'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
              } p-7 sm:p-8`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
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

              {/* Price display */}
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

              {/* Action Button */}
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
                      ? 'Get Started Free'
                      : currentSubscription?.tier === 'enterprise'
                      ? `Downgrade to ${plan.name}`
                      : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>

              {/* Features list */}
              <div className="flex-1 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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

      {/* Feature Comparison Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 mb-12 overflow-x-auto shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
          Detailed Feature Comparison
        </h3>
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Resource & Capability
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-white">
                Starter ($19)
              </th>
              <th className="py-3 px-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Professional ($49)
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-white">
                Enterprise ($149)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                Team Member Seats
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Up to 5</td>
              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                Up to 15
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Unlimited</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                Monthly API Requests
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">25,000</td>
              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                100,000
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">1,000,000+</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                Cloud Storage
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">10 GB</td>
              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                50 GB
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">500 GB High Speed</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                Role-Based Access Control (RBAC)
              </td>
              <td className="py-3 px-4 text-slate-400">—</td>
              <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4 inline" /> Included
              </td>
              <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4 inline" /> Advanced Custom Roles
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                Support Level
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Community / Email</td>
              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                Priority 24/7 SLA
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                Dedicated Concierge Manager
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Plan Change */}
      <Modal
        isOpen={confirmPlanModal.isOpen}
        onClose={() => setConfirmPlanModal((prev) => ({ ...prev, isOpen: false }))}
        title="Confirm Plan Change"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmPlanModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmSwitch}>
              Confirm Switch to {confirmPlanModal.planName}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You are switching your subscription to the{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">
              {confirmPlanModal.planName}
            </strong>{' '}
            plan at{' '}
            <strong>
              ${confirmPlanModal.price}/{billingCycle === 'yearly' ? 'year' : 'month'}
            </strong>
            .
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Instant Resource Quota Upgrade
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your new quotas will become active immediately and your payment method on file will be updated.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
