import test from "node:test";
import assert from "node:assert/strict";
import { petDockTransform } from "../src/lib/article-pet-dock-geometry.ts";
import {
  dismissBlogPet,
  isBlogPetDismissed,
} from "../src/lib/blog-pet-preference.ts";

test("docking aligns the complete floating sprite with the inline slot", () => {
  const floating = { left: 1100, top: 700, width: 144 };
  const inline = { left: 500, top: 420, width: 96 };
  const transform = petDockTransform(floating, inline);
  assert.equal(transform, "translate(-600px, -280px) scale(0.6666666666666666)");
});

test("docking preserves a same-sized sprite without deformation", () => {
  const floating = { left: 40, top: 80, width: 96 };
  const inline = { left: 180, top: 120, width: 96 };
  const transform = petDockTransform(floating, inline);
  assert.equal(transform, "translate(140px, 40px) scale(1)");
});

function browserStorage(t, storage) {
  const browser = new EventTarget();
  Object.defineProperty(browser, "localStorage", storage);
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  });
  return browser;
}

test("a stored dismissal applies to both floating and inline pets", (t) => {
  browserStorage(t, { value: { getItem: () => "1" } });
  const dismissed = isBlogPetDismissed();
  assert.equal(dismissed, true);
});

test("unavailable local storage leaves the pet usable", (t) => {
  browserStorage(t, { get() { throw new DOMException("denied", "SecurityError"); } });
  const dismissed = isBlogPetDismissed();
  assert.equal(dismissed, false);
});

test("dismissal still reaches the inline pet when storage is unavailable", (t) => {
  const browser = browserStorage(t, {
    value: { setItem() { throw new DOMException("full", "QuotaExceededError"); } },
  });
  let notifications = 0;
  browser.addEventListener("blog-pet-dismissed", () => notifications++);
  dismissBlogPet();
  assert.equal(notifications, 1);
});

test("dismissal retains the existing preference key", (t) => {
  const values = new Map();
  browserStorage(t, { value: { setItem: (key, value) => values.set(key, value) } });
  dismissBlogPet();
  assert.equal(values.get("blog-pet-dismissed"), "1");
});
