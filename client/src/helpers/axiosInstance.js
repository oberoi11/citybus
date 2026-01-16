import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "https://citybus-hjup.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // optional: prevent infinite spinning
  withCredentials: false, // set true if using cookies
});
