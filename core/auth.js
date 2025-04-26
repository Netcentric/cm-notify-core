const { URL } = require('node:url');
const { AuthorizationCode } = require('simple-oauth2');
const { CMUtils } = require('./utils');

/**
 * @typedef {Object} CredentialsConfig
 * @property {Object} credentials - The credentials for the OAuth2 client.
 * @property {Object} token - The token for the OAuth2 client.
 *
 */

/**
 * @typedef {Object} OAuth2ClientType
 * @property {function} getAccessToken - Retrieves the access token.
 * @property {function} getAuthUrl - Retrieves the authorization URL.
 * @property {function} saveTokenFromCode - Saves the token from the authorization code.
 *
 */

/**
 * Class representing an OAuth2Client.
 */
class OAuth2Client {
  /**
   * @constructor
   * @param fromEmail {string} - The email address of the sender.
   * @param dataPath {string} - The path to the directory containing credentials JSON file.
   * @throws {Error} - If fromEmail is not provided.
   * @returns {OAuth2ClientType} - The OAuth2Client instance.
   */
  constructor(fromEmail, dataPath) {
    this.fromEmail = fromEmail;
    this.dataPath = dataPath;
    if (!this.fromEmail) {
      throw new Error('Missing fromEmail param');
    }
    this.CONFIG = {
      TOKEN_FILENAME: 'google-token.json',
      CREDENTIALS_FILENAME: 'google-credentials.json',
    }
    const credentials = CMUtils.getJsonData(this.CONFIG.CREDENTIALS_FILENAME, dataPath);
    this.client = this.__getAuthClient(credentials);
    this.redirectUri = credentials.installed.redirect_uris[0];

    return this.__public();
  }

  /**
   * Creates a public interface for the OAuth2Client.
   * @returns {OAuth2ClientType}
   * @private
   */
  __public() {
    return {
      getAccessToken: this.getAccessToken.bind(this),
      getAuthUrl: this.getAuthUrl.bind(this),
      saveTokenFromCode: this.saveTokenFromCode.bind(this)
    }
  }

  get token() {
    return CMUtils.getJsonData(this.CONFIG.TOKEN_FILENAME, this.dataPath);
  }

  /**
   * Retrieves the access token from the token file.
   * @returns {Promise<*>}
   */
  getAccessToken() {
    if (!this.token) {
      throw new Error('Missing token file');
    }
    const accessToken = this.client.createToken(this.token);
    return this.__ensureFreshToken(accessToken);
  }

  /**
   * Generates the authorization URL for the OAuth2 client.
   * @param state
   * @returns {String}
   */
  getAuthUrl(state = 'secure_random_state') {
    const authUrl = this.client.authorizeURL({
      redirect_uri: this.redirectUri,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      state,
      access_type: 'offline',
      login_hint: this.fromEmail,
    });

    console.log('Open this URL in a browser:', authUrl);
    return authUrl;
  }

  /**
   * Saves the token from the authorization code.
   * @param code
   * @returns {Promise<AccessToken>}
   */
  async saveTokenFromCode(code) {
    const tokenParams = {
      code,
      redirect_uri: this.redirectUri,
      scope: 'https://www.googleapis.com/auth/gmail.send',
    };
    const rawToken = await this.client.getToken(tokenParams);
    CMUtils.saveJsonData(this.CONFIG.TOKEN_FILENAME, rawToken.token, this.dataPath);
    return this.client.createToken(rawToken.token);
  }

  /**
   * Creates an OAuth2 client and sets the credentials and token.
   * @param credentials
   * @returns AuthorizationCode
   * @private
   */
  __getAuthClient(credentials) {
    if (!credentials) {
      throw new Error('Missing credentials');
    }
    const { client_secret, client_id, token_uri, auth_uri } = credentials.installed;
    const tokenUrl = new URL(token_uri);
    const authUrl = new URL(auth_uri);
    const config = {
      client: {
        id: client_id,
        secret: client_secret,
      },
      auth: {
        tokenHost: `${tokenUrl.origin}`,
        tokenPath: `${tokenUrl.pathname}`,
        authorizeHost: `${authUrl.origin}`,
        authorizePath: `${authUrl.pathname}`
      },
    };
    const client = new AuthorizationCode(config);
    return client;
  }

  /**
   * Ensures that the token is fresh and not expired.
   * @param tokenObj
   * @returns {Promise<*>}
   * @private
   */
  async __ensureFreshToken(tokenObj) {
    if (tokenObj.expired()) {
      console.log('Token expired, refreshing...');
      return tokenObj.refresh();
    }
    return tokenObj;
  }
}

module.exports = {
  OAuth2Client
}
