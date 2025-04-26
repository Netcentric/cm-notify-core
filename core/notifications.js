const { Email } = require('./email');
const { createMessage } = require('./messages');

/**
 * @typedef {Object} MessengerConfig
 * @property {string} slackWebhook - The Slack webhook URL.
 * @property {string} teamsEmail - The Teams channel email address.
 * @property {string} teamsWebhook - The Teams webhook URL.
 */

class Notifications {
  /**
   * @constructor
   * @param {MessengerConfig} messengerConfig - Configuration object for notification methods.
   * @param {string} title - The title of the notification.
   * @param {string} fromEmail - The email address of the sender.
   * @param {string} dataPath - The path to the directory containing credentials JSON file.
   */
  constructor (messengerConfig, title, fromEmail, dataPath) {
    this.messengerConfig = messengerConfig;
    this.title = title;
    this.fromEmail = fromEmail;
    this.dataPath = dataPath;
    this.emailClient = null;
  }
  /**
   * Sends a notification to a Webhook.
   * @param {string} url - The URL of the webhook.
   * @param {Object} body - The body of the notification.
   * @returns {Promise<number>} - The status code of the response.
   */
   async webhook(url, body) {
    if (!url) {
      console.error('Missing webhook URL');
      throw new Error('Missing webhook URL');
    }
    const res = await fetch(url, {
      'method': 'POST',
      'headers': { 'Content-Type': 'application/json' },
      'body': JSON.stringify(body)
    });
    if (res.status === 200) {
      console.log('Notification sent successfully');
      return res.status;
    } else {
      throw new Error(res.statusText);
    }
  }
  /**
   * Sends a notification to the Email.
   * @param {PipelineEventDetails} pipelineData - pipelineData.
   * @returns {Promise<number>} - The status code of the response.
   * @param {string} title - The title of the message.
   * @param {string} fromEmail - The email address of the sender.
   * @param {string} dataPath - The path to the directory containing credentials JSON file.
   */
  async notifyEmail(pipelineData, title = this.title, fromEmail = this.fromEmail, dataPath = this.dataPath) {
    this.emailClient = this.emailClient || new Email(fromEmail, dataPath);
    const message = createMessage(pipelineData, title);
    console.log('Notify email with message: ', message.email);
    return this.getPromise(
      this.emailClient.send.bind(this.emailClient),
      this.messengerConfig.teamsEmail, message.title, message.email
    );
  }

  /**
   * Sends a notification to Slack.
   * @param {PipelineEventDetails} pipelineData - pipelineData.
   * @returns {Promise<number>} - The status code of the response.
   * @param {string} title - The title of the message.
   */
  async notifySlack(pipelineData, title = this.title) {
    const message = createMessage(pipelineData, title);
    console.log('Notify slack with message: ', message.slack);
    return this.getPromise(
      this.webhook.bind(this),
      this.messengerConfig.slackWebhook, message.slack
    );
  }
  /**
   * Sends a notification to Teams.
   * @param {PipelineEventDetails} pipelineData - pipelineData.
   * @returns {Promise<number>} - The status code of the response.
   * @param {string} title - The title of the message.
   */
  async notifyTeams(pipelineData, title = this.title) {
    const message = createMessage(pipelineData, title);
    console.log('Notify teams with message: ', message.teams);
    return this.getPromise(
      this.webhook.bind(this),
      this.messengerConfig.teamsWebhook, message.teams
    );
  }

  async getPromise(func = async () => {}, ...params) {
    return new Promise((resolve, reject) => {
      func(...params)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error.message);
        });
    });
  }
}

module.exports = {
  Notifications
};
