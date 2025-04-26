const { OAuth2Client } = require('./auth');

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
    if (!fromEmail) {
      throw new Error('Missing fromEmail param');
    }
    this.fromEmail = fromEmail;
    this.client = new OAuth2Client(fromEmail, dataPath);
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
   * Sends an email by posting a request to Gmail API endpoint.
   * @param message
   * @returns {Promise<number>} - The status code of the response.
   */
  async sendGmail(message) {
    if (!this.client) {
      throw new Error('OAuth2 client not initialized');
    }
    const { token } = await this.client.getAccessToken();
    if (!token) {
      throw new Error('Missing token object');
    }
    const { access_token } = token;
    if (!access_token) {
      throw new Error('Missing access_token');
    }
    console.log('token retrieved from oAuth2Client', access_token.length);
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
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
