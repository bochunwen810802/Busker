import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergePerformanceRecords } from "./performances.js";

const records = JSON.parse(readFileSync(new URL("../../public/data/performances.json", import.meta.url)));

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
