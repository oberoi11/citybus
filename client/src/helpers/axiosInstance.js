import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "https://citybus-hjup.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // prevent infinite spinning
  withCredentials: false, // set true if using cookies
});

// 🔥 Attach token automatically to all requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // get token saved at login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // add Authorization header
  }
  return config;
});
