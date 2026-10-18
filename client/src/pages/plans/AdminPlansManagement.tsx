import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Pencil,
  Archive,
  RotateCcw,
  Package,
  History,
  Clock,
  ArrowRight,
  Loader2,
  Tag,
  Star,
  Users,
  Zap,
  HardDrive,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
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
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Plan, PlanAuditLog } from '../../types';
import { toTitleCase } from '../../utils/text';

type Tier = 'starter' | 'pro' | 'enterprise';

const TIER_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const planId = (p: Plan) => p._id || p.id || '';
const isArchived = (p: Plan) => Boolean(p.isDeleted);
const isLive = (p: Plan) => p.isActive && !p.isDeleted;
const isHidden = (p: Plan) => !p.isActive && !p.isDeleted;

const emptyForm = {
  name: '',
  tier: 'starter' as Tier,
  description: '',
  monthlyPrice: 29,
  yearlyPrice: 290,
  features: 'Up to 10 Team Members\n50,000 API Requests / Month\n25 GB Cloud Storage\nStandard Support',
  apiLimit: 50000,
  seats: 10,
  storage: 25,
  popular: false,
  note: '',
};

export const AdminPlansManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { plans, notification, adminNotification, isLoading } = useAppSelector((s) => s.plans);
  const toast = notification || adminNotification;

  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  const [modal, setModal] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; id?: string }>({
    isOpen: false,
    mode: 'add',
  });
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [audit, setAudit] = useState<{
    isOpen: boolean;
    planName: string;
    logs: PlanAuditLog[];
    isLoading: boolean;
  }>({ isOpen: false, planName: '', logs: [], isLoading: false });

  useEffect(() => {
    dispatch(fetchAdminPlans(true));
  }, [dispatch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(clearPlanNotification()), 4000);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  const counts = useMemo(
    () => ({
      all: plans.length,
      live: plans.filter(isLive).length,
      hidden: plans.filter(isHidden).length,
    }),
    [plans]
  );

  const filteredPlans = plans;

  const setField = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setModal({ isOpen: true, mode: 'add' });
  };

  const openEdit = (plan: Plan) => {
    setForm({
      name: plan.name,
      tier: ((plan.tier as Tier) || 'starter'),
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      features: plan.features.map((f) => (typeof f === 'string' ? f : f.label)).join('\n'),
      apiLimit: plan.apiRequests ?? plan.limits?.apiRequests ?? 50000,
      seats: plan.limits?.teamMembers ?? plan.maxUsers ?? 10,
      storage: plan.limits?.storageGB ?? plan.storageGB ?? 25,
      popular: Boolean(plan.popular || plan.isFeatured),
      note: '',
    });
    setErrors({});
    setModal({ isOpen: true, mode: 'edit', id: planId(plan) });
  };

  const closeModal = () => setModal({ isOpen: false, mode: 'add' });

  const openAudit = async (plan: Plan) => {
    const id = planId(plan);
    if (!id) return;
    setAudit({ isOpen: true, planName: plan.name, logs: [], isLoading: true });
    try {
      const res = await plansApi.admin.getAuditHistory(id);
      setAudit({
        isOpen: true,
        planName: res.data.planName || plan.name,
        logs: res.data.auditHistory || [],
        isLoading: false,
      });
    } catch {
      setAudit((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Plan name must be at least 2 characters.';
    if (form.description.trim().length < 5) errs.description = 'Description must be at least 5 characters.';
    if (!(form.monthlyPrice > 0)) errs.monthlyPrice = 'Monthly price must be greater than 0.';
    if (!(form.yearlyPrice > 0)) errs.yearlyPrice = 'Yearly price must be greater than 0.';
    if (form.seats < 1) errs.seats = 'At least 1 seat.';
    if (form.apiLimit < 0) errs.apiLimit = 'Cannot be negative.';
    if (form.storage < 0) errs.storage = 'Cannot be negative.';
    const featureList = form.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((label) => ({ label, included: true }));
    if (featureList.length === 0) errs.features = 'Add at least one feature (one per line).';

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      tier: form.tier,
      description: form.description.trim(),
      monthlyPrice: Number(form.monthlyPrice),
      yearlyPrice: Number(form.yearlyPrice),
      currency: 'USD',
      billingCycle: 'both',
      features: featureList,
      apiRequests: Number(form.apiLimit),
      maxUsers: Number(form.seats),
      maxProjects: 999,
      storageGB: Number(form.storage),
      isFeatured: form.popular,
      note: form.note.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      if (modal.mode === 'add') {
        await dispatch(createPlanThunk(payload)).unwrap();
      } else if (modal.id) {
        await dispatch(updatePlanThunk({ id: modal.id, data: payload })).unwrap();
      }
      closeModal();
      dispatch(fetchAdminPlans(true));
    } catch (err: any) {
      setErrors({ form: typeof err === 'string' ? err : 'Operation failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (plan: Plan) => {
    await dispatch(toggleActivePlanThunk(planId(plan)));
    dispatch(fetchAdminPlans(true));
  };

  const yearlySaving = (p: { monthlyPrice: number; yearlyPrice: number }) => {
    const full = p.monthlyPrice * 12;
    return full > 0 && p.yearlyPrice < full ? Math.round((1 - p.yearlyPrice / full) * 100) : 0;
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 shadow-lg flex items-start gap-2.5 text-sm text-slate-800 dark:text-slate-100 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
          <span className="flex-1">{toast}</span>
          <button
            onClick={() => dispatch(clearPlanNotification())}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plans & Prices Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create plans, set prices and limits, control what customers see, and review every change.
          </p>
        </div>
        <Button variant="primary" onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Plans', value: counts.all, icon: Layers, tone: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50' },
          { label: 'Live For Customers', value: counts.live, icon: Eye, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Hidden', value: counts.hidden, icon: EyeOff, tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading && plans.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
          Loading plans...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No plans created yet</p>
          <p className="text-xs text-slate-400 mt-1">Click Create Plan to add your first plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const archived = isArchived(plan);
            const live = isLive(plan);
            const saving = yearlySaving(plan);
            const featureLabels = plan.features.map((f) => (typeof f === 'string' ? f : f.label));
            return (
              <div
                key={planId(plan)}
                className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-shadow hover:shadow-md ${
                  archived
                    ? 'border-slate-200 dark:border-slate-800 opacity-75'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="p-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{plan.name}</h3>
                        <Badge variant="indigo" size="sm">
                          {toTitleCase(plan.tier || 'plan')}
                        </Badge>
                        {(plan.popular || plan.isFeatured) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                            <Star className="w-3 h-3" /> Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                        {plan.description}
                      </p>
                    </div>

                    {archived ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Archive className="w-3 h-3" /> Archived
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={live}
                        onClick={() => handleToggle(plan)}
                        title={live ? 'Live for customers. Click to hide.' : 'Hidden from customers. Click to publish.'}
                        className="shrink-0 flex flex-col items-center gap-1"
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                            live ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              live ? 'left-[1.1rem]' : 'left-0.5'
                            }`}
                          />
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {live ? 'Live' : 'Hidden'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Monthly</p>
                      <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.monthlyPrice}
                        <span className="text-xs font-medium text-slate-400"> / Mo</span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Yearly
                        {saving > 0 && (
                          <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Save {saving}%
                          </span>
                        )}
                      </p>
                      <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.yearlyPrice}
                        <span className="text-xs font-medium text-slate-400"> / Yr</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40">
                      <Users className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      {plan.limits?.teamMembers ?? plan.maxUsers ?? 10} Seats
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40">
                      <Zap className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      {(plan.apiRequests ?? plan.limits?.apiRequests ?? 50000).toLocaleString()} API Calls
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40">
                      <HardDrive className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      {plan.limits?.storageGB ?? plan.storageGB ?? 25} GB
                    </span>
                  </div>
                </div>

                <ul className="px-5 pb-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 flex-1">
                  {featureLabels.slice(0, 4).map((label, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{label}</span>
                    </li>
                  ))}
                  {featureLabels.length > 4 && (
                    <li className="text-[11px] text-slate-400 pl-5">+{featureLabels.length - 4} more features</li>
                  )}
                </ul>

                <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 rounded-b-2xl">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewPlan(plan)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    View
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openEdit(plan)}
                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAudit(plan)}
                    leftIcon={<History className="w-3.5 h-3.5" />}
                    title="View change history"
                  >
                    History
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.mode === 'add' ? 'Create Plan' : `Edit Plan: ${form.name}`}
        description="Fields marked with an asterisk are required."
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleSave()} isLoading={isSubmitting}>
              {modal.mode === 'add' ? 'Create Plan' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-6" noValidate>
          {errors.form && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errors.form}
            </div>
          )}

          <section className="space-y-4">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400">Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Plan Name *"
                  placeholder="e.g. Scale Pro"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  error={errors.name}
                  maxLength={100}
                />
              </div>
              <Select
                label="Tier"
                value={form.tier}
                onChange={(e) => setField('tier', e.target.value as Tier)}
                options={TIER_OPTIONS}
              />
            </div>
            <Input
              label="Description *"
              placeholder="A short summary of who this plan is for"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              error={errors.description}
              maxLength={500}
            />
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400">Pricing (USD)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monthly Price *"
                type="number"
                min={1}
                value={form.monthlyPrice}
                onChange={(e) => setField('monthlyPrice', Number(e.target.value))}
                error={errors.monthlyPrice}
                leftIcon={<span className="text-sm">$</span>}
              />
              <Input
                label="Yearly Price *"
                type="number"
                min={1}
                value={form.yearlyPrice}
                onChange={(e) => setField('yearlyPrice', Number(e.target.value))}
                error={errors.yearlyPrice}
                leftIcon={<span className="text-sm">$</span>}
                helperText={
                  yearlySaving(form) > 0
                    ? `Customers save ${yearlySaving(form)}% compared to paying monthly.`
                    : 'Yearly price is not lower than 12 months of monthly billing.'
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400">Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Team Seats"
                type="number"
                min={1}
                value={form.seats}
                onChange={(e) => setField('seats', Number(e.target.value))}
                error={errors.seats}
              />
              <Input
                label="API Requests / Month"
                type="number"
                min={0}
                value={form.apiLimit}
                onChange={(e) => setField('apiLimit', Number(e.target.value))}
                error={errors.apiLimit}
              />
              <Input
                label="Storage (GB)"
                type="number"
                min={0}
                value={form.storage}
                onChange={(e) => setField('storage', Number(e.target.value))}
                error={errors.storage}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400">Features</h4>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Feature List (One Per Line) *
              </label>
              <textarea
                rows={5}
                value={form.features}
                onChange={(e) => setField('features', e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {errors.features && <p className="text-xs text-rose-500 font-medium">{errors.features}</p>}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => setField('popular', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
              />
              Highlight As "Most Popular"
            </label>
          </section>

          <Input
            label="Change Note (Saved In History)"
            placeholder="e.g. Updated yearly price for Q4 promotion"
            value={form.note}
            onChange={(e) => setField('note', e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(viewPlan)}
        onClose={() => setViewPlan(null)}
        title={viewPlan?.name ?? 'Plan Details'}
        description={viewPlan?.description}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={() => setViewPlan(null)}>
              Close
            </Button>
            {viewPlan && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => {
                  const p = viewPlan;
                  setViewPlan(null);
                  openEdit(p);
                }}
              >
                Edit Plan
              </Button>
            )}
          </div>
        }
      >
        {viewPlan && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="indigo" size="sm">{toTitleCase(viewPlan.tier || 'plan')}</Badge>
              {isLive(viewPlan) ? (
                <Badge variant="emerald" size="sm" dot>Live For Customers</Badge>
              ) : isArchived(viewPlan) ? (
                <Badge variant="rose" size="sm" dot>Archived</Badge>
              ) : (
                <Badge variant="amber" size="sm" dot>Hidden</Badge>
              )}
              {(viewPlan.popular || viewPlan.isFeatured) && (
                <Badge variant="amber" size="sm">Most Popular</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly Price</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${viewPlan.monthlyPrice}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yearly Price
                  {yearlySaving(viewPlan) > 0 && (
                    <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Save {yearlySaving(viewPlan)}%
                    </span>
                  )}
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${viewPlan.yearlyPrice}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">Limits</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                  <Users className="w-4 h-4 mx-auto text-brand-600 dark:text-brand-400" />
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {viewPlan.limits?.teamMembers ?? viewPlan.maxUsers ?? 10}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">Team Seats</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                  <Zap className="w-4 h-4 mx-auto text-brand-600 dark:text-brand-400" />
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {(viewPlan.apiRequests ?? viewPlan.limits?.apiRequests ?? 50000).toLocaleString()}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">API Requests</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                  <HardDrive className="w-4 h-4 mx-auto text-brand-600 dark:text-brand-400" />
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {viewPlan.limits?.storageGB ?? viewPlan.storageGB ?? 25} GB
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">Storage</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">Features</h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {viewPlan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{typeof f === 'string' ? f : f.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p>Created: {viewPlan.createdAt ? new Date(viewPlan.createdAt).toLocaleString() : 'N/A'}</p>
              <p>Last Updated: {viewPlan.updatedAt ? new Date(viewPlan.updatedAt).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={audit.isOpen}
        onClose={() => setAudit((prev) => ({ ...prev, isOpen: false }))}
        title={`Change History: ${audit.planName}`}
        description="Every create, edit, archive and restore, with the old and new values."
        maxWidth="lg"
      >
        {audit.isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : audit.logs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No history found for this plan.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {audit.logs.map((log) => (
              <div
                key={log._id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                      {log.action === 'deleted' ? 'Archived' : toTitleCase(log.action)}
                    </Badge>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {log.performedByName}
                      <span className="font-normal text-slate-400"> ({log.performedByEmail})</span>
                    </span>
                  </div>
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
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
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-brand-500" />
                      Changed Fields
                    </p>
                    {Object.entries(log.changes).map(([field, diff]) => (
                      <div
                        key={field}
                        className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[11px]"
                      >
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{toTitleCase(field)}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 line-through">
                            {typeof diff.oldValue === 'object' ? JSON.stringify(diff.oldValue) : String(diff.oldValue ?? 'None')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                            {typeof diff.newValue === 'object' ? JSON.stringify(diff.newValue) : String(diff.newValue ?? 'None')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
