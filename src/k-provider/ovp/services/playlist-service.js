//@flow
import OVPService from './ovp-service';
import RequestBuilder from '../../../util/request-builder';
import BaseEntryResponseProfile from '../request-params/base-entry-response-profile';

const SERVICE_NAME: string = 'playlist';

export default class OVPPlaylistService extends OVPService {
  /**
   * Creates an instance of RequestBuilder for playlist.getPlaybackContext
   * @function getPlaybackContext
   * @param {string} serviceUrl The service base URL
   * @param {string} vs The vs
   * @param {string} playlistId The playlist ID
   * @returns {RequestBuilder} The request builder
   * @static
   */
  static execute(serviceUrl: string, vs: string, playlistId: string): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set('Content-Type', 'application/json');
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = 'execute';
    request.method = 'POST';
    request.url = request.getUrl(serviceUrl);
    request.tag = `${SERVICE_NAME}-execute`;
    request.params = {
      vs: vs,
      id: playlistId,
      responseProfile: new BaseEntryResponseProfile()
    };
    return request;
  }

  /**
   * Creates an instance of RequestBuilder for playlist.list
   * @function list
   * @param {string} serviceUrl The base URL
   * @param {string} vs The vs
   * @param {string} playlistId The playlist ID
   * @returns {RequestBuilder} The request builder
   * @static
   */
  static get(serviceUrl: string, vs: string, playlistId: string): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set('Content-Type', 'application/json');
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = 'get';
    request.method = 'POST';
    request.url = request.getUrl(serviceUrl);
    request.tag = `${SERVICE_NAME}-get`;
    request.params = {
      vs: vs,
      id: playlistId,
      responseProfile: {
        fields: 'id,name,description,thumbnailUrl',
        type: 1
      }
    };
    return request;
  }
}
