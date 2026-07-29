/**
 * Cloud DB Service Layer for Busker Site
 * Supports Supabase, JSONBin.io, and Local Server API fallback.
 */

const STORAGE_CACHE_KEY = "bochun-performances-cache-v1";

// Environmental or custom Cloud DB config
const CLOUD_DB_URL = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_CLOUD_DB_URL || "" : "";
const CLOUD_DB_KEY = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_CLOUD_DB_KEY || "" : "";

export async function fetchPerformancesFromCloud() {
  if (!CLOUD_DB_URL) return null;
  try {
    const headers = {};
    if (CLOUD_DB_KEY) {
      headers["Authorization"] = `Bearer ${CLOUD_DB_KEY}`;
      headers["apikey"] = CLOUD_DB_KEY;
      headers["X-Master-Key"] = CLOUD_DB_KEY;
    }
    const response = await fetch(CLOUD_DB_URL, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    // Support JSONBin wrapper { record: [...] } or direct array [...]
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.record)) return data.record;
    return null;
  } catch (err) {
    console.warn("Cloud DB fetch fallback:", err);
    return null;
  }
}

export async function savePerformancesToCloud(records, basePath = "") {
  if (!Array.isArray(records)) return;

  // 1. Save to LocalStorage immediately
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(records));
      window.dispatchEvent(new CustomEvent("performances-updated", { detail: records }));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  // 2. Save to Local Node Dev API (if running locally)
  if (typeof window !== "undefined") {
    const prefix = !basePath || basePath === "/" ? "" : basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    const apiPath = prefix ? `${prefix}/api/performances` : "/api/performances";
    fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(records)
    }).catch(() => {});
  }

  // 3. Save to Cloud DB API if configured
  if (CLOUD_DB_URL) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (CLOUD_DB_KEY) {
        headers["Authorization"] = `Bearer ${CLOUD_DB_KEY}`;
        headers["apikey"] = CLOUD_DB_KEY;
        headers["X-Master-Key"] = CLOUD_DB_KEY;
      }
      await fetch(CLOUD_DB_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify(records)
      });
    } catch (err) {
      console.warn("Cloud DB save error:", err);
    }
  }
}
