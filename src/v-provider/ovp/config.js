//@flow
import {clone} from '../../util/clone';

const defaultConfig: Object = {
  serviceUrl: 'https://cdnapisec.vidiun.com/api_v3',
  cdnUrl: 'https://cdnapisec.vidiun.com',
  serviceParams: {
    apiVersion: '3.3.0',
    format: 1
  },
  useApiCaptions: true
};

export default class OVPConfiguration {
  static set(clientConfig?: ProviderEnvConfigObject) {
    if (clientConfig) {
      Object.assign(defaultConfig, clientConfig);
    }
  }

  static get(): Object {
    return clone(defaultConfig);
  }
}

export {OVPConfiguration};
