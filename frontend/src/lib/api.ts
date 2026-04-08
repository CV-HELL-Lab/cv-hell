import axios from "axios";

export const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("cvhell_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 Unauthorized, we might want to clear the token and redirect to login,
    // but we can handle that via context or in specific components.
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("cvhell_token");
      // Only redirect if not already on login/register pages
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
