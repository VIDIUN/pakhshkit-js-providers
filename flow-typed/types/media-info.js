// @flow
declare type ProviderMediaInfoObject = {
  entryId: string,
  vs?: string
};

declare type OTTProviderMediaInfoObject = ProviderMediaInfoObject & {
  mediaType: string,
  contextType: string,
  protocol?: string,
  fileIds?: string,
  assetReferenceType?: string,
  formats?: Array<string>
};
