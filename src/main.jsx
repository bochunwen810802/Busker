"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileUp,
  Facebook,
  Guitar,
  ImageIcon,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Mic2,
  Pencil,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Unlock,
  X
} from "lucide-react";

const ADMIN_PASSWORD = "bochunmusic";
const VISIT_STORAGE_KEY = "bochun-visitor-analytics-v1";
const VISIT_SESSION_KEY = "bochun-visitor-session-v1";
const emptyPerformance = {
  id: "",
  date: "",
  year: new Date().getFullYear(),
  title: "",
  category: "活動商演",
  venue: "",
  city: "臺中",
  role: "吉他彈唱 / Vocal",
  summary: "",
  photo: "",
  photos: [],
  featured: false
};

function getPhotos(item) {
  const photos = [];
  if (Array.isArray(item?.photos)) photos.push(...item.photos);
  if (item?.photo) photos.push(item.photo);
  return [...new Set(photos.filter(Boolean))];
}

function basePrefix(basePath = "") {
  if (!basePath || basePath === "/") return "";
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

function withBase(basePath = "", path = "/") {
  const prefix = basePrefix(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return prefix ? `${prefix}${normalizedPath}` : normalizedPath;
}

function resolveMediaUrl(basePath = "", url = "") {
  if (!url) return "";
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return withBase(basePath, url);
  return url;
}

function shouldShowTimelinePhotos(item) {
  return ![2014, 2015, 2016].includes(Number(item?.year));
}

function normalizePerformanceRecord(item) {
  const photos = getPhotos(item);
  return {
    ...item,
    photo: photos[0] || "",
    photos
  };
}

function loadStoredVisits() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VISIT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredVisits(records) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(records));
}

function getDayKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dayKey) {
  const [year, month, day] = String(dayKey).split("-");
  return `${year}.${month}.${day}`;
}

function getVisitPath(basePath = "") {
  if (typeof window === "undefined") return "/";
  const prefix = basePrefix(basePath);
  const pathname = window.location.pathname || "/";
  const trimmed = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  return trimmed || "/";
}

function getDeviceLabel() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function recordVisit(basePath = "", pageTitle = "") {
  if (typeof window === "undefined") return;
  const session = window.sessionStorage;
  const currentSessionId = session.getItem(VISIT_SESSION_KEY) || `session-${Date.now().toString(36)}`;
  session.setItem(VISIT_SESSION_KEY, currentSessionId);

  const now = new Date();
  const path = getVisitPath(basePath);
  const records = loadStoredVisits();
  const latestSamePath = [...records]
    .reverse()
    .find((item) => item.sessionId === currentSessionId && item.path === path);

  if (latestSamePath) {
    const previous = new Date(latestSamePath.timestamp).getTime();
    if (now.getTime() - previous < 30 * 60 * 1000) return;
  }

  const next = {
    id: `visit-${now.getTime().toString(36)}`,
    day: getDayKey(now),
    timestamp: now.toISOString(),
    path,
    pageTitle: pageTitle || document.title,
    referrer: document.referrer || "直接進入",
    device: getDeviceLabel(),
    language: typeof navigator === "undefined" ? "" : navigator.language || "",
    viewport:
      typeof window === "undefined" ? "" : `${window.innerWidth}x${window.innerHeight}`,
    sessionId: currentSessionId
  };

  saveStoredVisits([...records, next].slice(-1200));
}

function createDaySeries(records, span = 14) {
  const totals = records.reduce((acc, item) => {
    acc[item.day] = (acc[item.day] || 0) + 1;
    return acc;
  }, {});
  const result = [];
  const today = new Date();

  for (let index = span - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const day = getDayKey(date);
    result.push({ day, count: totals[day] || 0 });
  }

  return result;
}

function countVisitsSince(records, days) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return records.filter((item) => new Date(item.timestamp) >= cutoff).length;
}

function exportVisitsCsv(records) {
  const header = ["day", "timestamp", "path", "pageTitle", "referrer", "device", "language", "viewport", "sessionId"];
  const rows = records.map((item) =>
    header
      .map((key) => `"${String(item[key] || "").replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function useSiteData(basePath = "") {
  const [content, setContent] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(withBase(basePath, "/data/site-content.json")).then((response) => response.json()),
      fetch(withBase(basePath, "/data/performances.json")).then((response) => response.json())
    ])
      .then(([siteContent, performanceData]) => {
        setContent(siteContent);
        setPerformances(performanceData);
      })
      .catch(() => setError("資料載入失敗，請確認 data JSON 是否存在。"));
  }, [basePath]);

  return { content, performances, error };
}

function useInView() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

function AnimatedNumber({ value, suffix }) {
  const [ref, visible] = useInView();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const totalFrames = 70;
    const tick = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setCurrent(Math.round(value * progress));
      if (frame < totalFrames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value]);

  return (
    <span ref={ref} className="stat-number">
      {current}
      {suffix}
    </span>
  );
}

function formatDate(date) {
  if (!date) return "日期待補";
  return date.replaceAll("-", ".");
}

function inferYear(date, fallback) {
  if (date && /^\d{4}/.test(date)) return Number(date.slice(0, 4));
  return fallback || new Date().getFullYear();
}

function normalizeVenueLabel(venue) {
  const label = String(venue || "").replaceAll("_", " ").trim();
  if (!label) return "";
  if (label.includes("激旨燒鳥")) return "激旨燒鳥";
  if (label.includes("勤美綠園道")) return "勤美綠園道";
  if (label.includes("草悟廣場")) return "草悟廣場";
  if (label.includes("碧根廣場")) return "碧根廣場";
  if (label.includes("益民一中商圈")) return "益民一中商圈";
  if (label.includes("新社安妮公主花園")) return "安妮公主花園";
  return label;
}

function buildTimelineGroups(performances) {
  const byYear = performances.reduce((acc, item) => {
    const year = item.year || inferYear(item.date);
    const venueLabel = normalizeVenueLabel(item.venue);
    const groupKey = `${year}::${venueLabel || item.title}`;
    acc[year] = acc[year] || new Map();

    if (!acc[year].has(groupKey)) {
      acc[year].set(groupKey, {
        id: groupKey,
        year,
        venueLabel,
        items: []
      });
    }

    acc[year].get(groupKey).items.push(item);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(byYear).map(([year, groups]) => {
      const merged = [...groups.values()]
        .map((group) => {
          const items = [...group.items].sort((a, b) => String(a.date).localeCompare(String(b.date)));
          if (items.length === 1) return { kind: "single", ...items[0] };

          const categoryLabel = [...new Set(items.map((item) => item.category))].join(" / ");
          const distinctTitles = [...new Set(items.map((item) => item.title).filter((title) => title && title !== "駐唱演出"))];
          const hint = distinctTitles.length > 0 ? distinctTitles.slice(0, 2).join(" / ") : "固定演出與駐唱累積";

          return {
            kind: "merged",
            id: group.id,
            year: Number(year),
            venue: group.venueLabel || items[0].venue,
            category: categoryLabel,
            count: items.length,
            dateStart: items[0].date,
            dateEnd: items.at(-1).date,
            title: group.venueLabel || items[0].title,
            summary: hint,
            photos: [...new Set(items.flatMap((item) => getPhotos(item)))]
          };
        })
        .sort((a, b) => {
          const left = a.kind === "merged" ? a.dateEnd : a.date;
          const right = b.kind === "merged" ? b.dateEnd : b.date;
          return String(right).localeCompare(String(left));
        });

      return [year, merged];
    })
  );
}

function buildFeaturedCards(performances) {
  const featuredRecords = performances
    .filter((item) => item.featured)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const grouped = new Map();

  for (const item of featuredRecords) {
    const year = item.year || inferYear(item.date);
    const venueLabel = normalizeVenueLabel(item.venue);
    const key = `${year}::${venueLabel || item.title}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...item,
        venue: venueLabel || item.venue,
        count: 1,
        dateStart: item.date,
        dateEnd: item.date,
        photos: getPhotos(item),
        featuredOrder: item.featuredOrder || 999
      });
      continue;
    }

    const current = grouped.get(key);
    grouped.set(key, {
      ...current,
      title: venueLabel || current.title,
      venue: venueLabel || current.venue,
      count: current.count + 1,
      dateStart: String(item.date).localeCompare(String(current.dateStart)) < 0 ? item.date : current.dateStart,
      dateEnd: String(item.date).localeCompare(String(current.dateEnd)) > 0 ? item.date : current.dateEnd,
      photo: current.photo || item.photo,
      summary: current.summary || item.summary,
      photos: [...new Set([...current.photos, ...getPhotos(item)])],
      featuredOrder: Math.min(current.featuredOrder || 999, item.featuredOrder || 999)
    });
  }

  return [...grouped.values()]
    .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999) || String(b.dateEnd).localeCompare(String(a.dateEnd)))
    .slice(0, 9);
}

function PhotoCarousel({ photos, title, onOpen, compact = false, basePath = "" }) {
  const safePhotos = photos.map((photo) => resolveMediaUrl(basePath, photo)).filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [safePhotos.join("|")]);

  if (safePhotos.length === 0) {
    return (
      <div className={compact ? "timeline-thumb empty" : "card-image"}>
        <div className="image-fallback">
          <Guitar size={compact ? 22 : 32} />
        </div>
      </div>
    );
  }

  const showPrev = (event) => {
    event.stopPropagation();
    setIndex((current) => (current - 1 + safePhotos.length) % safePhotos.length);
  };

  const showNext = (event) => {
    event.stopPropagation();
    setIndex((current) => (current + 1) % safePhotos.length);
  };

  return (
    <div className={compact ? "timeline-thumb" : "card-image"}>
      <button className="photo-surface" type="button" onClick={() => onOpen(index)} aria-label={`查看 ${title} 照片`}>
        <img src={safePhotos[index]} alt={title} loading="lazy" />
      </button>
      {safePhotos.length > 1 ? (
        <>
          <button className={`carousel-arrow left ${compact ? "compact" : ""}`} type="button" onClick={showPrev} aria-label="上一張">
            <ChevronLeft size={compact ? 16 : 18} />
          </button>
          <button className={`carousel-arrow right ${compact ? "compact" : ""}`} type="button" onClick={showNext} aria-label="下一張">
            <ChevronRight size={compact ? 16 : 18} />
          </button>
          <div className={`photo-count ${compact ? "compact" : ""}`}>
            <ImageIcon size={compact ? 12 : 14} />
            {index + 1}/{safePhotos.length}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PhotoLightbox({ title, photos, initialIndex, onClose, basePath = "" }) {
  const [index, setIndex] = useState(initialIndex);
  const safePhotos = photos.map((photo) => resolveMediaUrl(basePath, photo)).filter(Boolean);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + safePhotos.length) % safePhotos.length);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % safePhotos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, safePhotos.length]);

  if (safePhotos.length === 0) return null;

  return (
    <div className="lightbox-shell" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button className="lightbox-close" type="button" onClick={onClose} aria-label="關閉">
          <X size={20} />
        </button>
        <div className="lightbox-stage">
          <button className="lightbox-arrow left" type="button" onClick={() => setIndex((current) => (current - 1 + safePhotos.length) % safePhotos.length)} aria-label="上一張">
            <ChevronLeft size={22} />
          </button>
          <img src={safePhotos[index]} alt={title} />
          <button className="lightbox-arrow right" type="button" onClick={() => setIndex((current) => (current + 1) % safePhotos.length)} aria-label="下一張">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="lightbox-meta">
          <strong>{title}</strong>
          <span>
            {index + 1} / {safePhotos.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PublicSite({ content, performances, basePath = "" }) {
  const featured = useMemo(() => buildFeaturedCards(performances), [performances]);
  const grouped = useMemo(() => {
    return buildTimelineGroups(performances);
  }, [performances]);
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));
  const [lightbox, setLightbox] = useState(null);

  return (
    <main>
      <nav className="topbar" aria-label="主要導覽">
        <a className="brand-mark" href="#top">
          <span>草帽女孩</span>
          <strong>溫柏淳</strong>
        </a>
        <div className="nav-links">
          <a href="#performances">演出</a>
          <a href="#resume">履歷</a>
          <a href="#contact">邀約</a>
          <a href={withBase(basePath, "/manage")}>管理</a>
        </div>
      </nav>

      <section id="top" className="hero">
        <img className="hero-image" src={resolveMediaUrl(basePath, content.profile.heroImage)} alt="草帽女孩溫柏淳形象照" />
        <div className="hero-scrim" />
        <div className="hero-content reveal">
          <span className="eyebrow">Taichung busker · live music</span>
          <h1>{content.profile.brandName}</h1>
          <p className="hero-subtitle">{content.profile.headline}</p>
          <p className="hero-copy">{content.profile.promise}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#contact">
              <Mail size={18} />
              活動邀約
            </a>
            <a className="ghost-action" href="#performances">
              <ArrowDown size={18} />
              看演出經歷
            </a>
          </div>
        </div>
      </section>

      <section className="stats-band" aria-label="履歷數字">
        {content.stats.map((stat) => (
          <div className="stat-item" key={stat.label}>
            <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="intro-section section-grid">
        <div>
          <span className="section-kicker">For event planners</span>
          <h2>從街頭、駐唱到大型活動，都能把現場唱暖。</h2>
        </div>
        <div className="intro-copy">
          <p>{content.profile.intro}</p>
          <div className="service-cloud">
            {content.services.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="performances" className="feature-section">
        <div className="section-heading">
          <span className="section-kicker">Featured stages</span>
          <h2>精選演出</h2>
        </div>
        <div className="feature-grid">
          {featured.map((item) => (
            <article className="performance-card" key={item.id}>
              <PhotoCarousel
                photos={getPhotos(item)}
                title={item.title}
                basePath={basePath}
                onOpen={(index) => setLightbox({ title: item.title, photos: getPhotos(item), index })}
              />
              <div className="card-body">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="meta-row">
                  <span>
                    <CalendarDays size={15} />
                    {item.count > 1 ? `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}` : formatDate(item.date)}
                  </span>
                  <span>
                    <MapPin size={15} />
                    {item.venue || item.city || "地點待補"}
                  </span>
                </div>
                {item.count > 1 ? <div className="meta-group-note">同場地精選整合 · {item.count} 場</div> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="resume" className="resume-band">
        <div className="section-heading">
          <span className="section-kicker">Resume</span>
          <h2>教學、評審與比賽經歷</h2>
        </div>
        <div className="resume-grid">
          <ResumeColumn icon={<Guitar />} title="教學經歷" items={content.teaching} />
          <ResumeColumn icon={<Mic2 />} title="評審經歷" items={content.judging} />
          <ResumeColumn icon={<Sparkles />} title="比賽佳績" items={content.competitions} compact />
        </div>
      </section>

      <section className="timeline-section">
        <div className="section-heading">
          <span className="section-kicker">Archive</span>
          <h2>演出年表</h2>
        </div>
        <div className="timeline">
          {years.map((year) => (
            <div className="year-group" key={year}>
              <h3>{year}</h3>
              <div className="year-list">
                {grouped[year].map((item) => (
                  <article className="timeline-item" key={item.id}>
                    <time>{item.kind === "merged" ? `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}` : formatDate(item.date)}</time>
                    <div className="timeline-copy">
                      <span>{item.kind === "merged" ? `${item.category} · ${item.count} 場` : item.category}</span>
                      <h4>{item.title}</h4>
                      <p>{item.kind === "merged" ? `${item.venue} · ${item.summary}` : item.venue}</p>
                    </div>
                    {shouldShowTimelinePhotos(item) && getPhotos(item).length > 0 ? (
                      <PhotoCarousel
                        compact
                        photos={getPhotos(item)}
                        title={item.title}
                        basePath={basePath}
                        onOpen={(index) => setLightbox({ title: item.title, photos: getPhotos(item), index })}
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div>
          <span className="section-kicker">Booking</span>
          <h2>邀請一段剛剛好的現場音樂。</h2>
          <p>{content.contact.note}</p>
        </div>
        <div className="contact-panel">
          <div className="contact-actions">
            <a className="primary-action" href={content.contact.instagramUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              Instagram @{content.contact.instagram}
            </a>
            <a className="ghost-action" href={content.contact.facebookUrl} target="_blank" rel="noreferrer">
              <Facebook size={18} />
              Facebook 粉專
            </a>
          </div>
          <div className="contact-list">
            <span>
              <Mail size={16} />
              {content.contact.email}
            </span>
            <span>
              <Phone size={16} />
              {content.contact.phone}
            </span>
            <span>
              <MessageCircle size={16} />
              Line ID：{content.contact.lineId}
            </span>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {content.profile.brandName}</span>
        {content.sourceCredits.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
            資料與照片來源：{source.label}
          </a>
        ))}
      </footer>
      {lightbox ? (
        <PhotoLightbox
          title={lightbox.title}
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          basePath={basePath}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </main>
  );
}

function ResumeColumn({ icon, title, items, compact = false }) {
  return (
    <article className={`resume-column ${compact ? "compact" : ""}`}>
      <div className="resume-title">
        {React.cloneElement(icon, { size: 22 })}
        <h3>{title}</h3>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function AnalyticsPanel() {
  const [records, setRecords] = useState(() => loadStoredVisits());
  const daySeries = useMemo(() => createDaySeries(records, 14), [records]);
  const defaultDay = [...daySeries].reverse().find((item) => item.count > 0)?.day || daySeries.at(-1)?.day || "";
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  useEffect(() => {
    setSelectedDay((current) => current || defaultDay);
  }, [defaultDay]);

  useEffect(() => {
    const syncRecords = () => setRecords(loadStoredVisits());
    window.addEventListener("storage", syncRecords);
    window.addEventListener("focus", syncRecords);
    return () => {
      window.removeEventListener("storage", syncRecords);
      window.removeEventListener("focus", syncRecords);
    };
  }, []);

  const total = records.length;
  const todayCount = countVisitsSince(records, 1);
  const weekCount = countVisitsSince(records, 7);
  const monthCount = countVisitsSince(records, 30);
  const detailRecords = useMemo(
    () =>
      records
        .filter((item) => item.day === selectedDay)
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))),
    [records, selectedDay]
  );
  const chartMax = Math.max(...daySeries.map((item) => item.count), 1);

  function downloadVisits(format) {
    const payload = format === "csv" ? exportVisitsCsv(records) : JSON.stringify(records, null, 2) + "\n";
    const blob = new Blob([payload], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "csv" ? "visitor-analytics.csv" : "visitor-analytics.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="analytics-panel">
      <div className="analytics-header">
        <div>
          <span className="section-kicker">Visitor snapshot</span>
          <h2>瀏覽概覽</h2>
          <p className="analytics-note">
            這是目前這台裝置記錄到的本地瀏覽資料，不代表全站真實流量，也不包含訪客 IP。
          </p>
        </div>
        <div className="analytics-actions">
          <button className="icon-button" onClick={() => downloadVisits("json")} type="button">
            <Download size={18} />
            匯出 JSON
          </button>
          <button className="icon-button" onClick={() => downloadVisits("csv")} type="button">
            <Download size={18} />
            匯出 CSV
          </button>
        </div>
      </div>

      <div className="analytics-stats">
        <article className="analytics-stat-card">
          <strong>{todayCount}</strong>
          <span>今日瀏覽</span>
        </article>
        <article className="analytics-stat-card">
          <strong>{weekCount}</strong>
          <span>近 7 天</span>
        </article>
        <article className="analytics-stat-card">
          <strong>{monthCount}</strong>
          <span>近 30 天</span>
        </article>
        <article className="analytics-stat-card">
          <strong>{total}</strong>
          <span>累積紀錄</span>
        </article>
      </div>

      <div className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-card-head">
            <h3>近 14 日趨勢</h3>
            <span>點選日期可看當日明細</span>
          </div>
          <div className="visit-chart" role="list" aria-label="近十四日瀏覽圖表">
            {daySeries.map((item) => (
              <button
                key={item.day}
                className={`visit-bar ${selectedDay === item.day ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedDay(item.day)}
              >
                <span className="visit-bar-count">{item.count}</span>
                <span
                  className="visit-bar-fill"
                  style={{ height: `${Math.max((item.count / chartMax) * 100, item.count > 0 ? 12 : 4)}%` }}
                />
                <span className="visit-bar-label">{item.day.slice(5).replace("-", "/")}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="analytics-card detail-card">
          <div className="analytics-card-head">
            <h3>{selectedDay ? `${formatDayLabel(selectedDay)} 明細` : "當日明細"}</h3>
            <span>{detailRecords.length} 筆</span>
          </div>
          <div className="visit-detail-list">
            {detailRecords.length ? (
              detailRecords.map((item) => (
                <article className="visit-detail-row" key={item.id}>
                  <div>
                    <strong>{new Date(item.timestamp).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
                    <p>{item.path}</p>
                  </div>
                  <div className="visit-meta">
                    <span>{item.device}</span>
                    <span>{item.viewport}</span>
                    <span>{item.referrer}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-analytics-state">這一天目前沒有本地瀏覽紀錄。</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export function ManageSite({ performances, basePath = "" }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("bochun-admin") === "yes");
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState(performances);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ ...emptyPerformance, id: `perf-${Date.now()}` });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRecords(performances.map(normalizePerformanceRecord));
  }, [performances]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [records]
  );

  function unlock(event) {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("bochun-admin", "yes");
      setUnlocked(true);
      setMessage("");
    } else {
      setMessage("密碼不正確。");
    }
  }

  function startEdit(record) {
    setEditingId(record.id);
    setForm(normalizePerformanceRecord(record));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyPerformance, id: `perf-${Date.now()}`, photos: [] });
  }

  function submitRecord(event) {
    event.preventDefault();
    const nextPhotos = getPhotos(form);
    const next = {
      ...form,
      id: form.id || `perf-${Date.now()}`,
      year: inferYear(form.date, form.year),
      photo: nextPhotos[0] || "",
      photos: nextPhotos,
      featured: Boolean(form.featured)
    };
    setRecords((current) => {
      const exists = current.some((item) => item.id === next.id);
      return exists ? current.map((item) => (item.id === next.id ? next : item)) : [next, ...current];
    });
    setMessage(editingId ? "演出紀錄已更新，可匯出 JSON。" : "演出紀錄已新增，可匯出 JSON。");
    resetForm();
  }

  function removeRecord(id) {
    setRecords((current) => current.filter((item) => item.id !== id));
    setMessage("演出紀錄已刪除，可匯出 JSON。");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(records, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "performances.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("Invalid JSON");
        setRecords(parsed.map(normalizePerformanceRecord));
        setMessage(`已匯入 ${parsed.length} 筆演出紀錄。`);
      } catch {
        setMessage("匯入失敗，請確認檔案是 performances.json 格式。");
      }
    };
    reader.readAsText(file);
  }

  function handlePhotoUpload(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("upload failed"));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((images) => {
        setForm((current) => {
          const photos = [...getPhotos(current), ...images.filter(Boolean)];
          return {
            ...current,
            photo: photos[0] || "",
            photos
          };
        });
        setMessage(`已加入 ${images.length} 張照片，匯出 JSON 時會一併帶出。`);
      })
      .catch(() => {
        setMessage("照片讀取失敗，請再試一次。");
      });

    event.target.value = "";
  }

  function removeFormPhoto(index) {
    setForm((current) => {
      const photos = getPhotos(current).filter((_, photoIndex) => photoIndex !== index);
      return {
        ...current,
        photo: photos[0] || "",
        photos
      };
    });
  }

  if (!unlocked) {
    return (
      <main className="manage-shell login-shell">
        <form className="login-panel" onSubmit={unlock}>
          <Lock size={30} />
          <h1>草帽女孩履歷站管理</h1>
          <label>
            管理密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </label>
          <button className="primary-action" type="submit">
            <Unlock size={18} />
            進入後台
          </button>
          {message && <p className="form-message">{message}</p>}
          <a href={withBase(basePath, "/")}>回公開網站</a>
        </form>
      </main>
    );
  }

  return (
    <main className="manage-shell">
      <header className="manage-header">
        <div>
          <span className="section-kicker">Manage performances</span>
          <h1>演出紀錄管理</h1>
        </div>
        <div className="manage-actions">
          <label className="icon-button">
            <FileUp size={18} />
            匯入
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
          <button className="icon-button" onClick={exportJson} type="button">
            <Download size={18} />
            匯出
          </button>
          <a className="icon-button" href={withBase(basePath, "/")}>
            回網站
          </a>
        </div>
      </header>

      <AnalyticsPanel />

      <section className="editor-layout">
        <form className="record-form" onSubmit={submitRecord}>
          <h2>{editingId ? "編輯演出" : "新增演出"}</h2>
          <Field label="日期" value={form.date} onChange={(value) => setForm({ ...form, date: value })} type="date" />
          <Field label="活動名稱" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <Field label="類型" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
          <Field label="地點" value={form.venue} onChange={(value) => setForm({ ...form, venue: value })} />
          <Field label="城市" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          <Field label="角色" value={form.role} onChange={(value) => setForm({ ...form, role: value })} />
          <label>
            簡介
            <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </label>
          <div className="photo-upload-block">
            <div className="photo-upload-head">
              <span>演出照片</span>
              <label className="icon-button upload-button">
                <ImageIcon size={18} />
                上傳照片
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
              </label>
            </div>
            {getPhotos(form).length ? (
              <div className="photo-preview-grid">
                {getPhotos(form).map((photo, index) => (
                  <div className="photo-preview-card" key={`${photo.slice(0, 40)}-${index}`}>
                    <img src={photo} alt={`演出照片 ${index + 1}`} />
                    <button
                      className="square-button danger preview-remove"
                      type="button"
                      onClick={() => removeFormPhoto(index)}
                      aria-label={`刪除第 ${index + 1} 張照片`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="photo-empty-note">尚未加入照片。上傳後會在這裡預覽，匯出 JSON 時也會一起保留。</p>
            )}
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm({ ...form, featured: event.target.checked })}
            />
            首頁精選
          </label>
          <div className="form-actions">
            <button className="primary-action" type="submit">
              <Save size={18} />
              {editingId ? "更新" : "新增"}
            </button>
            <button className="ghost-action dark" type="button" onClick={resetForm}>
              <Plus size={18} />
              清空
            </button>
          </div>
          {message && <p className="form-message">{message}</p>}
        </form>

        <div className="record-table">
          <div className="table-summary">{records.length} 筆演出紀錄</div>
          {sortedRecords.map((record) => (
            <article className="record-row" key={record.id}>
              <div>
                <time>{formatDate(record.date)}</time>
                <h3>{record.title}</h3>
                <p>{record.category} · {record.venue || "地點待補"}</p>
              </div>
              <div className="row-actions">
                <button className="square-button" onClick={() => startEdit(record)} type="button" aria-label="編輯">
                  <Pencil size={17} />
                </button>
                <button className="square-button danger" onClick={() => removeRecord(record.id)} type="button" aria-label="刪除">
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      {label}
      <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

export function AppShell({ mode = "public", basePath = "" }) {
  const { content, performances, error } = useSiteData(basePath);
  const isManage = mode === "manage";

  useEffect(() => {
    if (!content || isManage) return;
    recordVisit(basePath, content.profile.brandName);
  }, [basePath, content, isManage]);

  if (error) return <div className="loading-state">{error}</div>;
  if (!content) return <div className="loading-state">載入中</div>;

  return isManage ? (
    <ManageSite performances={performances} basePath={basePath} />
  ) : (
    <PublicSite content={content} performances={performances} basePath={basePath} />
  );
}
