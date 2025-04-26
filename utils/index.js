const { join, resolve } = require('node:path');
const { existsSync, writeFileSync } = require('node:fs');
const { DEFAULT_CONFIG } = require('../core/config');

class CMUtils {
  static getJsonDataFilePath(filename, dataPath) {
    const dataDirPath = dataPath || join(process.cwd(), '.data');
    return resolve(dataDirPath, filename);
  }

  static getValidPath(filePath) {
    try {
      const resolvedPath = resolve(filePath);
      if (existsSync(resolvedPath)) {
        return resolvedPath;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  static getFilePath(filePath, dataPath) {
    const isValidFile = this.getValidPath(filePath);
    if (isValidFile) {
      return isValidFile;
    }
    const dataDirPath = dataPath || join(process.cwd(), '.data');
    const dataFilePath = resolve(dataDirPath, filePath);
    return this.getValidPath(dataFilePath);
  }

  static getJsonData(filename, dataPath) {
    const filePath = this.getJsonDataFilePath(filename, dataPath);
    if (!existsSync(filePath)) {
      return null;
    }
    return require(filePath);
  }

  static saveJsonData(filename, data, dataPath) {
    const filePath = this.getJsonDataFilePath(filename, dataPath);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('File created: ', filePath);
  }

  static convertUTCToTimezone(utcTimestamp, timezoneCode = 'cet') {
    const timezones = {
      cet: { timeZone: 'Europe/Berlin', locale: 'de-DE' },
      ist: { timeZone: 'Asia/Kolkata', locale: 'en-IN' },
      est: { timeZone: 'America/New_York', locale: 'en-US' },
    };

    const tz = timezoneCode.toLowerCase();
    const config = timezones[tz];
    if (!config) throw new Error('Unsupported timezone. Use cet, ist, or est.');

    const date = new Date(utcTimestamp);

    const formatted = new Intl.DateTimeFormat(config.locale, {
      timeZone: config.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

    return `${formatted} ${tz.toUpperCase()}`;
  }

  static convertUTCToDateWithOffset(utcTimestamp, utcOffset = '+00:00') {
    const offsetRegex = /^([+-])(\d{2}):(\d{2})$/;
    const match = utcOffset.match(offsetRegex);
    if (!match) {
      throw new Error('Invalid UTC offset format. Use format like +05:30 or -04:00.');
    }
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    const offsetInMs = sign * (hours * 60 * 60 * 1000 + minutes * 60 * 1000);
    const date = new Date(utcTimestamp + offsetInMs);
    const formatted = date.toISOString().replace('T', ' ').substring(0, 19);

    return `${formatted} UTC${utcOffset}`;
  }

  static isBase64(str) {
    if (!str || typeof str !== 'string') {
      return false;
    }
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str);
  }

  static initDotEnv() {
    const dotenv = require('dotenv');
    const envFilePath = this.getValidPath('.env');
    if (envFilePath) {
      dotenv.config({ path: envFilePath });
    } else {
      console.log('No .env file found. Skipping dotenv initialization.');
    }
  }

  static getDefaultConfig() {
    return DEFAULT_CONFIG;
  }
}

module.exports = { CMUtils };
