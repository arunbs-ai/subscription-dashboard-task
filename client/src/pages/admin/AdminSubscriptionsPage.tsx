import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  DollarSign,
  Users,
  CheckCircle,
  CalendarClock,
  Download,
  Eye,
  Loader2,
  Building2,
  CreditCard,
  Mail,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchAdminSubscriptionsThunk } from '../../store/slices/adminSlice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { AdminSubscriptionRecord } from '../../types';
import { toTitleCase } from '../../utils/text';

const STATUS_STYLES: Record<string, string> = {
  active:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  scheduled:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  expired:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  cancelled:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

const StatusPill: React.FC<{ status: string; cancelling?: boolean }> = ({ status, cancelling }) => (
  <div className="flex flex-col items-start gap-1">
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        STATUS_STYLES[status] || STATUS_STYLES.expired
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {toTitleCase(status)}
    </span>
    {cancelling && status !== 'cancelled' && (
      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Cancels At Period End</span>
    )}
  </div>
);

const initials = (name: string) => {
  const parts = (name || 'U').trim().split(/\s+/);
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const fmtDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

export const AdminSubscriptionsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { subscriptions, metrics, isLoading } = useAppSelector((state) => state.admin);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selected, setSelected] = useState<AdminSubscriptionRecord | null>(null);

  useEffect(() => {
    dispatch(fetchAdminSubscriptionsThunk());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subscriptions.filter((sub) => {
      const matchesSearch =
        !q ||
        sub.user.name.toLowerCase().includes(q) ||
        sub.user.email.toLowerCase().includes(q) ||
        sub.id.toLowerCase().includes(q) ||
        (sub.user.company || '').toLowerCase().includes(q) ||
        (sub.planName || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesTier = tierFilter === 'all' || sub.tier === tierFilter;
      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [subscriptions, searchTerm, statusFilter, tierFilter]);

  const exportCSV = () => {
    const header = 'Subscription ID,Customer Name,Email,Company,Plan,Billing,Amount,Status,Renewal Date\n';
    const rows = filtered.map(
      (s) =>
        `${s.id},"${s.user.name}",${s.user.email},"${s.user.company || ''}","${s.planName || ''}",${s.billingCycle},${s.amount ?? 0},${s.status},${s.nextBillingDate || ''}\n`
    );
    const blob = new Blob([header, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abs-nexora-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = [
    {
      label: 'Monthly Recurring Revenue',
      value: `$${(metrics.mrr ?? 0).toLocaleString()}`,
      icon: DollarSign,
      tone: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50',
    },
    {
      label: 'Total Customers',
      value: metrics.totalSubscribers.toLocaleString(),
      icon: Users,
      tone: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
    },
    {
      label: 'Active Subscriptions',
      value: (metrics.activeCount ?? 0).toLocaleString(),
      icon: CheckCircle,
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Scheduled Plans',
      value: (metrics.scheduledCount ?? 0).toLocaleString(),
      icon: CalendarClock,
      tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Customer Subscriptions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            See who is subscribed, which plan they are on, and when it renews.
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} leftIcon={<Download className="w-4 h-4" />}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none truncate">
                {value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="lg:w-96">
          <Input
            placeholder="Search by name, email, company or plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'Expired', value: 'expired' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            className="sm:w-44"
          />
          <Select
            aria-label="Filter by tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            options={[
              { label: 'All Tiers', value: 'all' },
              { label: 'Starter', value: 'starter' },
              { label: 'Professional', value: 'pro' },
              { label: 'Enterprise', value: 'enterprise' },
            ]}
            className="sm:w-44"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Plan</th>
                <th className="py-3.5 px-5">Billing</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Renews / Ends</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {isLoading && subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(sub.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{sub.user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{sub.planName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{toTitleCase(sub.tier || '')}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        ${sub.amount ?? 0}
                        <span className="font-normal text-slate-400">
                          {' '}
                          / {sub.billingCycle === 'yearly' ? 'Year' : 'Month'}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{toTitleCase(sub.billingCycle)} Billing</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusPill status={sub.status} cancelling={sub.cancelAtPeriodEnd} />
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{fmtDate(sub.endDate)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(sub)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30">
            Showing {filtered.length} Of {subscriptions.length} Subscriptions
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Subscription Details"
        description={selected ? `Reference: ${selected.id}` : undefined}
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-bold flex items-center justify-center">
                {initials(selected.user.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">{selected.user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {selected.user.email}
                </p>
                {selected.user.company && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> {selected.user.company}
                  </p>
                )}
              </div>
              <div className="ml-auto">
                <StatusPill status={selected.status} cancelling={selected.cancelAtPeriodEnd} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Plan', selected.planName || 'N/A'],
                ['Tier', toTitleCase(selected.tier || 'N/A')],
                ['Amount', `$${selected.amount ?? 0} / ${selected.billingCycle === 'yearly' ? 'Year' : 'Month'}`],
                ['Billing Cycle', toTitleCase(selected.billingCycle)],
                ['Start Date', fmtDate(selected.startDate)],
                ['Renews / Ends', fmtDate(selected.endDate)],
                ['Start Type', toTitleCase(selected.scheduleType || 'N/A')],
                ['Created', fmtDate(selected.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {selected.cardId ? (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selected.cardId.brand} Ending In {selected.cardId.last4}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Expires {String(selected.cardId.expMonth).padStart(2, '0')}/{String(selected.cardId.expYear).slice(-2)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No payment card on file.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
