const { CMUtils } = require('./utils');
const { Events } = require('./events');
const { Notifications } = require('./notifications');
const { CMVerify } = require('./verify');

/**
 * @typedef {Object} CmNotifyConfig
 * @property {string} [slackWebhook] - The Slack webhook URL (default: from environment variable SLACK_WEBHOOK).
 * @property {string} [teamsEmail] - The Teams channel email address (default: from environment variable TEAMS_EMAIL).
 * @property {string} [teamsWebhook] - The Teams webhook URL (default: from environment variable TEAMS_WEBHOOK).
 * @property {string} [orgName] - The name of the organization (default: from environment variable ORGANIZATION_NAME).
 * @property {string} [clientId] - The client ID (default: from environment variable CLIENT_ID).
 * @property {string} [title] - The title of the notification (default: 'Cloud Manager Pipeline Notification').
 * @property {string} [fromEmail] - The sender's email address (default: from environment variable EMAIL_FROM).
 * @property {string} [dataPath] - The path to the directory containing data JSON files (default: from environment variable DATA_PATH or '.data').
 * @property {string} [secret] - The secret used for HMAC verification (default: from environment variable SECRET).
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
    const DEFAULT_CONFIG = CMUtils.getDefaultConfig();
    const {
      slackWebhook,
      teamsWebhook,
      teamsEmail,
      orgName,
      clientId,
      title,
      fromEmail,
      dataPath,
      secret
    } = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.secret = secret;
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
    if (validEvents.error) {
      return { error: validEvents.error};
    }

    return validEvents;
  }

  /**
   * Parses the raw body from the request parameters.
   * @param {string} rawBody
   * @returns {any|null}
   */
  parseRawBody(rawBody) {
    let bodyString = rawBody;
    if (CMUtils.isBase64(rawBody)) {
      bodyString = atob(rawBody);
    }
    try {
      return JSON.parse(bodyString);
    } catch (error) {
      console.error('Error parsing raw body:', error.message);
      return null;
    }
  }

  parseBody(req) {
    const body = req?.__ow_body || req?.body;
    if (!body || typeof body !== 'string') {
      return body;
    }
    return this.parseRawBody(body);
  }

  /**
   * Sends notifications to the configured channels.
   * @param {Object} req - The request object containing the event data.
   * @param {Object} [config] - Configuration options for the method.
   * @param {boolean} [config.verify=false] - If true, verifies the request signature before processing.
   * @param {boolean} [config.waitResponse=false] - If true, waits for all notifications to be settled before returning.
   * @returns {Promise<Array<PromiseSettledResult<Awaited<*>>>|boolean>} - Returns a promise that resolves to the notification results or a boolean.
   */
  async post(req, {
    verify = false,
    waitResponse = false
  } = {}) {
    const isVerified = verify ? CMVerify.verify(req, this.secret) : true;
    if (!isVerified) {
      throw new Error('Invalid signature');
    }
    const parsedBody = this.parseBody(req);
    const validEvents = this.validate(parsedBody);
    if (validEvents.error) {
      throw new Error(validEvents.error);
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
    Promise.allSettled(promises)
      .then(results => {
        console.log('Done. ', results);
      })
      .catch(error => {;
        console.error('Error. ', error);
      });
    return true;
  }
}

module.exports = {
  CMNotify
}
