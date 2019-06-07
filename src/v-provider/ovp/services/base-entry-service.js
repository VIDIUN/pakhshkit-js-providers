//@flow
import OVPService from './ovp-service'
import RequestBuilder from '../../../util/request-builder'

const SERVICE_NAME: string = "baseEntry";

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
    headers.set("Content-Type", "application/json");
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = "getPlaybackContext";
    request.method = "POST";
    request.url = request.getUrl(serviceUrl);
    request.tag = "baseEntry-getPlaybackContext";
    const contextDataParams = {objectType: "VidiunContextDataParams", flavorTags: "all"};
    request.params = {entryId: entryId, vs: vs, contextDataParams: contextDataParams};
    return request;
  }

  /**
   * Creates an instance of RequestBuilder for baseentry.list
   * @function list
   * @param {string} serviceUrl The base URL
   * @param {string} vs The vs
   * @param {string} entryId The entry ID
   * @returns {RequestBuilder} The request builder
   * @static
   */
  static list(serviceUrl: string, vs: string, entryId: string): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set("Content-Type", "application/json");
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = "list";
    request.method = "POST";
    request.url = request.getUrl(serviceUrl);
    request.tag = "list";
    request.params = OVPBaseEntryService.getEntryListReqParams(entryId, vs);
    return request;
  }

  /**
   * Gets  baseentry.list service params
   * @function getEntryListReqParams
   * @param {string} entryId The entry ID
   * @param {string} vs The vs
   * @returns {{vs: string, filter: {redirectFromEntryId: string}, responseProfile: {fields: string, type: number}}} The service params object
   * @static
   */
  static getEntryListReqParams(entryId: string, vs: string): any {
    const filterParams = {redirectFromEntryId: entryId};
    const responseProfileParams = {
      fields: "id,name,description,thumbnailUrl,dataUrl,duration,msDuration,flavorParamsIds,mediaType,type,tags,dvrStatus",
      type: 1
    };
    return {vs: vs, filter: filterParams, responseProfile: responseProfileParams};
  }
}
