const BASE_URL = import.meta.env.VITE_API_URL;

export const buildImageUrl = (path) => {
    if (!path || typeof path !== "string") return null;

    // If already full valid URL
    if (path.startsWith("http")) return path;

    // If backend accidentally sent domain without protocol
    if (path.includes("onrender.com")) {
        const cleaned = path.replace(/^https?:\/\//, "");
        return `https://${cleaned.replace(/\/+/, "/")}`;
    }

    const cleanBase = BASE_URL.replace(/\/+$/, "");

    // Remove accidental domain fragments
    const cleanPath = path
        .replace(/^https?:\/\/[^/]+/, "") // remove domain if exists
        .replace(/^\/+/, ""); // remove leading slashes

    return `${cleanBase}/${cleanPath}`;
};