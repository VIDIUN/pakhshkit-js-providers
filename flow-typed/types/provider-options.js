// @flow
declare type ProviderOptionsObject = {
  partnerId: number,
  widgetId?: string,
  logLevel?: string,
  vs?: string,
  uiConfId?: number,
  env?: ProviderEnvConfigObject,
  networkRetryParameters?: ProviderNetworkRetryParameters,
  filterOptions?: ProviderFilterOptionsObject
};
