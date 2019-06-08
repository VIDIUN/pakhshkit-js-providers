// @flow
import DataLoaderManager from '../../common/data-loader-manager'
import OTTService from '../services/ott-service'

export default class OTTDataLoaderManager extends DataLoaderManager {
  /**
   * @constructor
   * @param {string} partnerId - partner id
   * @param {string} vs - vs
   */
  constructor(partnerId: number, vs: string = "") {
    super();
    this._multiRequest = OTTService.getMultiRequest(vs, partnerId);
  }
}
