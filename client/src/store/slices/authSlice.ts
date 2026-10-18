import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, Role } from '../../types';
import { authApi, userApi, TokenStorage, ApiError } from '../../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  role: Role;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  role: 'user',
  isLoading: false,
  isInitializing: !!TokenStorage.getAccess() || !!TokenStorage.getRefresh(),
  error: null,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.login(credentials.email, credentials.password);
      TokenStorage.set(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      return res.data.user as User;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Login failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    data: { name: string; email: string; password: string; company?: string; phone?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await authApi.register(data);
      TokenStorage.set(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      return res.data.user as User;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Registration failed');
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
  } catch (_) {
  } finally {
    TokenStorage.clear();
  }
});

export const getMeThunk = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.getMe();
    return res.data.user as User;
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 401) TokenStorage.clear();
    return rejectWithValue('Session expired');
  }
});

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (data: { name?: string; email?: string; company?: string; phone?: string }, { rejectWithValue }) => {
    try {
      const res = await userApi.updateProfile(data);
      return res.data.user as User;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Profile update failed');
    }
  }
);

export const changePasswordThunk = createAsyncThunk(
  'auth/changePassword',
  async (data: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await userApi.changePassword(data.currentPassword, data.newPassword);
      return true;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : 'Password change failed');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.role = action.payload.role || 'user';
    },
    logout: (state) => {
      TokenStorage.clear();
      state.user = null;
      state.isAuthenticated = false;
      state.role = 'user';
      state.error = null;
    },
    switchRole: (state, action: PayloadAction<Role>) => {
      state.role = action.payload;
      if (state.user) {
        state.user.role = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.role = action.payload.role || 'user';
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(registerThunk.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.role = action.payload.role || 'user';
        state.error = null;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.role = 'user';
      state.error = null;
    });

    builder
      .addCase(getMeThunk.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.role = action.payload.role || 'user';
      })
      .addCase(getMeThunk.rejected, (state) => {
        state.isInitializing = false;
        state.user = null;
        state.isAuthenticated = false;
        state.role = 'user';
      });

    builder
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        if (action.payload.role) {
          state.role = action.payload.role;
        }
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser, logout, switchRole } = authSlice.actions;
export default authSlice.reducer;

