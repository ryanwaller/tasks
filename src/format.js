const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayDiff(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

export function dueLabel(date, now = new Date()) {
  if (!date) return null;
  const days = dayDiff(now, date);
  if (days < 0) return `overdue ${Math.abs(days)}d`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 6) return `in ${days}d`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export function isOverdue(date, now = new Date()) {
  return date ? dayDiff(now, date) < 0 : false;
}

export function sortDigestItems(items, now = new Date()) {
  return [...items].sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate, now);
    const bOverdue = isOverdue(b.dueDate, now);

    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    if (aOverdue && bOverdue) {
      const aTime = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
    }

    return a.pinIndex - b.pinIndex;
  });
}

export function formatDigestDate(now = new Date()) {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatItemLine(item, now = new Date()) {
  const label = dueLabel(item.dueDate, now);
  return label ? `• ${item.title} — ${label}` : `• ${item.title}`;
}

export function buildDigestPayload(items, now = new Date()) {
  const ordered = sortDigestItems(items, now);
  if (ordered.length === 0) return null;

  const dateLabel = formatDigestDate(now);
  const subject = `Next up for ${dateLabel}`;
  const lines = ordered.map((item) => formatItemLine(item, now));
  const text = [subject, "", ...lines].join("\n");
  const htmlLines = ordered.map((item) => {
    const label = dueLabel(item.dueDate, now);
    const suffix = label ? ` <span style="color:#666;">&mdash; ${escapeHtml(label)}</span>` : "";
    return `<li>${escapeHtml(item.title)}${suffix}</li>`;
  });
  const html = [
    `<h2 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(subject)}</h2>`,
    `<ul style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;">${htmlLines.join("")}</ul>`
  ].join("");

  return { subject, text, html, ordered };
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
