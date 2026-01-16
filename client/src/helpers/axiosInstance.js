import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://citybus-1.onrender.com",
});

// ✅ Attach token dynamically
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
