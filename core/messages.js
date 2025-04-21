/**
 * Creates a message object.
 * @param {PipelineEventDetails} pipelineData - pipelineData.
 * @param {string} title - The title of the message.
 */
function createMessage (pipelineData, title) {
  const { status, url, urlText } = pipelineData;
  const colors = {
    started: '00c63f',
    ended: '0072C6',
    waiting: 'FFA500'
  };
  const link = {
    teams: `[${urlText}](${url})`,
    html: `<a href="${url}">${urlText}</a>`,
    slack: `<${url}|${urlText}>`,
  };
  const text = {
    teams: [],
    html: [],
    slack: [],
  };
  Object.entries(pipelineData)
    .filter(([key]) => !['url', 'urlText'].includes(key))
    .forEach(([key, value]) => {
      if (!value) return;
      text.teams.push(`*${key.toUpperCase()}*: ${value}`);
      text.slack.push(`*${key.toUpperCase()}*: ${value}`);
      text.html.push(`<b>${key.toUpperCase()}</b>: ${value}`);
  });
  text.teams.push(`*URL*: ${link.teams}`);
  text.slack.push(`*URL*: ${link.slack}`);
  text.html.push(`<b>URL</b>: ${link.html}`);

  return {
    title,
    slack: {
      text: '',
      attachments: [{
        color: `#${colors[status]}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${title}:\n${text.slack.join('\n')}`
            }
          }
        ]
      }]
    },
    email: `${text.html.join('<br/>')}`,
    teams: {
      '@context': 'https://schema.org/extensions',
      '@type': 'MessageCard',
      themeColor: colors[status],
      title,
      text: `${title}:\n${text.teams.join('\n')}`
    }
  }
}

module.exports = { createMessage };
