function eventKey(item) {
  const normalize = (value) => String(value || "").normalize("NFKC").replaceAll("台", "臺").replace(/\s+/g, "");
  const date = normalize(item.date).replace(/[./]/g, "-");
  const title = normalize(item.title);
  const venue = normalize(item.venue);
  return date && title && venue ? JSON.stringify([date, title, venue]) : null;
}

function photosOf(item) {
  return [...(Array.isArray(item.photos) ? item.photos : []), item.photo].filter(Boolean);
}

export function mergePerformanceRecords(serverItems = [], cachedItems = []) {
  // Keep edits to an existing ID, then reconcile copies created with different IDs.
  const byId = new Map();
  for (const items of [serverItems, cachedItems]) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item?.id) byId.set(item.id, item);
    }
  }

  const records = [];
  const byEvent = new Map();
  for (const item of byId.values()) {
    const key = eventKey(item);
    const index = key ? byEvent.get(key) : undefined;
    if (index === undefined) {
      if (key) byEvent.set(key, records.length);
      records.push(item);
      continue;
    }

    const existing = records[index];
    const photos = [...new Set([...photosOf(existing), ...photosOf(item)])];
    records[index] = {
      ...item,
      ...existing,
      summary: existing.summary || item.summary || "",
      city: existing.city || item.city || "",
      role: existing.role || item.role || "",
      photo: photos[0] || "",
      photos
    };
  }
  return records;
}
