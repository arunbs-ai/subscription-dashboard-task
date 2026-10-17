import React, { useState } from 'react';
import {
  Search,
  DollarSign,
  Users,
  CheckCircle,
  TrendingUp,
  Download,
  Eye,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setSearchTerm,
  setStatusFilter,
  setTierFilter,
  setSelectedSubscription,
  updateAdminSubscriptionStatus,
  cancelAdminSubscription,
  clearAdminNotification,
} from '../../store/slices/adminSlice';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { AdminSubscriptionRecord, SubscriptionStatus } from '../../types';

export const AdminSubscriptionsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    subscriptions,
    metrics,
    searchTerm,
    statusFilter,
    tierFilter,
    selectedSubscription,
    notificationMessage,
  } = useAppSelector((state) => state.admin);

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<SubscriptionStatus>('active');

  // Filter subscriptions according to search and dropdowns
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.user.company && sub.user.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : sub.status === statusFilter;

    const matchesTier =
      tierFilter === 'all' ? true : sub.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const handleInspect = (sub: AdminSubscriptionRecord) => {
    dispatch(setSelectedSubscription(sub));
    setEditingStatus(sub.status);
    setInspectModalOpen(true);
  };

  const handleSaveStatusChange = () => {
    if (selectedSubscription) {
      dispatch(
        updateAdminSubscriptionStatus({
          id: selectedSubscription.id,
          status: editingStatus,
        })
      );
      setInspectModalOpen(false);
    }
  };

  const handleCancelSub = (id: string) => {
    if (window.confirm(`Are you sure you want to cancel subscription ${id}?`)) {
      dispatch(cancelAdminSubscription(id));
    }
  };

  const exportCSV = () => {
    const headers = ['Subscription ID,Customer Name,Email,Company,Plan,Billing,Amount,Status,Next Billing Date\n'];
    const rows = filteredSubscriptions.map(
      (s) =>
        `${s.id},"${s.user.name}",${s.user.email},"${s.user.company || ''}",${s.planName},${s.billingCycle},$${s.amount},${s.status},${s.nextBillingDate}\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subpulse-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {notificationMessage && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-sm text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <span>{notificationMessage}</span>
          <button
            onClick={() => dispatch(clearAdminNotification())}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Customer Subscriptions
            </h1>
            <Badge variant="indigo" size="sm">
              User Registry
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global directory of registered customer accounts, subscription renewals, and administrative overrides
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${metrics.totalRevenueMonthly.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: metrics.monthlyGrowthPercent, isPositive: true, periodText: 'vs last month' }}
        />
        <StatCard
          title="Total Subscribers"
          value={metrics.totalSubscribers.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 8.4, isPositive: true, periodText: 'vs last month' }}
        />
        <StatCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions.toLocaleString()}
          icon={<CheckCircle className="w-5 h-5" />}
          subtitle="97.5% retention rate"
        />
        <StatCard
          title="Churn Rate"
          value={`${metrics.churnRatePercent}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 0.3, isPositive: true, periodText: '-0.3% improvement' }}
        />
      </div>

      {/* Subscription Table Card */}
      <Card noPadding>
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-full lg:w-96">
            <Input
              placeholder="Search by customer name, email, or ID..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-full sm:w-44">
              <Select
                value={statusFilter}
                onChange={(e) => dispatch(setStatusFilter(e.target.value as any))}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Trialing', value: 'trialing' },
                  { label: 'Past Due', value: 'past_due' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={tierFilter}
                onChange={(e) => dispatch(setTierFilter(e.target.value as any))}
                options={[
                  { label: 'All Tiers', value: 'all' },
                  { label: 'Starter', value: 'starter' },
                  { label: 'Professional', value: 'pro' },
                  { label: 'Enterprise', value: 'enterprise' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Customer
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Subscription Tier
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Billing & Amount
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400">
                  Next Renewal
                </th>
                <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No subscriptions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={sub.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={sub.user.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {sub.user.name}
                          </p>
                          <p className="text-[11px] text-slate-400">{sub.user.email}</p>
                          {sub.user.company && (
                            <p className="text-[10px] text-slate-500 font-medium">
                              {sub.user.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {sub.planName}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] text-slate-400">
                            {sub.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ${sub.amount}
                        </span>
                        <span className="text-slate-400 ml-1">
                          /{sub.billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 capitalize">
                        {sub.billingCycle} cycle
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <Badge status={sub.status} dot size="sm" />
                      {sub.cancelAtPeriodEnd && (
                        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                          Cancels at period end
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-mono">
                      {sub.nextBillingDate}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInspect(sub)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>
                      {sub.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelSub(sub.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Cancel subscription"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Admin Subscription Inspection / Edit Modal */}
      {selectedSubscription && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Subscription Details — ${selectedSubscription.id}`}
          description={`Customer: ${selectedSubscription.user.name} (${selectedSubscription.user.email})`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStatusChange}
              >
                Save Overrides
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Workspace Company</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSubscription.user.company || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Plan Tier</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {selectedSubscription.planName} ({selectedSubscription.tier})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Recurring Rate</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ${selectedSubscription.amount} / {selectedSubscription.billingCycle}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Next Billing Cycle</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSubscription.nextBillingDate}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Administrative Status Override
              </label>
              <Select
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value as SubscriptionStatus)}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Trialing', value: 'trialing' },
                  { label: 'Past Due', value: 'past_due' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Altering status will affect customer access permissions in accordance with RBAC rules.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
