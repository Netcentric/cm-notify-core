const { OAuth2Client } = require('google-auth-library');
const { CMUtils } = require('./utils');

/**
 * @typedef {Object} CredentialsConfig
 * @property {Object} credentials - The credentials for the OAuth2 client.
 * @property {Object} token - The token for the OAuth2 client.
 *
 */

/**
 * Class representing an email client.
 */
class Email {
  /**
   * @constructor
   * @param fromEmail {string} - The email address of the sender.
   * @param dataPath {string} - The path to the directory containing credentials JSON file.
   */
  constructor(fromEmail, dataPath) {
    this.fromEmail = fromEmail;
    this.dataPath = dataPath;
    if (!this.fromEmail) {
      throw new Error('Missing fromEmail param');
    }
    this.client = this.getAuthClient();
    this.CONFIG = {
      TOKEN_FILENAME: 'google-token.json',
      CREDENTIALS_FILENAME: 'google-credentials.json',
    }
  }

  /**
   * Retrieves the credentials and token from JSON files.
   * @returns {CredentialsConfig}
   */
  getCredentials() {
    const credentials = CMUtils.getJsonData(this.CONFIG.CREDENTIALS_FILENAME, this.dataPath);
    const token = CMUtils.getJsonData(this.CONFIG.TOKEN_FILENAME, this.dataPath);
    return { credentials, token };
  }

  /**
   * Constructs a raw message for sending an email.
   * @param to
   * @param subject
   * @param body
   * @returns {string}
   */
  constructMessage(to, subject, body) {
    const message =
      `From: ${this.fromEmail}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      `${body}`;
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Creates an OAuth2 client and sets the credentials and token.
   * @returns {OAuth2Client}
   */
  getAuthClient() {
    const { credentials, token } = this.getCredentials();
    if (!credentials || !token) {
      throw new Error('Missing credentials or token');
    }
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  /**
   * Sends an email by posting a request to Gmail API endpoint.
   * @param message
   * @returns {Promise<number>} - The status code of the response.
   */
  async sendGmail(message) {
    if (!this.client) {
      throw new Error('OAuth2 client not initialized');
    }
    const { token } = await this.client.getAccessToken();
    console.log('token retrieved from oAuth2Client', token.length);
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: message }),
    });
    if (res.status === 200) {
      console.log('Notification sent successfully');
      return res.status;
    } else {
      throw new Error(res.statusText);
    }
  }

  /**
   * Sends an email by posting a request to Gmail API endpoint.
   * @param to
   * @param subject
   * @param body
   * @returns {Promise<number>} - The status code of the response.
   */
  async send(to, subject, body) {
    const message = this.constructMessage(to, subject, body);
    return this.sendGmail(message);
  }
}

module.exports = {
  Email
}
