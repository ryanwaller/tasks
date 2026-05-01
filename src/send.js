export async function sendEmail({
  resendApiKey,
  from,
  to,
  subject,
  text,
  html
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ${response.status}: ${body}`);
  }

  return response.json();
}

export async function sendSlackMessage({
  slackBotToken,
  channelId,
  text
}) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackBotToken}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      mrkdwn: true
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(`Slack error: ${JSON.stringify(payload)}`);
  }

  return payload;
}
