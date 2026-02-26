// lib/api/client.ts
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // Send httpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor — attach any headers if needed
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — normalize error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    if (error.response?.status === 401) {
      // Clear persisted auth state and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("persist:auth");
        sessionStorage.clear();
        if (!window.location.pathname.includes("/auth")) {
          window.location.href = "/auth";
        }
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;