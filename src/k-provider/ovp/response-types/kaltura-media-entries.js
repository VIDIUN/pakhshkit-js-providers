//@flow
import ServiceResult from '../../common/base-service-result';
import VidiunMediaEntry from './vidiun-media-entry';

export default class VidiunMediaEntries extends ServiceResult {
  /**
   * @member - The entries
   * @type {Array<VidiunMediaEntry>}
   */
  entries: Array<VidiunMediaEntry>;

  /**
   * @constructor
   * @param {Object} responseObj The json response
   */
  constructor(responseObj: Object) {
    super(responseObj);
    if (!this.hasError) {
      this.entries = [];
      responseObj.map(entry => this.entries.push(new VidiunMediaEntry(entry)));
    }
  }
}
