// @flow
import DataLoaderManager from '../../common/data-loader-manager'
import OVPService from '../services/ovp-service'

export default class OVPDataLoaderManager extends DataLoaderManager {
  /**
   * @constructor
   * @param {string} playerVersion - player version
   * @param {string} partnerId - partner id
   * @param {string} vs - vs
   */
  constructor(playerVersion: string, partnerId: number, vs: string = "") {
    super();
    this._multiRequest = OVPService.getMultiRequest(playerVersion, vs, partnerId);
  }
}
