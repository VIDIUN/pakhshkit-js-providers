//@flow
import OTTAssetService from '../services/asset-service'
import OTTConfiguration from '../config'
import RequestBuilder from '../../../util/request-builder'
import VidiunPlaybackContext from '../response-types/vidiun-playback-context'
import VidiunAsset from '../response-types/vidiun-asset'

export default class OTTAssetLoader implements ILoader {
  _entryId: string;
  _requests: Array<RequestBuilder>;
  _response: any = {};

  static get id(): string {
    return "asset";
  }

  /**
   * @constructor
   * @param {Object} params loader params
   */
  constructor(params: Object) {
    this.requests = this.buildRequests(params);
    this._entryId = params.entryId;
  }

  set requests(requests: Array<RequestBuilder>) {
    this._requests = requests;
  }

  get requests(): Array<RequestBuilder> {
    return this._requests;
  }

  set response(response: any) {
    this._response.mediaDataResult = new VidiunAsset(response[0].data);
    this._response.playBackContextResult = new VidiunPlaybackContext(response[1].data);
  }

  get response(): any {
    return this._response;
  }

  /**
   * Builds loader requests
   * @function
   * @param {Object} params Requests parameters
   * @returns {RequestBuilder} The request builder
   * @static
   */
  buildRequests(params: Object): Array<RequestBuilder> {
    const config = OTTConfiguration.get();
    const requests: Array<RequestBuilder> = [];
    requests.push(OTTAssetService.get(config.serviceUrl, params.vs, params.entryId, params.assetReferenceType));
    requests.push(OTTAssetService.getPlaybackContext(config.serviceUrl, params.vs, params.entryId, params.type, params.playbackContext));
    return requests;
  }

  /**
   * Loader validation function
   * @function
   * @returns {boolean} Is valid
   */
  isValid(): boolean {
    return !!this._entryId;
  }
}
