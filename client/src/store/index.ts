import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import planReducer from './slices/planSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    plans: planReducer,
    subscription: subscriptionReducer,
    admin: adminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
