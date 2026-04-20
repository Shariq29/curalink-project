import axios from "axios";

/* ------------------ AXIOS INSTANCE ------------------ */
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 15000 // 15 sec timeout
});

/* ------------------ REQUEST INTERCEPTOR ------------------ */
api.interceptors.request.use(
  (config) => {
    // You can add auth token here later
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------ RESPONSE INTERCEPTOR ------------------ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error?.response || error.message);

    return Promise.reject(
      error?.response?.data || {
        error: "Something went wrong while calling API"
      }
    );
  }
);

export default api;