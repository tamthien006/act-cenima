// ====== API Client (shared) ======
export const API_BASE = "http://localhost:3000/api/v1";

export function setToken(token) { localStorage.setItem("token", token || ""); }
export function getToken() { return localStorage.getItem("token") || ""; }
export function clearToken() { localStorage.removeItem("token"); }

async function handle(resp) {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || (`HTTP ${resp.status}`));
  }
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return resp.json();
  return resp.text();
}

export async function apiGet(path) {
  const resp = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` }
  });
  return handle(resp);
}

export async function apiPost(path, data = {}) {
  const resp = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: JSON.stringify(data)
  });
  return handle(resp);
}

export async function apiPut(path, data = {}) {
  const resp = await fetch(API_BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: JSON.stringify(data)
  });
  return handle(resp);
}

export async function apiDel(path) {
  const resp = await fetch(API_BASE + path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` }
  });
  return handle(resp);
}

// Auth helpers
export async function login(email, password) {
  const data = await apiPost("/auth/login", { email, password });
  if (data?.token) setToken(data.token);
  return data;
}

export function ensureAuthOrRedirect(rolePage = "admin") {
  if (!getToken()) {
    window.location.href = `./login.html?redirect=${encodeURIComponent(rolePage)}`;
  }
}