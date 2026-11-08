const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl && import.meta.env.PROD) {
  throw new Error(
    "VITE_API_URL is not set. Configure it in the production environment before building."
  );
}

export const API_URL = apiUrl || "http://localhost:5000/api";
