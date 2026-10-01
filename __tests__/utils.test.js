import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSlackAttachments, formatChannelName } from "../src/utils.js";
import { GITHUB_PR_EVENT, GITHUB_PUSH_EVENT } from "../fixtures.js";

// Read lazily by @actions/github (context.repo) and by buildSlackAttachments,
// so setting them after the imports above is safe.
process.env.GITHUB_RUN_ID = "1";
process.env.GITHUB_RUN_ATTEMPT = "2";
process.env.GITHUB_REPOSITORY = "voxmedia/github-action-slack-notify-build";

const REPO_URL = "https://github.com/voxmedia/github-action-slack-notify-build";

function build(github, overrides = {}) {
  return buildSlackAttachments({
    status: "STARTED",
    color: "good",
    github,
    ...overrides,
  });
}

function field(attachments, title) {
  return attachments[0].fields.find((f) => f && f.title === title);
}

describe("formatChannelName", () => {
  it("strips #", () => {
    assert.equal(formatChannelName("#app-notifications"), "app-notifications");
  });

  it("strips @", () => {
    assert.equal(formatChannelName("@app.buddy"), "app.buddy");
  });
});

describe("buildSlackAttachments", () => {
  it("passes color", () => {
    assert.equal(build(GITHUB_PUSH_EVENT)[0].color, "good");
  });

  it("shows status", () => {
    assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "Status"), {
      title: "Status",
      value: "STARTED",
      short: true,
    });
  });

  it("links to the actor", () => {
    assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "By"), {
      title: "By",
      value: "<https://github.com/octocat | octocat>",
      short: true,
    });
  });

  it("omits source fields when not provided", () => {
    const attachments = build(GITHUB_PUSH_EVENT);

    assert.equal(field(attachments, "Source workflow"), undefined);
    assert.equal(field(attachments, "Source by"), undefined);
  });

  it("shows source workflow fields when provided", () => {
    const attachments = build(GITHUB_PUSH_EVENT, {
      srcActor: "hubot",
      srcRepository: "org/app",
      srcWorkflow: "Deploy",
      srcRunUrl: "https://github.com/org/app/actions/runs/42",
    });

    assert.deepEqual(field(attachments, "Source workflow"), {
      title: "Source workflow",
      value: "<https://github.com/org/app/actions/runs/42 | org/app: Deploy>",
      short: true,
    });
    assert.deepEqual(field(attachments, "Source by"), {
      title: "Source by",
      value: "<https://github.com/hubot | hubot>",
      short: true,
    });
  });

  describe("for push events", () => {
    it("links to the action workflow run attempt", () => {
      assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "Workflow"), {
        title: "Workflow",
        value: `<${REPO_URL}/actions/runs/1/attempts/2 | CI>`,
        short: true,
      });
    });

    it("links to the action repo", () => {
      assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "Repo"), {
        title: "Repo",
        value: `<${REPO_URL} | voxmedia/github-action-slack-notify-build>`,
        short: true,
      });
    });

    it("shows the event name", () => {
      assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "Event"), {
        title: "Event",
        value: "push",
        short: true,
      });
    });

    it("links to the branch", () => {
      assert.deepEqual(field(build(GITHUB_PUSH_EVENT), "Branch"), {
        title: "Branch",
        value: `<${REPO_URL}/commit/abc123 | my-branch>`,
        short: true,
      });
    });
  });

  describe("for PR events", () => {
    it("links to the action workflow run attempt", () => {
      assert.deepEqual(field(build(GITHUB_PR_EVENT), "Workflow"), {
        title: "Workflow",
        value: `<${REPO_URL}/actions/runs/1/attempts/2 | CI>`,
        short: true,
      });
    });

    it("shows the event name", () => {
      assert.deepEqual(field(build(GITHUB_PR_EVENT), "Event"), {
        title: "Event",
        value: "pull_request",
        short: true,
      });
    });

    it("links to the PR", () => {
      assert.deepEqual(field(build(GITHUB_PR_EVENT), "Pull Request"), {
        title: "Pull Request",
        value:
          "<https://github.com/zuplo/github-action-slack-notify-build/pulls/1 | This is a PR>",
        short: true,
      });
    });
  });
});
