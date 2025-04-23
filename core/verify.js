const { readFileSync } = require('node:fs');
const { createVerify, createHmac, createPublicKey } = require('node:crypto');
const { CMUtils } = require('../utils');

class CMVerify {
  /**
   * Verifies the request body using the public key path.
   * @param req
   * @param publicKey
   * @param sigHeader
   * @returns {boolean}
   */
  static verifyRequest(req, publicKey, sigHeader = 'x-adobe-signature') {
    if (!req.headers[sigHeader] || !publicKey) {
      return false;
    }
    const signature = req.headers[sigHeader];
    const verifier = createVerify('SHA256');
    const base64Payload = Buffer.from(JSON.stringify(req.body)).toString('base64');
    verifier.update(base64Payload);

    return verifier.verify(publicKey, signature, 'base64')
  }

  /**
   * Verifies the signature of the request body.
   * @param secret
   * @param params
   * @param sigHeader
   * @returns {boolean}
   */
  static verifySignature(params, secret, sigHeader = 'x-adobe-signature') {
    const rawBody = params.__ow_body;
    const signature = params.__ow_headers[sigHeader];
    const hmac = createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedSig = hmac.digest('hex');
    return expectedSig === signature;
  }

  /**
   * Verifies the runtime signature of the request body.
   * @param params
   * @param publicKey
   * @param sigHeader
   * @returns {boolean}
   */
  static verifyPublicKey(params, publicKey, sigHeader = 'x-adobe-signature') {
    const signature = params.__ow_headers[sigHeader] || '';
    const verifier = createVerify('SHA256');
    verifier.update(params.__ow_body);

    return verifier.verify(publicKey, signature, 'base64');
  }

  /**
   * Verifies the request using the public key path, content or secret.
   * @param req
   * @param publicKey - The public key path or content or secret string
   * @param sigHeader
   * @returns {boolean}
   */
  static verify(req, publicKey, sigHeader = 'x-adobe-signature') {
    const key = publicKey || req.PUBLIC_KEY;
    if (!key) {
      return false;
    }
    const publicKeyContent = this.getPublicKey(key);
    if (publicKeyContent && req.__ow_headers[sigHeader]) {
      return this.verifyPublicKey(req, publicKeyContent, sigHeader);
    }
    if (publicKeyContent && req.headers[sigHeader]) {
      return this.verifyRequest(req, publicKeyContent, sigHeader);
    }
    return this.verifySignature(req, key, sigHeader);
  }

  /**
   * Retrieves the public key from a file or string.
   * @param key
   * @returns {*|null|string}
   */
  static getPublicKey(key) {
    if (!key) {
      return null;
    }
    const isValidPath = CMUtils.getValidPath(key);
    if (isValidPath) {
      try {
        return readFileSync(isValidPath, 'utf-8');
      } catch (error) {
        console.error('Error reading key file:', error.message);
        return null;
      }
    }
    return this.isValidPublicKey(key) ? key : null;
  }

  /**
   * Checks if a string is a valid public key.
   * @param {string} key - The string to check.
   * @returns {boolean} - True if the string is a valid public key, otherwise false.
   */
  static isValidPublicKey(key) {
    try {
      createPublicKey(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = {
  CMVerify
}
