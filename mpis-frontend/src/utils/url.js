const BASE_URL = import.meta.env.VITE_API_URL;

export const buildImageUrl = (path) => {
    if (!path || typeof path !== "string") return null;

    // 🔴 ENV SAFETY
    if (!BASE_URL) {
        console.error("❌ VITE_API_URL is not set");
        return null;
    }

    // ✅ Already full URL (Cloudinary / future-proof)
    if (path.startsWith("http")) {
        return path;
    }

    // 🔥 SIMPLE + RELIABLE
    return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};