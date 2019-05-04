//@flow
import RequestBuilder from '../../../util/request-builder';
import OVPBaseEntryService from '../services/base-entry-service';
import OVPMetadataService from '../services/meta-data-service';
import OVPConfiguration from '../config';
import VidiunPlaybackContext from '../response-types/vidiun-playback-context';
import VidiunMetadataListResponse from '../response-types/vidiun-metadata-list-response';
import VidiunBaseEntryListResponse from '../response-types/vidiun-base-entry-list-response';
import VidiunMediaEntry from '../response-types/vidiun-media-entry';

type OVPMediaEntryLoaderResponse = {
  entry: VidiunMediaEntry,
  playBackContextResult: VidiunPlaybackContext,
  metadataListResult: VidiunMetadataListResponse
};
export type {OVPMediaEntryLoaderResponse};

export default class OVPMediaEntryLoader implements ILoader {
  _entryId: string;
  _requests: Array<RequestBuilder>;
  _response: any = {};

  static get id(): string {
    return 'media';
  }

  /**
   * @constructor
   * @param {Object} params loader params
   * @boolean {boolean} useExternalCaptions - if we should add captions request to the multirequests.
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
    let mediaEntryResponse: VidiunBaseEntryListResponse = new VidiunBaseEntryListResponse(response[0].data);
    this._response.entry = mediaEntryResponse.entries[0];
    this._response.playBackContextResult = new VidiunPlaybackContext(response[1].data);
    this._response.metadataListResult = new VidiunMetadataListResponse(response[2].data);
  }

  get response(): OVPMediaEntryLoaderResponse {
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
    const config = OVPConfiguration.get();
    const requests: Array<RequestBuilder> = [];
    requests.push(OVPBaseEntryService.list(config.serviceUrl, params.vs, params.entryId, params.redirectFromEntryId));
    requests.push(OVPBaseEntryService.getPlaybackContext(config.serviceUrl, params.vs, params.entryId));
    requests.push(OVPMetadataService.list(config.serviceUrl, params.vs, params.entryId));
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
