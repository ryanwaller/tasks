import { buildDigestPayload } from "./format.js";
import { fetchPinnedDigestItems } from "./notion.js";
import { sendEmail, sendSlackMessage } from "./send.js";

async function main() {
  const env = readEnv();
  const items = await fetchPinnedDigestItems({
    notionApiKey: env.NOTION_API_KEY,
    personalTasksDataSourceId: env.NOTION_PERSONAL_TASKS_DATA_SOURCE_ID
  });

  const digest = buildDigestPayload(items, new Date());

  if (!digest) {
    console.log("No pinned items to send. Exiting quietly.");
    return;
  }

  console.log(`Prepared digest with ${digest.ordered.length} item(s).`);
  console.log(digest.text);

  if (env.DRY_RUN) {
    console.log("Dry run enabled. No email or Slack message sent.");
    return;
  }

  if (env.RUN_TARGET === "email" || env.RUN_TARGET === "both") {
    await sendEmail({
      resendApiKey: env.RESEND_API_KEY,
      from: env.DIGEST_FROM_EMAIL,
      to: env.DIGEST_TO_EMAIL,
      subject: digest.subject,
      text: digest.text,
      html: digest.html
    });
    console.log("Email sent.");
  }

  if (env.RUN_TARGET === "slack" || env.RUN_TARGET === "both") {
    await sendSlackMessage({
      slackBotToken: env.SLACK_BOT_TOKEN,
      channelId: env.SLACK_CHANNEL_ID,
      text: `*${digest.subject}*\n\n${digest.text.split("\n").slice(2).join("\n")}`
    });
    console.log("Slack message sent.");
  }
}

function readEnv() {
  const env = {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    NOTION_PERSONAL_TASKS_DATA_SOURCE_ID: process.env.NOTION_PERSONAL_TASKS_DATA_SOURCE_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    DIGEST_FROM_EMAIL: process.env.DIGEST_FROM_EMAIL,
    DIGEST_TO_EMAIL: process.env.DIGEST_TO_EMAIL,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    RUN_TARGET: process.env.RUN_TARGET ?? "both",
    DRY_RUN: process.env.DRY_RUN === "true"
  };

  const requiredAlways = [
    "NOTION_API_KEY",
    "NOTION_PERSONAL_TASKS_DATA_SOURCE_ID"
  ];

  const requiredForEmail = [
    "RESEND_API_KEY",
    "DIGEST_FROM_EMAIL",
    "DIGEST_TO_EMAIL"
  ];

  const requiredForSlack = [
    "SLACK_BOT_TOKEN",
    "SLACK_CHANNEL_ID"
  ];

  assertPresent(env, requiredAlways);
  if (env.RUN_TARGET === "email" || env.RUN_TARGET === "both") {
    assertPresent(env, requiredForEmail);
  }
  if (env.RUN_TARGET === "slack" || env.RUN_TARGET === "both") {
    assertPresent(env, requiredForSlack);
  }

  return env;
}

function assertPresent(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
