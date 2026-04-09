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
    // Only clear token and redirect on 401 from the /me auth-check endpoint.
    // Other 401s are handled by individual components — aggressive global redirect
    // causes phantom logouts when any single request temporarily fails.
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      error.config?.url === "/me"
    ) {
      localStorage.removeItem("cvhell_token");
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
