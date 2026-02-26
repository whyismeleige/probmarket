// lib/api/auth.api.ts
import apiClient from "./client";
import type { User } from "@/types";

export const authApi = {
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    apiClient.post<{ success: boolean; data: { user: User } }>("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ success: boolean; data: { user: User } }>("/auth/login", data),

  logout: () => apiClient.post("/auth/logout"),

  getProfile: () =>
    apiClient.get<{ success: boolean; data: { user: User } }>("/auth/profile"),
};