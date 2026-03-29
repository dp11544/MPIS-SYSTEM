const BASE_URL = import.meta.env.VITE_API_URL;

export const buildImageUrl = (path) => {
    if (!path || typeof path !== "string") return null;

    // If already full URL → just encode and return
    if (path.startsWith("http")) {
        return encodeURI(path);
    }

    // Clean base URL (remove trailing slash)
    const cleanBase = BASE_URL.replace(/\/+$/, "");

    // Ensure path starts with single slash
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    // 🔥 FINAL FIX: encode spaces & special chars
    return encodeURI(`${cleanBase}${cleanPath}`);
};