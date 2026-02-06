/**
 * Better Auth Client for Nox Chat (Expo)
 * Handles authentication using better-auth with expo plugin
 * Security-hardened configuration
 */

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./api-config";

// Create auth client with secure configuration
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    headers: {
      // Set Origin header for mobile requests since native apps don't send one
      "Origin": API_BASE_URL,
    },
  },
  plugins: [
    expoClient({
      scheme: "nox",
      storagePrefix: "nox",
      storage: SecureStore,
    }),
  ],
});

// Export auth methods
export const { signIn, signUp, signOut, useSession } = authClient;
