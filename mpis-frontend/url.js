const BASE_URL = import.meta.env.VITE_API_URL;

export const buildImageUrl = (path) => {
    if (!path || typeof path !== "string") return null;

    if (path.startsWith("http")) return path;

    const cleanBase = BASE_URL.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    return `${cleanBase}${cleanPath}`;
};