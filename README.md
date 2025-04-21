# cm-notify-core
[![Version](https://img.shields.io/npm/v/@netcentric/cm-notify-core.svg)](https://npmjs.org/package/@netcentric/cm-notify-core)
[![Build Status](https://github.com/netcentric/cm-notify-core/workflows/CI/badge.svg?branch=main)](https://github.com/netcentric/cm-notify-core/actions)
[![CodeQL Analysis](https://github.com/netcentric/cm-notify-core/workflows/CodeQL/badge.svg?branch=main)](https://github.com/netcentric/cm-notify-core/actions)
[![semver: semantic-release](https://img.shields.io/badge/semver-semantic--release-blue.svg)](https://github.com/semantic-release/semantic-release)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Cloud Manager Notify Core is a Node.js application that process Cloud Manager events and sends notifications to Slack, Microsoft Teams or Email.

# Installation
```
npm install --omit=dev --omit=peer @netcentric/cm-notify-core
```

# Usage

```javascript
const { CMNotify } = require('@netcentric/cm-notify-core');

const cmNotify = new CMNotify();

router.post('/cm-webhook', async (req, res, next) => {
  const isValidEvent = await cmNotify.post(req.body);

  if (!isValidEvent) {
    return res.status(400).send('Invalid event');
  }
  // Message is sent to Slack/Teams
  res.send('Valid event');
})
```
 - If you need to wait for the message to be sent, you can use the `waitResponse` param in `post` method.
```javascript
  /**
   * Sends notifications to the configured channels.
   * @param requestBody
   * @param waitResponse {boolean} - If true, waits for all notifications to be settled before returning.
   * @returns {Promise<Array<PromiseSettledResult<Awaited<*>>>|boolean>}
   */
  async post(requestBody, waitResponse = false) {}
```
- Example:
```javascript
const { CMNotify } = require('@netcentric/cm-notify-core');

const cmNotify = new CMNotify();

router.post('/cm-webhook', async (req, res, next) => {
  try {
    const allMessages = await cmNotify.post(req.body, true);
    if (!allMessages) {
      return res.status(400).send('Invalid event');
    }
    allMessages.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Posting Message ${index + 1} response with value:`, result.value);
      } else if (result.status === 'rejected') {
        console.log(`Posting Message ${index + 1} rejected with reason:`, result.reason);
      }
    });
    // Message is sent to Slack/Teams
    res.send('Valid event');
  } catch (error) {
    console.error(error);
    res.status(400).send('Error sending messages');
  }
});
```
# Messages
- Slack
```
Cloud Manager Pipeline Notification:
STATUS: ended
DATE: 10.04.2025, 22:06:36 CET
NAME: piepeline-name
TARGET: STAGE_PROD
TYPE: WEB_TIER
URL: program/12345/pipeline/12345/execution/12345
```

# Setup

## Cloud Manager pipelines data (optional)

- The application needs a list of Cloud Manager pipelines to create message details.
- The list of pipelines can be generated using the `cm-notify` CLI.
- Or you can create the file manually. File name needs to be `pipelines-data.json` located in `.data` directory.
```json
[
  {
    "name": "pipeline-name",
    "id": "1234567",
    "buildTarget": "DEV",
    "type": "FRONT_END"
  },
  {
    "name": "pipeline-name-dev",
    "id": "1233217",
    "buildTarget": "DEV",
    "type": "CI_CD"
  }
]
```
- More info in the [@netcentric/cm-notify](https://github.com/netcentric/cm-notify/docs/setup/ADOBE.md) repo.
- This data is optional, but it is used to create a more detailed message.
- If the data is not provided, the message will contain the pipeline Status, Date and URL.
- The message will not contain the pipeline name, target and type.

## Google Auth Token (optional, only if Email notification is used)

- The application uses Google Auth to send emails.
- You can use the `cm-notify` CLI to generate the token.
- Or you can create the token manually. 
- The token is stored in the `.data` directory in the `gmail-token.json` file.
- For GMAIL API you also need `google-credentials.json` in the `.data` directory.
- More info in the [@netcentric/cm-notify](https://github.com/netcentric/cm-notify/docs/setup/GMAIL.md) repo.
- This app uses `"google-auth-library": "9.15.1"` as a peer dependency. If you need email notifications, you need to install it as well.

## Environment Variables
- Create a `.env` file in the root folder with the following variables:

Minimal required envs:
```
# Cloud Manager envs
ORGANIZATION_NAME=orgname# used to build the URL for the Pipeline
# Messanger apps env
SLACK_WEBHOOK=slack_webhook_url
```
All envs:
```
# Cloud Manager envs
ORGANIZATION_NAME=orgname# used to build the URL for the Pipeline
CLIENT_ID=e231#used to validate CM event
# Messanger apps env
SLACK_WEBHOOK=https://hooks.slack.com/services/123
# Teams webhook URL
TEAMS_WEBHOOK=https://prod-123.westus.logic.azure.com:443/workflows/123
# Teams email, alternative approach, if Webhook is disabled
TEAMS_EMAIL=email.onmicrosoft.com@amer.teams.ms
# Email sender env
# Only needed if Teams email approach is used
EMAIL_FROM=gmailuser@googleworkspacedomain.com
# App env (optional)
DATA_PATH=./data# path to the data folder wher tokens are stored, default is ./data
```

## Cloud Manager Webhook

1. Go to https://developer.adobe.com/console
2. Create a new project
3. Add Events to the project
4. Select `Cloud Manager Events`
5. Configure Webhook URL.



