import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  UserSubscription,
  BillingCycle,
  SubscriptionStatus,
  UserCard,
  Invoice,
  AdminSubscriptionRecord,
  AdminMetrics,
} from '../../types';
import { subscriptionApi, cardApi, ApiError } from '../../services/api';
import { mockUserSubscription } from '../../data/mockData';

interface SubscriptionState {
  currentSubscription: UserSubscription | null;
  scheduledSubscription: UserSubscription | null;
  usage: {
    teamMembers: { used: number; limit: number };
    storageGB: { used: number; limit: number };
    projects: { used: number; limit: number };
    apiRequests?: { used: number; limit: number };
  } | null;
  invoices: Invoice[];
  cards: UserCard[];
  adminSubscribers: AdminSubscriptionRecord[];
  adminMetrics: AdminMetrics | null;
  isLoading: boolean;
  error: string | null;
  actionSuccessMessage: string | null;
}

const initialState: SubscriptionState = {
  currentSubscription: mockUserSubscription,
  scheduledSubscription: null,
  usage: mockUserSubscription.usage,
  invoices: mockUserSubscription.invoices,
  cards: [],
  adminSubscribers: [],
  adminMetrics: null,
  isLoading: false,
  error: null,
  actionSuccessMessage: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────
export const fetchMySubscription = createAsyncThunk(
  'subscription/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await subscriptionApi.getMy();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to fetch subscription');
    }
  }
);

export const purchaseSubscriptionThunk = createAsyncThunk(
  'subscription/purchase',
  async (
    payload: {
      planId: string;
      billingCycle?: 'monthly' | 'yearly';
      cardId?: string;
      cardDetails?: {
        holderName: string;
        brand?: string;
        cardNumber?: string;
        last4?: string;
        expMonth: number;
        expYear: number;
      };
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await subscriptionApi.purchase(payload);
      // Re-fetch fresh state after purchase
      dispatch(fetchMySubscription());
      return res;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Purchase failed');
    }
  }
);

export const cancelSubscriptionThunk = createAsyncThunk(
  'subscription/cancel',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await subscriptionApi.cancel();
      dispatch(fetchMySubscription());
      return res.message;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to cancel subscription');
    }
  }
);

export const reactivateSubscriptionThunk = createAsyncThunk(
  'subscription/reactivate',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await subscriptionApi.reactivate();
      dispatch(fetchMySubscription());
      return res.message;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to reactivate subscription');
    }
  }
);

export const fetchAdminSubscribers = createAsyncThunk(
  'subscription/fetchAdminSubscribers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await subscriptionApi.getAdminSubscribers();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to load subscribers');
    }
  }
);

export const fetchUserCards = createAsyncThunk(
  'subscription/fetchUserCards',
  async (_, { rejectWithValue }) => {
    try {
      const res = await cardApi.getMyCards();
      return res.data.cards as UserCard[];
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to load cards');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
export const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearNotification: (state) => {
      state.actionSuccessMessage = null;
      state.error = null;
    },
    // Backwards-compatible synchronous action
    cancelSubscription: (state) => {
      if (state.currentSubscription) {
        state.currentSubscription.cancelAtPeriodEnd = true;
        state.actionSuccessMessage = 'Subscription scheduled for cancellation at the end of billing period.';
      }
    },
    resumeSubscription: (state) => {
      if (state.currentSubscription) {
        state.currentSubscription.cancelAtPeriodEnd = false;
        state.currentSubscription.status = 'active';
        state.actionSuccessMessage = 'Subscription resumed successfully.';
      }
    },
    updatePaymentMethod: (
      state,
      action: PayloadAction<{ last4: string; brand: string; expMonth: number; expYear: number }>
    ) => {
      if (state.currentSubscription) {
        state.currentSubscription.paymentMethod = action.payload;
        state.actionSuccessMessage = 'Payment method updated successfully.';
      }
    },
    updateStatus: (state, action: PayloadAction<SubscriptionStatus>) => {
      if (state.currentSubscription) {
        state.currentSubscription.status = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchMySubscription
    builder
      .addCase(fetchMySubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMySubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        const { activeSubscription, scheduledSubscription, usage, invoices } = action.payload;

        if (activeSubscription) {
          const plan = activeSubscription.plan;
          state.currentSubscription = {
            _id: activeSubscription._id,
            id: activeSubscription._id,
            planId: plan?._id || activeSubscription.planId,
            planName: plan?.name || 'Active Plan',
            tier: plan?.tier || 'pro',
            status: activeSubscription.status,
            scheduleType: activeSubscription.scheduleType,
            billingCycle: activeSubscription.billingCycle,
            price: activeSubscription.price,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            currentPeriodStart: activeSubscription.startDate,
            currentPeriodEnd: activeSubscription.endDate,
            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
            plan: plan,
            cardId: activeSubscription.cardId,
            paymentMethod: activeSubscription.cardId
              ? {
                  brand: activeSubscription.cardId.brand || 'Visa',
                  last4: activeSubscription.cardId.last4 || '4242',
                  expMonth: activeSubscription.cardId.expMonth || 12,
                  expYear: activeSubscription.cardId.expYear || 2028,
                }
              : { brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2028 },
            usage: usage || state.usage,
            invoices: invoices || [],
          };
        } else {
          state.currentSubscription = null;
        }

        if (scheduledSubscription) {
          state.scheduledSubscription = {
            ...scheduledSubscription,
            planName: scheduledSubscription.plan?.name,
          };
        } else {
          state.scheduledSubscription = null;
        }

        if (usage) state.usage = usage;
        if (invoices) state.invoices = invoices;
      })
      .addCase(fetchMySubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // purchaseSubscriptionThunk
    builder
      .addCase(purchaseSubscriptionThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(purchaseSubscriptionThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccessMessage = action.payload.message || 'Subscription updated successfully.';
      })
      .addCase(purchaseSubscriptionThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // cancelSubscriptionThunk
    builder
      .addCase(cancelSubscriptionThunk.fulfilled, (state, action) => {
        if (state.currentSubscription) {
          state.currentSubscription.cancelAtPeriodEnd = true;
        }
        state.actionSuccessMessage = action.payload;
      })
      .addCase(cancelSubscriptionThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // reactivateSubscriptionThunk
    builder
      .addCase(reactivateSubscriptionThunk.fulfilled, (state, action) => {
        if (state.currentSubscription) {
          state.currentSubscription.cancelAtPeriodEnd = false;
        }
        state.actionSuccessMessage = action.payload;
      })
      .addCase(reactivateSubscriptionThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // fetchAdminSubscribers
    builder
      .addCase(fetchAdminSubscribers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminSubscribers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminSubscribers = action.payload.subscribers;
        state.adminMetrics = action.payload.metrics;
      })
      .addCase(fetchAdminSubscribers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchUserCards
    builder
      .addCase(fetchUserCards.fulfilled, (state, action) => {
        state.cards = action.payload;
      });
  },
});

export const {
  clearNotification,
  cancelSubscription,
  resumeSubscription,
  updatePaymentMethod,
  updateStatus,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
