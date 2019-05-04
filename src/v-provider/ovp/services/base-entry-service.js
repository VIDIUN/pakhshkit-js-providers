//@flow
import OVPService from './ovp-service';
import RequestBuilder from '../../../util/request-builder';
import BaseEntryResponseProfile from '../request-params/base-entry-response-profile';

const SERVICE_NAME: string = 'baseEntry';

export default class OVPBaseEntryService extends OVPService {
  /**
   * Creates an instance of RequestBuilder for baseentry.getPlaybackContext
   * @function getPlaybackContext
   * @param {string} serviceUrl The service base URL
   * @param {string} vs The vs
   * @param {string} entryId The entry ID
   * @returns {RequestBuilder} The request builder
   * @static
   */
  static getPlaybackContext(serviceUrl: string, vs: string, entryId: string): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set('Content-Type', 'application/json');
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = 'getPlaybackContext';
    request.method = 'POST';
    request.url = request.getUrl(serviceUrl);
    request.tag = 'baseEntry-getPlaybackContext';
    const contextDataParams = {objectType: 'VidiunContextDataParams', flavorTags: 'all'};
    request.params = {entryId: entryId, vs: vs, contextDataParams: contextDataParams};
    return request;
  }

  /**
   * Creates an instance of RequestBuilder for baseentry.list
   * @function list
   * @param {string} serviceUrl The base URL
   * @param {string} vs The vs
   * @param {string} entryId The entry ID
   * @param {boolean} redirectFromEntryId whether the live entry should continue and play the VOD one after the live stream ends.
   * @returns {RequestBuilder} The request builder
   * @static
   */
  static list(serviceUrl: string, vs: string, entryId: string, redirectFromEntryId: boolean): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set('Content-Type', 'application/json');
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = 'list';
    request.method = 'POST';
    request.url = request.getUrl(serviceUrl);
    request.tag = 'list';
    request.params = OVPBaseEntryService.getEntryListReqParams(entryId, vs, redirectFromEntryId);
    return request;
  }

  /**
   * Gets  baseentry.list service params
   * @function getEntryListReqParams
   * @param {string} entryId The entry ID
   * @param {string} vs The vs
   * @param {boolean} redirectFromEntryId whether the live entry should continue and play the VOD one after the live stream ends.
   * @returns {{vs: string, filter: {redirectFromEntryId: string}, responseProfile: {fields: string, type: number}}} The service params object
   * @static
   */
  static getEntryListReqParams(entryId: string, vs: string, redirectFromEntryId: boolean): any {
    const filterParams = redirectFromEntryId ? {redirectFromEntryId: entryId} : {idEqual: entryId};
    return {vs: vs, filter: filterParams, responseProfile: new BaseEntryResponseProfile()};
  }
}
