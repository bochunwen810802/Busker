import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergePerformanceRecords } from "./performances.js";

const records = JSON.parse(readFileSync(new URL("../../public/data/performances.json", import.meta.url)));

const legacyJulyRecords = [
  {
    id: "old-july-19",
    date: "2026-07-19",
    year: 2026,
    title: "台中市太平區屯區藝文中心假日演出",
    category: "定點表演",
    venue: "台中市太平區屯區藝文中心",
    photo: "/old-july-19.jpg",
    photos: ["/old-july-19.jpg", "/old-july-19-2.jpg", "/old-july-19-3.jpg"]
  },
  {
    id: "old-july-25",
    date: "2026-07-25",
    year: 2026,
    title: "南屯區公所模範父親活動表演",
    category: "活動商演",
    venue: "潮港城國際美食宴會廳",
    photo: "/old-july-25.jpg",
    photos: ["/old-july-25.jpg", "/old-july-25-2.jpg"]
  }
];

test("the two legacy records in the screenshots are replaced entirely by the latest records", () => {
  assert.deepEqual(mergePerformanceRecords(records, legacyJulyRecords), records);
  assert.deepEqual(mergePerformanceRecords(legacyJulyRecords, records), records);
  assert.deepEqual(mergePerformanceRecords([...records, ...legacyJulyRecords]), records);
  assert.deepEqual(mergePerformanceRecords(mergePerformanceRecords(records, legacyJulyRecords), legacyJulyRecords), records);
});

test("replacement does not depend on the old IDs or 台/臺 spelling", () => {
  const legacy = legacyJulyRecords.map((item, index) => ({
    ...item,
    id: `another-old-id-${index}`,
    title: item.title.replaceAll("台", "臺"),
    venue: item.venue.replaceAll("台", "臺")
  }));
  assert.deepEqual(mergePerformanceRecords(records, legacy), records);
});

test("legacy records are retained when their replacement is unavailable", () => {
  assert.deepEqual(mergePerformanceRecords([], legacyJulyRecords), legacyJulyRecords);
});

test("old same-ID caches cannot remove replacement rules before the cloud merge", () => {
  const cached = records.map(({ supersedes, ...item }) => item);
  const withCache = mergePerformanceRecords(records, cached);
  assert.deepEqual(mergePerformanceRecords(withCache, legacyJulyRecords), records);
});

test("legacy entries cannot override the latest records even when they reuse their IDs", () => {
  const legacy = legacyJulyRecords.map((item, index) => ({ ...item, id: ["perf-092", "perf-091"][index] }));
  assert.deepEqual(mergePerformanceRecords(records, legacy), records);
});

test("July performances saved under different browser IDs appear once and retain photos", () => {
  const originals = records.filter((item) => ["perf-091", "perf-092"].includes(item.id));
  const cached = originals.map((item, index) => ({
    ...item,
    id: `perf-browser-${index}`,
    summary: "演出時間：14:00-15:00",
    photo: "/additional-photo.jpg",
    photos: ["/additional-photo.jpg"]
  }));
  const result = mergePerformanceRecords(records, cached);
  assert.equal(result.length, records.length);
  for (const original of originals) {
    const matches = result.filter((item) => item.date === original.date && item.title === original.title);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, original.id);
    assert.deepEqual(matches[0].photos, [...original.photos, "/additional-photo.jpg"]);
    assert.equal(matches[0].summary, cached[0].summary);
  }
  assert.deepEqual(mergePerformanceRecords(result, cached), result);
});

test("same-ID edits still replace titles, dates and removed photos", () => {
  const original = records.find((item) => item.id === "perf-092");
  const edited = { ...original, title: "更新後活動名稱", date: "2026-07-20", photo: "", photos: [] };
  assert.deepEqual(mergePerformanceRecords([original], [edited]), [edited]);
});

test("spacing, character width and 台/臺 variants identify the same event", () => {
  const original = records.find((item) => item.id === "perf-091");
  const cached = { ...original, id: "other", date: "２０２６.０７.２５", title: original.title.replace("臺", "台") + " ", venue: " 潮港城 國際美食館 " };
  assert.equal(mergePerformanceRecords([original], [cached]).length, 1);
});

test("different dates, titles or venues remain separate performances", () => {
  const original = records.find((item) => item.id === "perf-092");
  const others = [
    { ...original, id: "other-date", date: "2026-07-20" },
    { ...original, id: "other-title", title: "同場地另一場活動" },
    { ...original, id: "other-venue", venue: "另一個場地" }
  ];
  assert.equal(mergePerformanceRecords([original], others).length, 4);
});

test("incomplete records with different IDs are retained", () => {
  const incomplete = [{ id: "one", date: "2026-07-19" }, { id: "two", date: "2026-07-19" }];
  assert.deepEqual(mergePerformanceRecords(incomplete), incomplete);
});

test("current source records remain unchanged", () => {
  assert.deepEqual(mergePerformanceRecords(records), records);
});
