import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AdminSubscriptionRecord, AdminMetrics, SubscriptionStatus } from '../../types';
import { subscriptionApi, ApiError } from '../../services/api';

interface AdminState {
  subscriptions: AdminSubscriptionRecord[];
  metrics: AdminMetrics;
  searchTerm: string;
  statusFilter: SubscriptionStatus | 'all';
  tierFilter: 'starter' | 'pro' | 'enterprise' | 'all';
  selectedSubscription: AdminSubscriptionRecord | null;
  isLoading: boolean;
  notificationMessage: string | null;
}

const initialMetrics: AdminMetrics = {
  totalRevenueMonthly: 0,
  totalSubscribers: 0,
  activeSubscriptions: 0,
  churnRatePercent: 0,
  monthlyGrowthPercent: 12.5,
  mrr: 0,
};

const initialState: AdminState = {
  subscriptions: [],
  metrics: initialMetrics,
  searchTerm: '',
  statusFilter: 'all',
  tierFilter: 'all',
  selectedSubscription: null,
  isLoading: false,
  notificationMessage: null,
};

// ─── Async Thunk: Fetch Subscribers from Backend ──────────────────────────────
export const fetchAdminSubscriptionsThunk = createAsyncThunk(
  'admin/fetchSubscriptions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await subscriptionApi.getAdminSubscribers();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to fetch subscribers');
    }
  }
);

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<SubscriptionStatus | 'all'>) => {
      state.statusFilter = action.payload;
    },
    setTierFilter: (state, action: PayloadAction<'starter' | 'pro' | 'enterprise' | 'all'>) => {
      state.tierFilter = action.payload;
    },
    setSelectedSubscription: (state, action: PayloadAction<AdminSubscriptionRecord | null>) => {
      state.selectedSubscription = action.payload;
    },
    clearAdminNotification: (state) => {
      state.notificationMessage = null;
    },
    updateAdminSubscriptionStatus: (
      state,
      action: PayloadAction<{ id: string; status: SubscriptionStatus }>
    ) => {
      const sub = state.subscriptions.find((s) => s.id === action.payload.id || s._id === action.payload.id);
      if (sub) {
        sub.status = action.payload.status;
        if (action.payload.status === 'cancelled') {
          sub.cancelAtPeriodEnd = true;
        } else {
          sub.cancelAtPeriodEnd = false;
        }
        if (state.selectedSubscription?.id === action.payload.id) {
          state.selectedSubscription.status = action.payload.status;
        }
        state.notificationMessage = `Subscription ${sub.id || sub._id} status updated to ${action.payload.status}`;
      }
    },
    cancelAdminSubscription: (state, action: PayloadAction<string>) => {
      const sub = state.subscriptions.find((s) => s.id === action.payload || s._id === action.payload);
      if (sub) {
        sub.status = 'cancelled';
        sub.cancelAtPeriodEnd = true;
        if (state.selectedSubscription?.id === action.payload) {
          state.selectedSubscription.status = 'cancelled';
          state.selectedSubscription.cancelAtPeriodEnd = true;
        }
        state.notificationMessage = `Subscription ${sub.id || sub._id} cancelled`;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminSubscriptionsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminSubscriptionsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const rawSubs = action.payload.subscribers || [];
        state.subscriptions = rawSubs.map((s: any) => ({
          _id: s._id,
          id: s._id,
          tier: s.planId?.tier || 'pro',
          scheduleType: s.scheduleType,
          userId: s.userId,
          user: s.userId
            ? {
                id: s.userId._id || s.userId.id,
                name: s.userId.name,
                email: s.userId.email,
                company: s.userId.company || '',
              }
            : { id: '', name: 'Unknown User', email: '', company: '' },
          planId: s.planId,
          planName: s.planId?.name || 'Standard Plan',
          status: s.status,
          billingCycle: s.billingCycle,
          price: s.price,
          amount: s.price,
          startDate: s.startDate,
          endDate: s.endDate,
          nextBillingDate: s.endDate,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
          cardId: s.cardId,
          createdAt: s.createdAt,
        }));

        const m = action.payload.metrics || {};
        state.metrics = {
          totalRevenueMonthly: m.mrr || 0,
          totalSubscribers: m.totalSubscribers || 0,
          activeSubscriptions: m.activeCount || 0,
          activeCount: m.activeCount || 0,
          scheduledCount: m.scheduledCount || 0,
          cancelledCount: m.cancelledCount || 0,
          churnRatePercent: m.totalSubscribers ? Math.round((m.cancelledCount / m.totalSubscribers) * 100) : 0,
          monthlyGrowthPercent: 14.8,
          mrr: m.mrr || 0,
        };
      })
      .addCase(fetchAdminSubscriptionsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.notificationMessage = action.payload as string;
      });
  },
});

export const {
  setSearchTerm,
  setStatusFilter,
  setTierFilter,
  setSelectedSubscription,
  clearAdminNotification,
  updateAdminSubscriptionStatus,
  cancelAdminSubscription,
} = adminSlice.actions;

export default adminSlice.reducer;
