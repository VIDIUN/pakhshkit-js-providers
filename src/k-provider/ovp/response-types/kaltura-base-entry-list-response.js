//@flow
import ServiceResult from '../../common/base-service-result'
import VidiunMediaEntry from './vidiun-media-entry'

export default class VidiunBaseEntryListResponse extends ServiceResult {
  /**
   * @member - The total count
   * @type {number}
   */
  totalCount: number;
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
      this.totalCount = responseObj.totalCount;
      if (this.totalCount > 0) {
        this.entries = [];
        responseObj.objects.map(entry => this.entries.push(new VidiunMediaEntry(entry)));
      }
    }
  }
}
