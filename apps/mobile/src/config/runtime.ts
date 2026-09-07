import { resolveMobileConfig } from "./environment";

// Expo substitutes direct EXPO_PUBLIC accesses when producing the bundle.
export const mobileConfig = resolveMobileConfig({
  ...(process.env.EXPO_PUBLIC_LOCAL_DATA_MODE === undefined
    ? {}
    : { localDataMode: process.env.EXPO_PUBLIC_LOCAL_DATA_MODE }),
  ...(process.env.EXPO_PUBLIC_APP_ENV === undefined
    ? {}
    : { environment: process.env.EXPO_PUBLIC_APP_ENV }),
  ...(process.env.EXPO_PUBLIC_API_BASE_URL === undefined
    ? {}
    : { apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL }),
});
