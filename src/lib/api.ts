import axios from "axios";
import { USE_MOCK_DATA } from "./mockConfig";
import { mockAdapter } from "./mockAdapter";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://academic-api-bfhv.onrender.com/api", // Ensure this is http://localhost:8000/api
  headers: {
    "Content-Type": "application/json",
  },
  adapter: USE_MOCK_DATA ? mockAdapter : undefined,
});

// The Interceptor: Attaches the JWT to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token"); // Adjust key name if necessary
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;