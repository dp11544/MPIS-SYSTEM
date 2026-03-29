const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const buildImageUrl = (path) => {
    // ❌ Invalid path
    if (!path || typeof path !== "string") {
        return "/fallback-user.png";
    }

    // 🔥 FIRST: handle Cloudinary / external URLs
    if (path.startsWith("http")) {
        return path;
    }

    // 🔴 THEN check backend base URL
    if (!BASE_URL) {
        console.error("❌ VITE_API_URL is not set");
        return "/fallback-user.png";
    }

    // ✅ Normalize path
    const cleanPath = path.replace(/^\//, "");

    return `${BASE_URL}/${cleanPath}`;
};