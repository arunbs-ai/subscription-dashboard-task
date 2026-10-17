import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Archive,
  RotateCcw,
  Sparkles,
  Package,
  History,
  Clock,
  ArrowRight,
  Loader2,
  Tag,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchAdminPlans,
  createPlanThunk,
  updatePlanThunk,
  deletePlanThunk,
  restorePlanThunk,
  toggleActivePlanThunk,
  clearPlanNotification,
} from '../../store/slices/planSlice';
import { plansApi } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Plan, PlanAuditLog } from '../../types';

export const AdminPlansManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { plans, adminNotification, isLoading } = useAppSelector((state) => state.plans);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');

  // Add / Edit Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    planId?: string;
  }>({
    isOpen: false,
    mode: 'add',
  });

  const [formName, setFormName] = useState('');
  const [formTier, setFormTier] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [formDescription, setFormDescription] = useState('');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState(29);
  const [formYearlyPrice, setFormYearlyPrice] = useState(290);
  const [formFeatures, setFormFeatures] = useState('');
  const [formApiLimit, setFormApiLimit] = useState(50000);
  const [formSeatsLimit, setFormSeatsLimit] = useState(10);
  const [formStorageLimit, setFormStorageLimit] = useState(25);
  const [formPopular, setFormPopular] = useState(false);
  const [formAuditNote, setFormAuditNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audit History Modal state
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    planName: string;
    auditLogs: PlanAuditLog[];
    isLoading: boolean;
  }>({
    isOpen: false,
    planName: '',
    auditLogs: [],
    isLoading: false,
  });

  // Fetch admin plans on mount
  useEffect(() => {
    dispatch(fetchAdminPlans(true));
  }, [dispatch]);

  // Filter plans
  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? p.isActive && !p.isDeleted
        : !p.isActive || p.isDeleted;

    const matchesTier = tierFilter === 'all' ? true : p.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const activeCount = plans.filter((p) => p.isActive && !p.isDeleted).length;
  const archivedCount = plans.filter((p) => !p.isActive || p.isDeleted).length;

  const handleOpenAdd = () => {
    setFormName('');
    setFormTier('starter');
    setFormDescription('');
    setFormMonthlyPrice(29);
    setFormYearlyPrice(290);
    setFormFeatures('Up to 10 Team Members\n50,000 API Requests/month\n25 GB Cloud Storage\nStandard SLA Support');
    setFormApiLimit(50000);
    setFormSeatsLimit(10);
    setFormStorageLimit(25);
    setFormPopular(false);
    setFormAuditNote('');
    setErrors({});
    setModalState({ isOpen: true, mode: 'add' });
  };

  const handleOpenEdit = (plan: Plan) => {
    setFormName(plan.name);
    setFormTier((plan.tier as 'starter' | 'pro' | 'enterprise') || 'starter');
    setFormDescription(plan.description);
    setFormMonthlyPrice(plan.monthlyPrice);
    setFormYearlyPrice(plan.yearlyPrice);
    setFormFeatures(
      plan.features
        .map((f) => (typeof f === 'string' ? f : f.label))
        .join('\n')
    );
    setFormApiLimit(plan.limits?.apiRequests ?? 50000);
    setFormSeatsLimit(plan.limits?.teamMembers ?? plan.maxUsers ?? 10);
    setFormStorageLimit(plan.limits?.storageGB ?? plan.storageGB ?? 25);
    setFormPopular(Boolean(plan.popular || plan.isFeatured));
    setFormAuditNote('');
    setErrors({});
    setModalState({ isOpen: true, mode: 'edit', planId: plan._id || plan.id });
  };

  const handleOpenAudit = async (plan: Plan) => {
    const id = plan._id || plan.id;
    if (!id) return;
    setAuditModal({
      isOpen: true,
      planName: plan.name,
      auditLogs: [],
      isLoading: true,
    });
    try {
      const res = await plansApi.admin.getAuditHistory(id);
      setAuditModal({
        isOpen: true,
        planName: res.data.planName || plan.name,
        auditLogs: res.data.auditHistory || [],
        isLoading: false,
      });
    } catch {
      setAuditModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!formName.trim()) errs.name = 'Plan Name is required.';
    if (!formDescription.trim()) errs.description = 'Plan Description is required.';
    if (formMonthlyPrice <= 0) errs.monthlyPrice = 'Monthly price must be greater than $0.';
    if (formYearlyPrice <= 0) errs.yearlyPrice = 'Yearly price must be greater than $0.';
    if (!formFeatures.trim()) errs.features = 'Please provide at least one feature item.';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const featureList = formFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((label) => ({ label, included: true }));

    const planPayload: Record<string, unknown> = {
      name: formName.trim(),
      description: formDescription.trim(),
      monthlyPrice: Number(formMonthlyPrice),
      yearlyPrice: Number(formYearlyPrice),
      currency: 'USD',
      billingCycle: 'both',
      features: featureList,
      maxUsers: Number(formSeatsLimit),
      maxProjects: 999,
      storageGB: Number(formStorageLimit),
      isFeatured: formPopular,
      note: formAuditNote.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      if (modalState.mode === 'add') {
        await dispatch(createPlanThunk(planPayload)).unwrap();
      } else if (modalState.mode === 'edit' && modalState.planId) {
        await dispatch(updatePlanThunk({ id: modalState.planId, data: planPayload })).unwrap();
      }
      setModalState({ isOpen: false, mode: 'add' });
      dispatch(fetchAdminPlans(true));
    } catch (err: any) {
      setErrors({ form: typeof err === 'string' ? err : 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    const id = plan._id || plan.id;
    if (!id) return;
    const note = window.prompt(`Reason for archiving "${plan.name}" (recorded in audit log):`);
    await dispatch(deletePlanThunk({ id, note: note || undefined }));
    dispatch(fetchAdminPlans(true));
  };

  const handleRestore = async (plan: Plan) => {
    const id = plan._id || plan.id;
    if (!id) return;
    await dispatch(restorePlanThunk({ id, note: 'Plan restored from archive' }));
    dispatch(fetchAdminPlans(true));
  };

  const handleToggleActive = async (plan: Plan) => {
    const id = plan._id || plan.id;
    if (!id) return;
    await dispatch(toggleActivePlanThunk(id));
    dispatch(fetchAdminPlans(true));
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {adminNotification && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-sm text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <span>{adminNotification}</span>
          <button
            onClick={() => dispatch(clearPlanNotification())}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Plans & Pricing Management
            </h1>
            <Badge variant="indigo" size="sm">
              Admin Configuration
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure subscription tiers, pricing intervals, resource limits, soft-delete visibility, and full audit logs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create New Plan
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Configured Plans"
          value={plans.length}
          icon={<Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          subtitle="Total active and archived plans"
        />
        <StatCard
          title="Active Live Plans"
          value={activeCount}
          icon={<Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          subtitle="Visible to users on checkout"
        />
        <StatCard
          title="Archived (Soft Deleted)"
          value={archivedCount}
          icon={<Archive className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          subtitle="Hidden from user catalog"
        />
        <StatCard
          title="Audit Trail System"
          value="Enabled"
          icon={<History className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          subtitle="Old vs new value history"
        />
      </div>

      {/* Filter and search toolbar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search plans by title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active Live Only' },
                { value: 'archived', label: 'Archived Only' },
              ]}
              className="w-36 text-xs"
            />

            <Select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Tiers' },
                { value: 'starter', label: 'Starter' },
                { value: 'pro', label: 'Professional' },
                { value: 'enterprise', label: 'Enterprise' },
              ]}
              className="w-36 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Plans Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-6">Plan Info</th>
                <th className="py-3.5 px-6">Monthly Rate</th>
                <th className="py-3.5 px-6">Annual Rate</th>
                <th className="py-3.5 px-6">Limits & Specs</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-sm">
              {isLoading && plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading plans from server...
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No plans found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr
                    key={plan._id || plan.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Plan Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {plan.name}
                            </span>
                            <Badge variant="indigo" size="sm">
                              {(plan.tier || 'PLAN').toUpperCase()}
                            </Badge>
                            {(plan.popular || plan.isFeatured) && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                                Most Popular
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm line-clamp-1">
                            {plan.description}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400 mt-1 block">
                            ID: {plan._id || plan.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Monthly Price */}
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        ${plan.monthlyPrice}
                      </span>
                      <span className="text-slate-400 ml-1">/ mo</span>
                    </td>

                    {/* Annual Price */}
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        ${plan.yearlyPrice}
                      </span>
                      <span className="text-slate-400 ml-1">/ yr</span>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ${Math.round(plan.yearlyPrice / 12)}/mo billed yearly
                      </p>
                    </td>

                    {/* Limits */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <p>
                          <strong>{plan.limits?.teamMembers ?? plan.maxUsers ?? 10}</strong> Team Seats
                        </p>
                        <p>
                          <strong>{(plan.limits?.apiRequests ?? 50000).toLocaleString()}</strong> API Calls
                        </p>
                        <p>
                          <strong>{plan.limits?.storageGB ?? plan.storageGB ?? 25} GB</strong> Cloud Storage
                        </p>
                      </div>
                    </td>

                    {/* Visibility Status */}
                    <td className="py-4 px-6">
                      {plan.isDeleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <Archive className="w-3.5 h-3.5" />
                          Archived (Soft Deleted)
                        </span>
                      ) : plan.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(plan)}
                          title="Click to deactivate plan"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:opacity-80 transition-opacity"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active (Live for Users)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(plan)}
                          title="Click to activate plan"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:opacity-80 transition-opacity"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Inactive
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {/* Audit History button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAudit(plan)}
                        leftIcon={<History className="w-3.5 h-3.5 text-indigo-500" />}
                        title="View complete audit trail with old and new values"
                      >
                        Audit
                      </Button>

                      {/* Edit button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(plan)}
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>

                      {/* Soft Delete / Restore */}
                      {plan.isDeleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(plan)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          title="Restore soft-deleted plan back to catalog"
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(plan)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          leftIcon={<Archive className="w-3.5 h-3.5" />}
                          title="Soft delete (archive) plan with reason note"
                        >
                          Archive
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

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'add' })}
        title={modalState.mode === 'add' ? 'Create New Subscription Plan' : `Edit Plan — ${formName}`}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalState({ isOpen: false, mode: 'add' })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {modalState.mode === 'add' ? 'Publish Plan' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plan Name"
              placeholder="e.g. Scale Pro"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              error={errors.name}
              required
            />

            <Select
              label="Tier Classification"
              value={formTier}
              onChange={(e) => setFormTier(e.target.value as any)}
              options={[
                { value: 'starter', label: 'Starter' },
                { value: 'pro', label: 'Professional' },
                { value: 'enterprise', label: 'Enterprise' },
              ]}
            />
          </div>

          <Input
            label="Plan Description"
            placeholder="A short summary of who this plan is suitable for"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            error={errors.description}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Price ($ USD)"
              type="number"
              min={1}
              value={formMonthlyPrice}
              onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
              error={errors.monthlyPrice}
              required
            />
            <Input
              label="Yearly Price ($ USD)"
              type="number"
              min={1}
              value={formYearlyPrice}
              onChange={(e) => setFormYearlyPrice(Number(e.target.value))}
              error={errors.yearlyPrice}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="API Limit"
              type="number"
              value={formApiLimit}
              onChange={(e) => setFormApiLimit(Number(e.target.value))}
            />
            <Input
              label="Team Seats"
              type="number"
              value={formSeatsLimit}
              onChange={(e) => setFormSeatsLimit(Number(e.target.value))}
            />
            <Input
              label="Storage (GB)"
              type="number"
              value={formStorageLimit}
              onChange={(e) => setFormStorageLimit(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Features (One per line)
            </label>
            <textarea
              rows={4}
              value={formFeatures}
              onChange={(e) => setFormFeatures(e.target.value)}
              placeholder="Up to 10 Team Members&#10;50,000 API Requests/month&#10;Standard Support"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {errors.features && (
              <p className="text-xs text-rose-500">{errors.features}</p>
            )}
          </div>

          <Input
            label="Audit Log Note (Reason for change)"
            placeholder="e.g. Updated yearly price for Q4 promotion"
            value={formAuditNote}
            onChange={(e) => setFormAuditNote(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formPopular}
              onChange={(e) => setFormPopular(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Highlight as "Most Popular"</span>
          </label>
        </form>
      </Modal>

      {/* Plan Audit History Modal */}
      <Modal
        isOpen={auditModal.isOpen}
        onClose={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Audit History — ${auditModal.planName}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable audit logs maintained in the dedicated <span className="font-mono text-indigo-500 font-semibold">PLAN_AUDIT_LOGS</span> collection with tracked old and new values.
          </p>

          {auditModal.isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : auditModal.auditLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No audit records found for this plan.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {auditModal.auditLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.action === 'created'
                            ? 'emerald'
                            : log.action === 'deleted'
                            ? 'rose'
                            : log.action === 'restored'
                            ? 'amber'
                            : 'indigo'
                        }
                        size="sm"
                      >
                        {log.action.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.performedByName} ({log.performedByEmail})
                      </span>
                    </div>
                    <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {log.note && (
                    <p className="text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">
                      &ldquo;{log.note}&rdquo;
                    </p>
                  )}

                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        Modified Fields:
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {Object.entries(log.changes).map(([field, diff]) => (
                          <div
                            key={field}
                            className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 font-mono text-[11px]"
                          >
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {field}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 line-through">
                                {typeof diff.oldValue === 'object' ? JSON.stringify(diff.oldValue) : String(diff.oldValue ?? 'none')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                                {typeof diff.newValue === 'object' ? JSON.stringify(diff.newValue) : String(diff.newValue ?? 'none')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
