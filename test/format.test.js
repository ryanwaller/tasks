import test from "node:test";
import assert from "node:assert/strict";

import { buildDigestPayload, dueLabel, sortDigestItems } from "../src/format.js";

test("dueLabel formats relative dates like the app", () => {
  const now = new Date("2026-05-01T12:00:00-04:00");
  assert.equal(dueLabel(new Date("2026-04-29T12:00:00-04:00"), now), "overdue (by 2d)");
  assert.equal(dueLabel(new Date("2026-05-01T12:00:00-04:00"), now), "due today");
  assert.equal(dueLabel(new Date("2026-05-02T12:00:00-04:00"), now), "due tomorrow");
  assert.equal(dueLabel(new Date("2026-05-05T12:00:00-04:00"), now), "due May 5");
});

test("sortDigestItems floats overdue items to the top, then keeps pin order", () => {
  const now = new Date("2026-05-01T12:00:00-04:00");
  const items = [
    { title: "Pinned first", pinIndex: 0, dueDate: null },
    { title: "Overdue more", pinIndex: 1, dueDate: new Date("2026-04-27T12:00:00-04:00") },
    { title: "Pinned third", pinIndex: 2, dueDate: null },
    { title: "Overdue less", pinIndex: 3, dueDate: new Date("2026-04-30T12:00:00-04:00") }
  ];

  const orderedTitles = sortDigestItems(items, now).map((item) => item.title);
  assert.deepEqual(orderedTitles, [
    "Overdue more",
    "Overdue less",
    "Pinned first",
    "Pinned third"
  ]);
});

test("buildDigestPayload returns null for empty digests", () => {
  assert.equal(buildDigestPayload([], new Date("2026-05-01T12:00:00-04:00")), null);
});

test("buildDigestPayload personalizes the subject line", () => {
  const now = new Date("2026-05-04T12:00:00-04:00");
  const digest = buildDigestPayload([
    {
      source: "personal",
      title: "Personal task",
      dueDate: null,
      pinIndex: 0
    }
  ], now);

  assert.equal(digest.subject, "Next up for Ryan, today, Monday, May 4");
});

test("buildDigestPayload adds status labels for notion items only", () => {
  const now = new Date("2026-05-01T12:00:00-04:00");
  const digest = buildDigestPayload([
    {
      source: "notion",
      title: "Team task",
      status: "Basically done",
      dueDate: null,
      pinIndex: 0
    },
    {
      source: "personal",
      title: "Personal task",
      dueDate: null,
      pinIndex: 1
    }
  ], now);

  assert.match(digest.text, /Team task \(basically done\)/);
  assert.doesNotMatch(digest.text, /Personal task \(/);
});

test("buildDigestPayload appends due labels after notion status", () => {
  const now = new Date("2026-05-01T12:00:00-04:00");
  const digest = buildDigestPayload([
    {
      source: "notion",
      title: "Team task",
      status: "In progress",
      dueDate: new Date("2026-04-27T12:00:00-04:00"),
      pinIndex: 0
    },
    {
      source: "personal",
      title: "Personal task",
      dueDate: new Date("2026-05-03T12:00:00-04:00"),
      pinIndex: 1
    }
  ], now);

  assert.match(digest.text, /Team task \(in progress\) — overdue \(by 4d\)/);
  assert.match(digest.text, /Personal task — due May 3/);
});
