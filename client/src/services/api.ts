import { env } from '../config/env';

const BASE_URL = env.apiBaseUrl;

const ACCESS_KEY = `${env.storagePrefix}_access_token`;
const REFRESH_KEY = `${env.storagePrefix}_refresh_token`;

export const TokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

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

  if (response.status === 401 && withAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
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

export const userApi = {
  getProfile: () =>
    request<any>('/user/profile', {}, true),

  updateProfile: (data: { name?: string; email?: string; company?: string; phone?: string }) =>
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

export const plansApi = {
  getActivePlans: () =>
    request<any>('/plans'),

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

  cancel: (data: { immediately?: boolean; reason?: string; subscriptionId?: string } = {}) =>
    request<any>('/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true),

  getHistory: () =>
    request<any>('/subscriptions/history', {}, true),

  reactivate: () =>
    request<any>('/subscriptions/reactivate', {
      method: 'POST',
    }, true),

  getAdminSubscribers: () =>
    request<any>('/subscriptions/admin/subscribers', {}, true),
};

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

