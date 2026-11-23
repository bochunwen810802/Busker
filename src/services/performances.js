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
  const candidates = [serverItems, cachedItems].flatMap((items) =>
    Array.isArray(items) ? items.filter((item) => item?.id) : []
  );
  // Explicit replacements retire old names/venues without importing their photos.
  // Derive these before ID overrides so an old cache cannot undo the migration.
  const supersededKeys = new Set(candidates.flatMap((item) =>
    Array.isArray(item.supersedes) ? item.supersedes.map(eventKey).filter(Boolean) : []
  ));

  // Keep edits to an existing ID, then reconcile copies created with different IDs.
  const byId = new Map();
  for (const item of candidates) {
    if (supersededKeys.has(eventKey(item))) continue;
    const previous = byId.get(item.id);
    const aliases = [previous?.supersedes, item.supersedes].flatMap((value) => Array.isArray(value) ? value : []);
    const supersedes = [...new Map(aliases.map((alias) => [eventKey(alias), alias])).values()];
    byId.set(item.id, supersedes.length ? { ...item, supersedes } : item);
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
