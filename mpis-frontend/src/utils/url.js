const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const buildImageUrl = (path) => {
    // ✅ Handle empty / invalid path
    if (!path || typeof path !== "string") {
        return "/fallback-user.png";
    }

    // ✅ ENV safety
    if (!BASE_URL) {
        console.error("❌ VITE_API_URL is not set");
        return "/fallback-user.png";
    }

    // ✅ Already full URL (future-proof: Cloudinary, etc.)
    if (path.startsWith("http")) {
        return path;
    }

    // ✅ Normalize path (no double slash)
    const cleanPath = path.replace(/^\//, "");

    return `${BASE_URL}/${cleanPath}`;
};