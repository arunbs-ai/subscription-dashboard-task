import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Plan, BillingCycle } from '../../types';
import { plansApi, ApiError } from '../../services/api';

interface PlanState {
  plans: Plan[];
  billingCycle: BillingCycle;
  selectedPlanId: string | null;
  isLoading: boolean;
  error: string | null;
  notification: string | null;
  adminNotification: string | null;
}

const initialState: PlanState = {
  plans: [],
  billingCycle: 'monthly',
  selectedPlanId: null,
  isLoading: false,
  error: null,
  notification: null,
  adminNotification: null,
};

export const fetchActivePlans = createAsyncThunk(
  'plans/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const res = await plansApi.getActivePlans();
      return res.data.plans as Plan[];
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to load plans');
    }
  }
);

export const fetchAdminPlans = createAsyncThunk(
  'plans/fetchAdmin',
  async (includeDeleted: boolean = false, { rejectWithValue }) => {
    try {
      const res = await plansApi.admin.getAll(includeDeleted);
      return res.data.plans as Plan[];
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to load plans');
    }
  }
);

export const createPlanThunk = createAsyncThunk(
  'plans/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const res = await plansApi.admin.create(data);
      return res.data.plan as Plan;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to create plan');
    }
  }
);

export const updatePlanThunk = createAsyncThunk(
  'plans/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const res = await plansApi.admin.update(id, data);
      return res.data.plan as Plan;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to update plan');
    }
  }
);

export const deletePlanThunk = createAsyncThunk(
  'plans/delete',
  async ({ id, note }: { id: string; note?: string }, { rejectWithValue }) => {
    try {
      await plansApi.admin.delete(id, note);
      return id;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to delete plan');
    }
  }
);

export const restorePlanThunk = createAsyncThunk(
  'plans/restore',
  async ({ id, note }: { id: string; note?: string }, { rejectWithValue }) => {
    try {
      const res = await plansApi.admin.restore(id, note);
      return res.data.plan as Plan;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to restore plan');
    }
  }
);

export const toggleActivePlanThunk = createAsyncThunk(
  'plans/toggleActive',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await plansApi.admin.toggleActive(id);
      return { id, isActive: res.data.isActive as boolean };
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Failed to toggle plan');
    }
  }
);

export const planSlice = createSlice({
  name: 'plans',
  initialState,
  reducers: {
    setBillingCycle: (state, action: PayloadAction<BillingCycle>) => {
      state.billingCycle = action.payload;
    },
    selectPlan: (state, action: PayloadAction<string>) => {
      state.selectedPlanId = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
      state.adminNotification = null;
    },
    clearPlanNotification: (state) => {
      state.notification = null;
      state.adminNotification = null;
    },
    clearError: (state) => { state.error = null; },
    addPlan: (state, action: PayloadAction<Plan>) => {
      state.plans.push(action.payload);
      state.adminNotification = `Plan "${action.payload.name}" created successfully.`;
    },
    updatePlan: (state, action: PayloadAction<Plan>) => {
      const id = action.payload._id || action.payload.id;
      const idx = state.plans.findIndex((p) => (p._id && p._id === id) || (p.id && p.id === id));
      if (idx !== -1) {
        state.plans[idx] = action.payload;
      }
      state.adminNotification = `Plan "${action.payload.name}" updated successfully.`;
    },
    softDeletePlan: (state, action: PayloadAction<string>) => {
      const plan = state.plans.find((p) => p._id === action.payload || p.id === action.payload);
      if (plan) {
        plan.isDeleted = true;
        plan.isActive = false;
        state.adminNotification = `Plan "${plan.name}" archived.`;
      }
    },
    restorePlan: (state, action: PayloadAction<string>) => {
      const plan = state.plans.find((p) => p._id === action.payload || p.id === action.payload);
      if (plan) {
        plan.isDeleted = false;
        plan.isActive = true;
        state.adminNotification = `Plan "${plan.name}" restored.`;
      }
    },
  },
  extraReducers: (builder) => {
    const setLoading = (state: PlanState) => { state.isLoading = true; state.error = null; };
    const setError = (state: PlanState, action: any) => {
      state.isLoading = false;
      state.error = action.payload as string;
    };

    builder
      .addCase(fetchActivePlans.pending, setLoading)
      .addCase(fetchActivePlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchActivePlans.rejected, setError);

    builder
      .addCase(fetchAdminPlans.pending, setLoading)
      .addCase(fetchAdminPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchAdminPlans.rejected, setError);

    builder
      .addCase(createPlanThunk.pending, setLoading)
      .addCase(createPlanThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans.push(action.payload);
        state.notification = `Plan "${action.payload.name}" created successfully.`;
      })
      .addCase(createPlanThunk.rejected, setError);

    builder
      .addCase(updatePlanThunk.pending, setLoading)
      .addCase(updatePlanThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.plans.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.plans[idx] = action.payload;
        state.notification = `Plan "${action.payload.name}" updated successfully.`;
      })
      .addCase(updatePlanThunk.rejected, setError);

    builder
      .addCase(deletePlanThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const plan = state.plans.find((p) => p._id === action.payload);
        if (plan) {
          plan.isDeleted = true;
          plan.isActive = false;
          state.notification = `Plan "${plan.name}" archived.`;
        }
      })
      .addCase(deletePlanThunk.rejected, setError);

    builder
      .addCase(restorePlanThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.plans.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.plans[idx] = action.payload;
        state.notification = `Plan "${action.payload.name}" restored.`;
      })
      .addCase(restorePlanThunk.rejected, setError);

    builder
      .addCase(toggleActivePlanThunk.fulfilled, (state, action) => {
        const plan = state.plans.find((p) => p._id === action.payload.id);
        if (plan) {
          plan.isActive = action.payload.isActive;
          state.notification = `Plan ${plan.isActive ? 'activated' : 'deactivated'}.`;
        }
      })
      .addCase(toggleActivePlanThunk.rejected, setError);
  },
});

export const {
  setBillingCycle,
  selectPlan,
  clearNotification,
  clearPlanNotification,
  clearError,
  addPlan,
  updatePlan,
  softDeletePlan,
  restorePlan,
} = planSlice.actions;
export default planSlice.reducer;
