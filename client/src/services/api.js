const BASE_URL = import.meta.env.VITE_API_URL;

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : "";
}

function isMutating(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error) {
  const q = refreshQueue;
  refreshQueue = [];
  q.forEach((item) => {
    if (error) item.reject(error);
    else item.resolve();
  });
}

async function tryRefresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Refresh failed");
  return res.json();
}

async function request(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  const csrf = getCsrfToken();
  if (isMutating(options.method || "GET") && csrf) {
    headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !endpoint.includes("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        await tryRefresh();
        isRefreshing = false;
        processQueue(null);
        return request(endpoint, options);
      } catch (err) {
        isRefreshing = false;
        processQueue(err);
        window.dispatchEvent(new CustomEvent("auth:expired"));
        throw new Error("Session expired. Please sign in again.");
      }
    } else {
      await new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }));
      return request(endpoint, options);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}

export const api = {
  get: (url) => request(url),
  post: (url, data) => request(url, { method: "POST", body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: "PUT", body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: "DELETE" }),
};
