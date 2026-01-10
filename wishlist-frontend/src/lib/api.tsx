import axios from "axios";

const getBaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) return "/api"; // Default for local proxy
    // If URL already ends with /api (with or without trailing slash), return it cleaned
    if (url.match(/\/api\/?$/)) return url.replace(/\/$/, "");
    // Otherwise append /api
    return `${url.replace(/\/$/, "")}/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
