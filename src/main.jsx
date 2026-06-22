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

function PhotoCarousel({ photos, title, onOpen, compact = false }) {
  const safePhotos = photos.filter(Boolean);
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

function PhotoLightbox({ title, photos, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="lightbox-shell" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button className="lightbox-close" type="button" onClick={onClose} aria-label="關閉">
          <X size={20} />
        </button>
        <div className="lightbox-stage">
          <button className="lightbox-arrow left" type="button" onClick={() => setIndex((current) => (current - 1 + photos.length) % photos.length)} aria-label="上一張">
            <ChevronLeft size={22} />
          </button>
          <img src={photos[index]} alt={title} />
          <button className="lightbox-arrow right" type="button" onClick={() => setIndex((current) => (current + 1) % photos.length)} aria-label="下一張">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="lightbox-meta">
          <strong>{title}</strong>
          <span>
            {index + 1} / {photos.length}
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
        <img className="hero-image" src={content.profile.heroImage} alt="草帽女孩溫柏淳形象照" />
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
                    {getPhotos(item).length > 0 ? (
                      <PhotoCarousel
                        compact
                        photos={getPhotos(item)}
                        title={item.title}
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

export function ManageSite({ performances, basePath = "" }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("bochun-admin") === "yes");
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState(performances);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyPerformance);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRecords(performances);
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
    setForm(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyPerformance, id: `perf-${Date.now()}` });
  }

  function submitRecord(event) {
    event.preventDefault();
    const next = {
      ...form,
      id: form.id || `perf-${Date.now()}`,
      year: inferYear(form.date, form.year),
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
        setRecords(parsed);
        setMessage(`已匯入 ${parsed.length} 筆演出紀錄。`);
      } catch {
        setMessage("匯入失敗，請確認檔案是 performances.json 格式。");
      }
    };
    reader.readAsText(file);
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
          <Field label="照片路徑" value={form.photo} onChange={(value) => setForm({ ...form, photo: value })} />
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

  if (error) return <div className="loading-state">{error}</div>;
  if (!content) return <div className="loading-state">載入中</div>;

  return isManage ? (
    <ManageSite performances={performances} basePath={basePath} />
  ) : (
    <PublicSite content={content} performances={performances} basePath={basePath} />
  );
}
