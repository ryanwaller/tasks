const NOTION_VERSION = "2026-03-11";
const PERSONAL_SETTINGS_TITLE = "__Tasks Settings__";

export async function fetchPinnedDigestItems({
  notionApiKey,
  personalTasksDataSourceId,
  now = new Date()
}) {
  const settingsPage = await findPersonalSettingsPage({
    notionApiKey,
    personalTasksDataSourceId
  });

  if (!settingsPage) {
    return [];
  }

  const settings = await fetchSettingsFromPage({
    notionApiKey,
    pageId: settingsPage.id
  });

  const pinKeys = settings?.pinnedKeys ?? [];
  if (pinKeys.length === 0) {
    return [];
  }

  const resolved = await Promise.all(
    pinKeys.map(async (key, pinIndex) => {
      const pageId = extractPageId(key);
      if (!pageId) return null;

      try {
        const page = await notionRequest({
          notionApiKey,
          path: `/pages/${pageId}`,
          method: "GET"
        });
        const item = decodePinnedPage(page, key);
        if (!item || item.isDone) return null;
        return {
          ...item,
          pinKey: key,
          pinIndex
        };
      } catch (error) {
        console.warn(`Skipping pinned key ${key}: ${error.message}`);
        return null;
      }
    })
  );

  return resolved.filter(Boolean);
}

async function findPersonalSettingsPage({ notionApiKey, personalTasksDataSourceId }) {
  const response = await notionRequest({
    notionApiKey,
    path: `/data_sources/${personalTasksDataSourceId}/query`,
    method: "POST",
    body: { page_size: 100 }
  });

  return response.results?.find((page) => {
    const title = getTitleProperty(page.properties?.Name);
    return title?.trim() === PERSONAL_SETTINGS_TITLE;
  }) ?? null;
}

async function fetchSettingsFromPage({ notionApiKey, pageId }) {
  const response = await notionRequest({
    notionApiKey,
    path: `/blocks/${pageId}/children?page_size=100`,
    method: "GET"
  });

  const text = (response.results ?? [])
    .filter((block) => block.type === "paragraph")
    .map((block) => {
      const richText = block.paragraph?.rich_text ?? [];
      return richText.map((item) => item.plain_text ?? "").join("");
    })
    .join("")
    .trim();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(`Could not parse settings page JSON: ${error.message}`);
    return null;
  }
}

function extractPageId(pinKey) {
  const parts = String(pinKey).split(":");
  if (parts.length !== 2) return null;
  const [kind, pageId] = parts;
  if (!["personal", "notion"].includes(kind)) return null;
  return pageId;
}

function decodePinnedPage(page, pinKey) {
  const kind = String(pinKey).split(":")[0];
  if (kind === "personal") {
    const title = getTitleProperty(page.properties?.Name);
    if (!title) return null;
    return {
      id: page.id,
      source: "personal",
      title,
      isDone: Boolean(page.properties?.Done?.checkbox),
      dueDate: parseNotionDate(page.properties?.Due?.date?.start),
      url: page.url
    };
  }

  if (kind === "notion") {
    const title = getTitleProperty(page.properties?.Task);
    if (!title) return null;
    const status = page.properties?.Status?.status?.name ?? null;
    return {
      id: page.id,
      source: "notion",
      title,
      isDone: status === "Done",
      dueDate: parseNotionDate(page.properties?.["Date(s)"]?.date?.start),
      url: page.url
    };
  }

  return null;
}

function getTitleProperty(property) {
  if (!property || property.type !== "title") return null;
  const text = (property.title ?? []).map((item) => item.plain_text ?? "").join("").trim();
  return text || null;
}

function parseNotionDate(value) {
  if (!value) return null;
  if (!String(value).includes("T")) {
    const localNoon = new Date(`${value}T12:00:00`);
    return Number.isNaN(localNoon.getTime()) ? null : localNoon;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function notionRequest({ notionApiKey, path, method, body }) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion ${response.status}: ${text}`);
  }

  return response.json();
}
