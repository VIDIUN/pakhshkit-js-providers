//@flow
import OTTService from '../ott-service';
import RequestBuilder from '../../../../util/request-builder';
import OTTConfiguration from '../../config';

const SERVICE_NAME: string = 'bookmark';

export default class OTTBookmarkService extends OTTService {
  /**
   * Creates an instance of RequestBuilder for session.startWidgetSession
   * @function add
   * @param {string} serviceUrl - The service url
   * @param {string} vs - The vs
   * @param {Object} bookmark - The udid
   * @returns {RequestBuilder} - The request builder
   * @static
   */
  static add(serviceUrl: string, vs: string, bookmark: Object): RequestBuilder {
    const headers: Map<string, string> = new Map();
    headers.set('Content-Type', 'application/json');
    const request = new RequestBuilder(headers);
    request.service = SERVICE_NAME;
    request.action = 'add';
    request.method = 'POST';
    request.url = request.getUrl(serviceUrl);
    const playerData: Object = {
      objectType: 'VidiunBookmarkPlayerData',
      action: bookmark.playerData.action,
      averageBitrate: bookmark.playerData.averageBitrate,
      totalBitrate: bookmark.playerData.totalBitrate,
      currentBitrate: bookmark.playerData.currentBitrate,
      fileId: bookmark.playerData.fileId
    };
    const bookmarkServiceParams: Object = {
      objectType: 'VidiunBookmark',
      type: bookmark.type,
      id: bookmark.id,
      position: bookmark.position,
      playerData: playerData
    };
    const config = OTTConfiguration.get();
    const serviceParams = config.serviceParams;
    Object.assign(serviceParams, {bookmark: bookmarkServiceParams, vs: vs});
    request.params = JSON.stringify(serviceParams);
    return request;
  }
}
