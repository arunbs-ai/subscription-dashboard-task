const required = (name: keyof ImportMetaEnv): string => {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Add it to client/.env`);
  }
  return value;
};

export const env = {
  appName: required('VITE_APP_NAME'),
  apiBaseUrl: required('VITE_API_BASE_URL'),
  storagePrefix: required('VITE_STORAGE_PREFIX'),
};
