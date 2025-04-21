const { CMUtils } = require('./utils');
const { Events } = require('./events');
const { Notifications } = require('./notifications');
const { DEFAULT_CONFIG } = require('./config');

/**
 * @typedef {Object} CmNotifyConfig
 * @property {string} [slackWebhook] - The Slack webhook URL (default: from environment variable SLACK_WEBHOOK).
 * @property {string} [teamsEmail] - The Teams channel email address (default: from environment variable TEAMS_EMAIL).
 * @property {string} [teamsWebhook] - The Teams webhook URL (default: from environment variable TEAMS_WEBHOOK).
 * @property {string} [orgName] - The name of the organization (default: from environment variable ORGANIZATION_NAME).
 * @property {string} [clientId] - The client ID (default: from environment variable CLIENT_ID).
 * @property {string} [title] - The title of the notification (default: 'Cloud Manager Pipeline Notification').
 * @property {string} [fromEmail] - The sender's email address (default: from environment variable EMAIL_FROM).
 * @property {string} [dataPath] - The path to the directory containing data JSON files (default: from environment variable DATA_PATH or './data').
 */

/**
 * @typedef {Object} ErrorSimple
 * @property {string} error - Error message.
 */

class CMNotify {
  /**
   * @constructor
   * @param {CmNotifyConfig} config - Configuration object for CMNotify.
   */
  constructor(config = {}) {
    const {
      slackWebhook,
      teamsWebhook,
      teamsEmail,
      orgName,
      clientId,
      title,
      fromEmail,
      dataPath
    } = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.__messengerConfig = {
      slackWebhook,
      teamsWebhook,
      teamsEmail
    };

    this.notifications = new Notifications(this.__messengerConfig, title, fromEmail, dataPath);
    this.events = new Events(orgName, clientId, title, dataPath);
  }

  /**
   * Validates the request body and checks for valid events.
   * @param requestBody
   * @returns {PipelineEventDetails[]|ErrorSimple}}
   */
  validate(requestBody) {
    if (Object.values(this.__messengerConfig).length  === 0) {
      return { error: 'No notification method configured' };
    }

    const validEvents = this.events.getValidEvents(requestBody);
    if (validEvents?.error) {
      return { error: validEvents.error || 'No valid events found' };
    }

    return validEvents;
  }

  /**
   * Sends notifications to the configured channels.
   * @param requestBody
   * @param waitResponse {boolean} - If true, waits for all notifications to be settled before returning.
   * @returns {Promise<Array<PromiseSettledResult<Awaited<*>>>|boolean>}
   */
  async post(requestBody, waitResponse = false) {
    const validEvents = this.validate(requestBody);
    if (!validEvents || validEvents.error) {
      const errorMessage = validEvents?.error || 'No valid events found';
      console.warn(errorMessage);
      throw new Error(errorMessage);
    }

    const promises = [];
    validEvents.forEach(event => {
      if (this.__messengerConfig.slackWebhook) {
        promises.push(this.notifications.notifySlack(event));
      }
      if (this.__messengerConfig.teamsEmail) {
        promises.push(this.notifications.notifyEmail(event));
      }
      if (this.__messengerConfig.teamsWebhook) {
        promises.push(this.notifications.notifyTeams(event));
      }
    });

    if (waitResponse) {
      return Promise.allSettled(promises);
    }
    return true;
  }
}

/**
 * Sends notifications to the configured channels.
 * @param requestBody
 * @param {boolean} [waitResponse] - If true, waits for all notifications to be settled before returning.
 * @param {CmNotifyConfig} [cmConfig]
 * @returns {Promise<Array<PromiseSettledResult<Awaited<*>>>|boolean>}
 */
async function cmNotify(requestBody, waitResponse, cmConfig) {
  const cmNotify = new CMNotify(cmConfig);
  return cmNotify.post(requestBody, waitResponse);
}

module.exports = {
  cmNotify,
  CMNotify,
  CMUtils
}
