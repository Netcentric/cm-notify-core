const { CMUtils } = require('./utils');

/**
 * @typedef {Object} PipelineEvent
 * @property {string} @type - The type of the event.
 * @property {string} xdmEventEnvelope:objectType - The object type of the event.
 * @property {Object} activitystreams:object - The object containing pipeline details.
 * @property {string} activitystreams:object.@id - The API URL for the pipeline.
 * @property {string} activitystreams:published - The published date of the event.
 */

/**
 * @typedef {Object} PipelineEventDetails
 * @property {string} status - The status of the pipeline event (e.g., started, ended, waiting).
 * @property {string} date - The published date of the event.
 * @property {string} url - The constructed pipeline execution URL.
 * @property {string} urlText - The pipeline path used in the URL.
 * @property {string} name - The name of the pipeline.
 * @property {string} target - The build target of the pipeline (e.g., DEV).
 * @property {string} type - The type of the pipeline (e.g., CI_CD).
 */

class Events {
  /**
   * @constructor
   * @param {string} orgName - The name of the organization.
   * @param {string} clientId - The client ID.
   * @param {string} title - The title of the notification.
   * @param {string} dataPath - The path to the directory containing pipeline data JSON file.
   */
  constructor(orgName, clientId, title, dataPath) {
    this.title = title;
    this.orgName = orgName;
    this.clientId = clientId;
    this.dataPath = dataPath;
    this.PIPELINE_OBJECT_TYPE = 'https://ns.adobe.com/experience/cloudmanager/pipeline-execution';
    this.PIPELINE_DATA_FILENAME = 'pipelines-data.json';
    /**
     * Configuration for pipeline events.
     * Maps event names to their corresponding type and object type.
     * @type {Object<string, {type: string, objectType: string}>}
     */
    this.eventsConfig = {
      started: {
        type: 'https://ns.adobe.com/experience/cloudmanager/event/started',
        objectType: this.PIPELINE_OBJECT_TYPE
      },
      ended: {
        type: 'https://ns.adobe.com/experience/cloudmanager/event/ended',
        objectType: this.PIPELINE_OBJECT_TYPE
      },
      waiting: {
        type: 'https://ns.adobe.com/experience/cloudmanager/event/waiting',
        objectType: 'https://ns.adobe.com/experience/cloudmanager/execution-step-state'
      }
    }
  }
  /**
   * Constructs a pipeline execution URL based on the provided path object.
   * @param {string} urlPath - pipeline path.
   * @returns {string} The constructed pipeline execution URL.
   */
  getPipelineUrl(urlPath) {
    return `https://experience.adobe.com/#/@${this.orgName}/cloud-manager/pipelineexecution.html/${urlPath}`
  }
  /**
   * Extracts pipeline data from the given API URL.
   * @param {string} apiUrl - The API URL containing pipeline details.
   * @returns {Object} An object containing the program, pipeline, and execution details.
   */
  getPipelineData(apiUrl) {
    const pipelinesList = CMUtils.getJsonData(this.PIPELINE_DATA_FILENAME, this.dataPath);
    const urlPath = apiUrl.split('https://cloudmanager.adobe.io/api/')[1];
    const urlParts = urlPath.split('/');
    const id = urlParts[3];
    const pipeline = (id && pipelinesList) ? pipelinesList.find(pipeline => pipeline.id === id) : null;
    const url = this.getPipelineUrl(urlPath);
    if (!pipeline) {
      console.warn('Pipeline not found for ID:', id, urlParts);
      return {
        id,
        url,
        urlText: urlPath
      };
    }
    return {
      id,
      url,
      urlText: urlPath,
      name: pipeline?.name,
      target: pipeline?.buildTarget,
      type: pipeline?.type,
    }
  }
  /**
   * Extracts and validates the event type from the provided event object.
   * @param {PipelineEvent} event - The event object to process.
   * @returns {PipelineEventDetails|null} An object containing event details (status, date, URL, URL text, environment) or null if invalid.
   */
  getEventType(event) {
    if (!event) {
      console.log('Event is null');
      return null;
    }
    const validEvent = Object.entries(this.eventsConfig)
      .find(([, val]) => val.type === event['@type'] && val.objectType === event['xdmEventEnvelope:objectType']);

    if (!validEvent) {
      console.log('Event Not valid', event['@type'], event['xdmEventEnvelope:objectType']);
      return null;
    }

    console.log('validEvent:', validEvent);
    const id = event['activitystreams:object']['@id'];
    const data = this.getPipelineData(id);
    if (!data || Object.keys(data).length === 0) {
      console.warn('Pipeline data not found for event:', id);
    }
    return {
      status: validEvent[0],
      date: CMUtils.convertUTCToTimezone(event['activitystreams:published']),
      url: data.url,
      urlText: data.urlText,
      name: data.name,
      target: data.target,
      type: data.type
    }
  }

  getValidEvents(requestBody = {}) {
    if (this.clientId && this.clientId !== requestBody.recipient_client_id) {
      console.warn(`Unexpected client id. Was expecting length ${this.clientId?.length} and received ${requestBody.recipient_client_id}`)
      return { error: 'Invalid client ID' };
    }
    const events = requestBody.events || [requestBody.event];
    console.log('EVENT received: ', events?.length);
    if (!events || !events.length) {
      console.warn('No events found');
      return { error: 'No events found' };
    }
    const validEvents = [];
    events.forEach(item => {
      if (!item || !item.event) return;
      const eventType = this.getEventType(item.event);
      if (eventType) {
        validEvents.push(eventType);
      }
    });
    if (validEvents.length === 0) {
      console.warn('No Valid events found');
      return { error: 'No Valid events found' };
    }

    return validEvents;
  }
}


module.exports = {
  Events
}
