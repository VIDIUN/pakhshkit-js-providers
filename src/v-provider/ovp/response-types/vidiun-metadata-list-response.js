//@flow
import ServiceResult from '../../common/base-service-result'
import VidiunMetadata from './vidiun-metadata'

export default class VidiunMetadataListResponse extends ServiceResult {
  totalCount: number;
  metas: Array<VidiunMetadata>;

  /**
   * @constructor
   * @param {Object} responseObj The response
   */
  constructor(responseObj: Object) {
    super(responseObj);
    if (!this.hasError) {
      this.totalCount = responseObj.totalCount;
      if (this.totalCount > 0) {
        this.metas = [];
        responseObj.objects.map(meta => this.metas.push(new VidiunMetadata(meta)));
      }
    }
  }
}
