import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  UserSubscription,
  BillingCycle,
  SubscriptionStatus,
  UserCard,
  Invoice,
  AdminSubscriptionRecord,
  AdminMetrics,
  SubscriptionHistoryItem,
} from '../../types';
import { subscriptionApi, cardApi, ApiError } from '../../services/api';

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
  history: SubscriptionHistoryItem[];
  adminSubscribers: AdminSubscriptionRecord[];
  adminMetrics: AdminMetrics | null;
  isLoading: boolean;
  error: string | null;
  actionSuccessMessage: string | null;
}

const initialState: SubscriptionState = {
  currentSubscription: null,
  scheduledSubscription: null,
  usage: null,
  invoices: [],
  cards: [],
  history: [],
  adminSubscribers: [],
  adminMetrics: null,
  isLoading: false,
  error: null,
  actionSuccessMessage: null,
};

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
      dispatch(fetchMySubscription());
      dispatch(fetchSubscriptionHistory());
      return res;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Purchase failed');
    }
  }
);

export const fetchSubscriptionHistory = createAsyncThunk(
  'subscription/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const res = await subscriptionApi.getHistory();
      return res.data.history as SubscriptionHistoryItem[];
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to load subscription history');
    }
  }
);

export const cancelSubscriptionThunk = createAsyncThunk(
  'subscription/cancel',
  async (
    payload: { immediately?: boolean; reason?: string; subscriptionId?: string } | undefined,
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await subscriptionApi.cancel(payload || {});
      await Promise.all([dispatch(fetchMySubscription()), dispatch(fetchSubscriptionHistory())]);
      return res.message as string;
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
      dispatch(fetchSubscriptionHistory());
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

export const addCardThunk = createAsyncThunk(
  'subscription/addCard',
  async (
    data: { holderName: string; brand?: string; last4: string; expMonth: number; expYear: number },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await cardApi.addCard(data);
      dispatch(fetchUserCards());
      return res.message as string;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to add card');
    }
  }
);

export const setDefaultCardThunk = createAsyncThunk(
  'subscription/setDefaultCard',
  async (cardId: string, { rejectWithValue, dispatch }) => {
    try {
      await cardApi.setDefault(cardId);
      dispatch(fetchUserCards());
      return 'Default card updated.';
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to update default card');
    }
  }
);

export const deleteCardThunk = createAsyncThunk(
  'subscription/deleteCard',
  async (cardId: string, { rejectWithValue, dispatch }) => {
    try {
      await cardApi.deleteCard(cardId);
      dispatch(fetchUserCards());
      return 'Card removed.';
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to remove card');
    }
  }
);

export const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearNotification: (state) => {
      state.actionSuccessMessage = null;
      state.error = null;
    },
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
            paymentMethod: activeSubscription.cardId?.last4
              ? {
                  brand: activeSubscription.cardId.brand || 'Card',
                  last4: activeSubscription.cardId.last4,
                  expMonth: activeSubscription.cardId.expMonth,
                  expYear: activeSubscription.cardId.expYear,
                }
              : null,
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

    builder
      .addCase(cancelSubscriptionThunk.fulfilled, (state, action) => {
        state.actionSuccessMessage = action.payload;
      })
      .addCase(cancelSubscriptionThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

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

    builder.addCase(fetchSubscriptionHistory.fulfilled, (state, action) => {
      state.history = action.payload;
    });

    builder.addCase(addCardThunk.fulfilled, (state, action) => {
      state.actionSuccessMessage = action.payload || 'Card added successfully.';
    });

    builder
      .addCase(setDefaultCardThunk.fulfilled, (state, action) => {
        state.actionSuccessMessage = action.payload;
      })
      .addCase(deleteCardThunk.fulfilled, (state, action) => {
        state.actionSuccessMessage = action.payload;
      })
      .addCase(deleteCardThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUserCards.fulfilled, (state, action) => {
        state.cards = action.payload;
      });

    builder.addMatcher(
      (action) => action.type === 'auth/logout/fulfilled' || action.type === 'auth/logout',
      () => initialState
    );
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
