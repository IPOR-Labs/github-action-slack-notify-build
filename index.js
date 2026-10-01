import * as core from "@actions/core";
import * as github from "@actions/github";
import { WebClient } from "@slack/web-api";
import { buildSlackAttachments, formatChannelName } from "./src/utils.js";

async function run() {
  const channel = core.getInput("channel");
  const channelIdInput = core.getInput("channel_id");
  const status = core.getInput("status");
  const color = core.getInput("color");
  const messageId = core.getInput("message_id");
  const srcActor = core.getInput("src_actor");
  const srcRepository = core.getInput("src_repository");
  const srcWorkflow = core.getInput("src_workflow");
  const srcRunUrl = core.getInput("src_run_url");
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    core.setFailed("The SLACK_BOT_TOKEN environment variable is required.");
    return;
  }
  core.setSecret(token);

  if (!channel && !channelIdInput) {
    core.setFailed("You must provide either a 'channel' or a 'channel_id'.");
    return;
  }

  const slack = new WebClient(token);

  const attachments = buildSlackAttachments({
    status,
    color,
    github,
    srcActor,
    srcRepository,
    srcWorkflow,
    srcRunUrl,
  });
  const channelId =
    channelIdInput || (await lookUpChannelId({ slack, channel }));

  if (!channelId) {
    core.setFailed(`Slack channel ${channel} could not be found.`);
    return;
  }

  const args = { channel: channelId, attachments };
  const response = messageId
    ? await slack.chat.update({ ...args, ts: messageId })
    : await slack.chat.postMessage(args);

  core.setOutput("message_id", response.ts);
}

async function lookUpChannelId({ slack, channel }) {
  const formattedChannel = formatChannelName(channel);

  for await (const page of slack.paginate("conversations.list", {
    types: "public_channel, private_channel",
  })) {
    const match = page.channels.find((c) => c.name === formattedChannel);
    if (match) {
      return match.id;
    }
  }

  return undefined;
}

run().catch((error) => core.setFailed(error));
