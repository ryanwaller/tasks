# Morning Digest

Small GitHub Actions automation that sends your pinned tasks:

- email at `8:00 AM` every day
- Slack at `9:30 AM`, Monday through Friday

It reads the same pinned list your FloatyTasks app syncs into the hidden
`__Tasks Settings__` page in your Personal Tasks Notion database.

## Behavior

- If there are no pinned items, it sends nothing.
- Completed items are excluded.
- Overdue items float to the top.
- Everything else stays in manual pin order.

## Required GitHub Actions secrets

- `NOTION_API_KEY`
- `NOTION_PERSONAL_TASKS_DATA_SOURCE_ID`
- `RESEND_API_KEY`
- `DIGEST_FROM_EMAIL`
- `DIGEST_TO_EMAIL`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`

## Manual testing

Use the `Morning Digest` workflow with:

- `target = both`, `email`, or `slack`
- `dry_run = true` to preview without sending

## Local usage

```bash
node src/run-digest.js
node --test
```
