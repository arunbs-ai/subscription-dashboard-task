/**
 * Centralized API service layer for SubPulse frontend.
 * All requests go through this module — handles base URL, auth headers,
 * token refresh on 401, and consistent error extraction.
 */

const BASE_URL = 'http://localhost:3002/api';

// ─── Token Storage ────────────────────────────────────────────────────────────
export const TokenStorage = {
  getAccess: () => localStorage.getItem('subpulse_access_token'),
  getRefresh: () => localStorage.getItem('subpulse_refresh_token'),
  set: (access: string, refresh: string) => {
    localStorage.setItem('subpulse_access_token', access);
    localStorage.setItem('subpulse_refresh_token', refresh);
  },
  clear: () => {
    localStorage.removeItem('subpulse_access_token');
    localStorage.removeItem('subpulse_refresh_token');
  },
};

// ─── Core Request Helper ──────────────────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  withAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = TokenStorage.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && withAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry original request with new token
      headers['Authorization'] = `Bearer ${TokenStorage.getAccess()}`;
      const retried = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      const retryData = await retried.json();
      if (!retried.ok) throw new ApiError(retryData.message || 'Request failed', retried.status);
      return retryData as T;
    } else {
      TokenStorage.clear();
      window.location.href = '/login';
      throw new ApiError('Session expired. Please sign in again.', 401);
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.message || 'An error occurred', response.status, data.errors);
  }
  return data as T;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = TokenStorage.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    TokenStorage.set(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];
  constructor(message: string, status: number, errors?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; company?: string; phone?: string }) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<any>('/auth/logout', { method: 'POST' }, true),

  refreshToken: (refreshToken: string) =>
    request<any>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: () =>
    request<any>('/auth/me', {}, true),
};

// ─── User/Profile API ─────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () =>
    request<any>('/user/profile', {}, true),

  updateProfile: (data: { name?: string; company?: string; phone?: string }) =>
    request<any>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/user/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, true),

  getAllUsers: () =>
    request<any>('/user/all', {}, true),
};

// ─── Plans API ────────────────────────────────────────────────────────────────
export const plansApi = {
  getActivePlans: () =>
    request<any>('/plans'),

  // Admin endpoints
  admin: {
    getAll: (includeDeleted = false) =>
      request<any>(`/plans/admin?includeDeleted=${includeDeleted}`, {}, true),

    getById: (id: string) =>
      request<any>(`/plans/admin/${id}`, {}, true),

    create: (data: Record<string, unknown>) =>
      request<any>('/plans/admin', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),

    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/plans/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true),

    delete: (id: string, note?: string) =>
      request<any>(`/plans/admin/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ note }),
      }, true),

    restore: (id: string, note?: string) =>
      request<any>(`/plans/admin/${id}/restore`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      }, true),

    toggleActive: (id: string) =>
      request<any>(`/plans/admin/${id}/toggle-active`, {
        method: 'PATCH',
      }, true),

    getAuditHistory: (id: string) =>
      request<any>(`/plans/admin/${id}/audit`, {}, true),
  },
};

// ─── Subscriptions API ────────────────────────────────────────────────────────
export const subscriptionApi = {
  getMy: () =>
    request<any>('/subscriptions/my', {}, true),

  purchase: (data: {
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
  }) =>
    request<any>('/subscriptions/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true),

  cancel: () =>
    request<any>('/subscriptions/cancel', {
      method: 'POST',
    }, true),

  reactivate: () =>
    request<any>('/subscriptions/reactivate', {
      method: 'POST',
    }, true),

  getAdminSubscribers: () =>
    request<any>('/subscriptions/admin/subscribers', {}, true),
};

// ─── Payment Cards API ────────────────────────────────────────────────────────
export const cardApi = {
  getMyCards: () =>
    request<any>('/cards/my', {}, true),

  addCard: (data: {
    holderName: string;
    brand?: string;
    cardNumber?: string;
    last4?: string;
    expMonth: number;
    expYear: number;
    isDefault?: boolean;
  }) =>
    request<any>('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true),

  setDefault: (cardId: string) =>
    request<any>(`/cards/${cardId}/default`, {
      method: 'PATCH',
    }, true),

  deleteCard: (cardId: string) =>
    request<any>(`/cards/${cardId}`, {
      method: 'DELETE',
    }, true),
};

