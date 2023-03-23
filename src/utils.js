const { context } = require('@actions/github');

function formatSourceWorkflow(srcRunUrl, srcRepository, srcWorkflow) {
  let result = '';

  if (srcRunUrl) result += `<${srcRunUrl} | `;
  if (srcRepository) result += srcRepository;
  if (srcWorkflow) {
    result += srcRepository ? `: ${srcWorkflow}` : srcWorkflow;
  }
  if (srcRunUrl) result += `>`;

  return result;
}

function buildSlackAttachments({ status, color, github, srcActor, srcRepository, srcWorkflow, srcRunUrl }) {
  const { payload, ref, workflow, eventName, actor } = github.context;
  const { owner, repo } = context.repo;
  const event = eventName;
  const branch = event === 'pull_request' ? payload.pull_request.head.ref : ref.replace('refs/heads/', '');

  const sha = event === 'pull_request' ? payload.pull_request.head.sha : github.context.sha;
  const runId = parseInt(process.env.GITHUB_RUN_ID, 10);
  const runAttempt = parseInt(process.env.GITHUB_RUN_ATTEMPT, 10);
  const formattedSrcWorkflow = formatSourceWorkflow(srcRunUrl, srcRepository, srcWorkflow);

  const referenceLink =
    event === 'pull_request'
      ? {
          title: 'Pull Request',
          value: `<${payload.pull_request.html_url} | ${payload.pull_request.title}>`,
          short: true,
        }
      : {
          title: 'Branch',
          value: `<https://github.com/${owner}/${repo}/commit/${sha} | ${branch}>`,
          short: true,
        };

  return [
    {
      color,
      fields: [
        {
          title: 'Repo',
          value: `<https://github.com/${owner}/${repo} | ${owner}/${repo}>`,
          short: true,
        },
        {
          title: 'Workflow',
          value: `<https://github.com/${owner}/${repo}/actions/runs/${runId}/attempts/${runAttempt} | ${workflow}>`,
          short: true,
        },
        {
          title: 'Status',
          value: status,
          short: true,
        },
        referenceLink,
        {
          title: 'Event',
          value: event,
          short: true,
        },
        {
          title: 'By',
          value: `<https://github.com/${actor} | ${actor}>`,
          short: true,
        },
        formattedSrcWorkflow && {
          title: 'Source workflow',
          value: formattedSrcWorkflow,
          short: true,
        },
        srcActor && {
          title: 'Source by',
          value: `<https://github.com/${srcActor} | ${srcActor}>`,
          short: true,
        },
      ],
      footer_icon: 'https://github.githubassets.com/favicon.ico',
      footer: `<https://github.com/${owner}/${repo} | ${owner}/${repo}>`,
      ts: Math.floor(Date.now() / 1000),
    },
  ];
}

module.exports.buildSlackAttachments = buildSlackAttachments;

function formatChannelName(channel) {
  return channel.replace(/[#@]/g, '');
}

module.exports.formatChannelName = formatChannelName;
