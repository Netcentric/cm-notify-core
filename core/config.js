const { CMUtils } = require('../utils');

CMUtils.initDotEnv();

const DEFAULT_CONFIG = {
  slackWebhook: process.env.SLACK_WEBHOOK,
  teamsWebhook: process.env.TEAMS_WEBHOOK,
  teamsEmail: process.env.TEAMS_EMAIL,
  orgName: process.env.ORGANIZATION_NAME,
  clientId: process.env.CLIENT_ID,
  title: process.env.TITLE || 'Cloud Manager Pipeline Notification',
  fromEmail: process.env.EMAIL_FROM,
  dataPath: process.env.DATA_PATH || '.data',
  secret: process.env.SECRET,
}

module.exports = {
  DEFAULT_CONFIG
};
