import test from "node:test";
import assert from "node:assert/strict";
import { barcode, buildTicket, isSkim, sectionsRead, shortDuration, ticketCode, xIntent } from "../src/lib/reading-ticket.ts";
import { odometer } from "../src/lib/article-like-card.ts";

const base = {
  lang: "zh", title: "月刊（第36期）：伊始", slug: "weekly-36", now: new Date(2026, 9, 31, 21, 5),
  seconds: 13 * 60, minutes: 12, read: 8, total: 8, progress: 1,
  images: 18, words: 4994, views: 2178, country: { code: "SG", name: "新加坡" }, online: 1, regions: 20,
  liked: false, likes: 17,
};

test("a full read fills every cell from real data", () => {
  const v = buildTicket(base);
  assert.equal(v.skim, false);
  assert.equal(v.admit, "ADMIT ONE");
  assert.equal(v.date, "2026-10-31");
  assert.equal(v.time, "13 分钟");
  assert.equal(v.readCell, "8/8 节");
  assert.equal(v.seat, "第 2,179 位");
  assert.equal(v.seatNo, "No.002179");
  assert.equal(v.online, "只有你在读");
  assert.equal(v.fine, "18 张配图 · 4,994 字 · 读者来自 20 个地区");
  assert.equal(`${v.sumBig}${v.sumSmall} ${v.sumState}`, "8/8 节 · 读完");
  assert.equal(v.code, "URSB-WEEK-002179");
  assert.equal(v.echo, null);
});

test("missing data hides the cell instead of guessing", () => {
  const v = buildTicket({ ...base, views: null, country: null, online: null, regions: null, images: 0 });
  assert.equal(v.seat, null);
  assert.equal(v.seatNo, null);
  assert.equal(v.from, null);
  assert.equal(v.online, null);
  assert.equal(v.fine, "4,994 字");
  assert.equal(v.code, "URSB-WEEK-20261031");
});

test("liking stamps the echo with the count and the day", () => {
  const v = buildTicket({ ...base, liked: true, likes: 18 });
  assert.deepEqual(v.echo, { likes: "♥ 18", date: "10.31" });
});

test("a skim reads as halfway and asks the reader back", () => {
  const v = buildTicket({ ...base, seconds: 90, read: 3 });
  assert.equal(v.skim, true);
  assert.equal(v.admit, "半程 · 未检票");
  assert.equal(v.sumState, "节 · 读到一半");
  assert.match(v.fine, /^跳读到结尾 · 还剩约 8 分钟/);
  assert.equal(v.shareText, "我在读《月刊（第36期）：伊始》");
});

test("articles without sections count in percent", () => {
  const v = buildTicket({ ...base, total: 0, read: 0, progress: 0.97, lang: "en" });
  assert.equal(v.readCell, "97%");
  assert.equal(`${v.sumBig}${v.sumSmall}`, "97%");
  assert.equal(v.sumState, "done");
});

test("skim rule: under 35% of the estimate or under 60% of the article", () => {
  assert.equal(isSkim({ seconds: 600, minutes: 10, read: 5, total: 8, progress: 1 }), false);
  assert.equal(isSkim({ seconds: 200, minutes: 10, read: 8, total: 8, progress: 1 }), true);
  assert.equal(isSkim({ seconds: 600, minutes: 10, read: 4, total: 8, progress: 1 }), true);
  assert.equal(isSkim({ seconds: 600, minutes: 10, read: 0, total: 0, progress: 0.5 }), true);
});

test("helpers: duration, sections, barcode, code and share link", () => {
  assert.equal(shortDuration(42, "zh"), "42 秒");
  assert.equal(shortDuration(150, "en"), "3 min");
  assert.equal(sectionsRead([100, 900, 1300], 880), 2);
  const bars = barcode("URSB-WEEK-002179", 40);
  assert.equal(bars.length, 40);
  assert.ok(bars.every((w) => w >= 1 && w <= 3));
  assert.deepEqual(barcode("URSB-WEEK-002179", 40), bars);
  assert.equal(ticketCode("", 5, base.now), "URSB-POST-000005");
  assert.equal(xIntent("a b", "https://x.y/"), "https://twitter.com/intent/tweet?text=a%20b&url=https%3A%2F%2Fx.y%2F");
});

test("the like counter rolls only the digits that change", () => {
  assert.deepEqual(odometer(null, 18).map((d) => d.roll), [false, false]);
  assert.deepEqual(odometer(17, 18), [{ from: "1", to: "1", roll: false }, { from: "7", to: "8", roll: true }]);
  assert.deepEqual(odometer(9, 10), [{ from: "", to: "1", roll: true }, { from: "9", to: "0", roll: true }]);
});
