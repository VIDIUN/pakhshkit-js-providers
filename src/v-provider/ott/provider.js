// @flow
import BaseProvider from '../common/base-provider';
import getLogger from '../../util/logger';
import OTTConfiguration from './config';
import OTTDataLoaderManager from './loaders/data-loader-manager';
import OTTSessionLoader from './loaders/session-loader';
import OTTAssetLoader from './loaders/asset-loader';
import OTTAssetListLoader from './loaders/asset-list-loader';
import OTTProviderParser from './provider-parser';
import VidiunAsset from './response-types/vidiun-asset';
import VidiunPlaybackContext from './response-types/vidiun-playback-context';
import MediaEntry from '../../entities/media-entry';
import Error from '../../util/error/error';

export default class OTTProvider extends BaseProvider<OTTProviderMediaInfoObject> {
  /**
   * @constructor
   * @param {ProviderOptionsObject} options - provider options
   * @param {string} playerVersion - player version
   */
  constructor(options: ProviderOptionsObject, playerVersion: string) {
    super(options, playerVersion);
    this._logger = getLogger('OTTProvider');
    OTTConfiguration.set(options.env);
    this._networkRetryConfig = Object.assign(this._networkRetryConfig, options.networkRetryParameters);
  }

  /**
   * Gets the backend media config.
   * @param {OTTProviderMediaInfoObject} mediaInfo - ott media info
   * @returns {Promise<ProviderMediaConfigObject>} - The provider media config
   */
  getMediaConfig(mediaInfo: OTTProviderMediaInfoObject): Promise<ProviderMediaConfigObject> {
    if (mediaInfo.vs) {
      this.vs = mediaInfo.vs;
      this._isAnonymous = false;
    }
    this._dataLoader = new OTTDataLoaderManager(this.partnerId, this.vs, this._networkRetryConfig);
    return new Promise((resolve, reject) => {
      const entryId = mediaInfo.entryId;
      if (entryId) {
        let vs: string = this.vs;
        if (!vs) {
          vs = '{1:result:vs}';
          this._dataLoader.add(OTTSessionLoader, {partnerId: this.partnerId});
        }
        const contextType = mediaInfo.contextType || VidiunPlaybackContext.Type.PLAYBACK;
        const mediaType = mediaInfo.mediaType || VidiunAsset.Type.MEDIA;
        const assetReferenceType = mediaInfo.assetReferenceType || VidiunAsset.AssetReferenceType.MEDIA;
        const playbackContext = {
          mediaProtocol: mediaInfo.protocol,
          assetFileIds: mediaInfo.fileIds,
          context: contextType
        };
        this._dataLoader.add(OTTAssetLoader, {
          entryId: entryId,
          vs: vs,
          type: mediaType,
          playbackContext: playbackContext,
          assetReferenceType: assetReferenceType
        });
        const requestData = {
          contextType: contextType,
          mediaType: mediaType,
          formats: mediaInfo.formats || []
        };
        return this._dataLoader.fetchData().then(
          response => {
            try {
              resolve(this._parseDataFromResponse(response, requestData));
            } catch (err) {
              reject(err);
            }
          },
          err => {
            reject(err);
          }
        );
      } else {
        reject(new Error(Error.Severity.CRITICAL, Error.Category.PROVIDER, Error.Code.MISSING_MANDATORY_PARAMS, {message: 'missing entry id'}));
      }
    });
  }

  _parseDataFromResponse(data: Map<string, Function>, requestData: Object): ProviderMediaConfigObject {
    this._logger.debug('Data parsing started');
    const mediaConfig: ProviderMediaConfigObject = {
      session: {
        isAnonymous: this._isAnonymous,
        partnerId: this.partnerId
      },
      sources: this._getDefaultSourcesObject(),
      plugins: {}
    };
    if (this.uiConfId) {
      mediaConfig.session.uiConfId = this.uiConfId;
    }
    if (data) {
      if (data.has(OTTSessionLoader.id)) {
        const sessionLoader = data.get(OTTSessionLoader.id);
        if (sessionLoader && sessionLoader.response) {
          mediaConfig.session.vs = sessionLoader.response;
        }
      } else {
        mediaConfig.session.vs = this.vs;
      }
      if (data.has(OTTAssetLoader.id)) {
        const assetLoader = data.get(OTTAssetLoader.id);
        if (assetLoader && assetLoader.response && Object.keys(assetLoader.response).length) {
          const response = (assetLoader: OTTAssetLoader).response;
          if (OTTProviderParser.hasBlockAction(response)) {
            throw new Error(Error.Severity.CRITICAL, Error.Category.SERVICE, Error.Code.BLOCK_ACTION, {
              action: OTTProviderParser.getBlockAction(response),
              messages: OTTProviderParser.getErrorMessages(response)
            });
          }
          const mediaEntry = OTTProviderParser.getMediaEntry(response, requestData);
          Object.assign(mediaConfig.sources, this._getSourcesObject(mediaEntry));
          this._verifyHasSources(mediaConfig.sources);
        }
      }
    }
    this._logger.debug('Data parsing finished', mediaConfig);
    return mediaConfig;
  }

  /**
   * Gets playlist config from entry list.
   * @param {ProviderEntryListObject} entryListInfo - ott entry list info
   * @returns {Promise<ProviderPlaylistObject>} - The provider playlist config
   */
  getEntryListConfig(entryListInfo: ProviderEntryListObject): Promise<ProviderPlaylistObject> {
    if (entryListInfo.vs) {
      this.vs = entryListInfo.vs;
      this._isAnonymous = false;
    }
    this._dataLoader = new OTTDataLoaderManager(this.partnerId, this.vs, this._networkRetryConfig);
    return new Promise((resolve, reject) => {
      const entries = entryListInfo.entries;
      if (entries && entries.length) {
        let vs: string = this.vs;
        if (!vs) {
          vs = '{1:result:vs}';
          this._dataLoader.add(OTTSessionLoader, {partnerId: this.partnerId});
        }
        this._dataLoader.add(OTTAssetListLoader, {entries, vs});
        this._dataLoader.fetchData().then(
          response => {
            resolve(this._parseEntryListDataFromResponse(response));
          },
          err => {
            reject(err);
          }
        );
      } else {
        reject({success: false, data: 'Missing mandatory parameter'});
      }
    });
  }

  _parseEntryListDataFromResponse(data: Map<string, Function>): ProviderPlaylistObject {
    this._logger.debug('Data parsing started');
    const playlistConfig: ProviderPlaylistObject = {
      id: '',
      metadata: {
        name: '',
        description: ''
      },
      poster: '',
      items: []
    };
    if (data && data.has(OTTAssetListLoader.id)) {
      const playlistLoader = data.get(OTTAssetListLoader.id);
      if (playlistLoader && playlistLoader.response) {
        const entryList = OTTProviderParser.getEntryList(playlistLoader.response);
        entryList.items.forEach(i => playlistConfig.items.push({sources: this._getSourcesObject(i)}));
      }
    }
    this._logger.debug('Data parsing finished', playlistConfig);
    return playlistConfig;
  }

  _getDefaultSourcesObject(): ProviderMediaConfigSourcesObject {
    return {
      hls: [],
      dash: [],
      progressive: [],
      id: '',
      duration: 0,
      type: MediaEntry.Type.UNKNOWN,
      poster: '',
      dvr: false,
      vr: null,
      metadata: {
        name: '',
        description: '',
        tags: ''
      }
    };
  }

  _getSourcesObject(mediaEntry: MediaEntry) {
    const sourcesObject: ProviderMediaConfigSourcesObject = this._getDefaultSourcesObject();
    const mediaSources = mediaEntry.sources.toJSON();
    sourcesObject.hls = mediaSources.hls;
    sourcesObject.dash = mediaSources.dash;
    sourcesObject.progressive = mediaSources.progressive;
    sourcesObject.id = mediaEntry.id;
    sourcesObject.duration = mediaEntry.duration;
    sourcesObject.type = mediaEntry.type;
    sourcesObject.dvr = !!mediaEntry.dvrStatus;
    sourcesObject.poster = mediaEntry.poster;
    if (
      mediaEntry.metadata &&
      mediaEntry.metadata.metas &&
      typeof mediaEntry.metadata.metas.tags === 'string' &&
      mediaEntry.metadata.metas.tags.indexOf('360') > -1
    ) {
      sourcesObject.vr = {};
    }
    Object.assign(sourcesObject.metadata, mediaEntry.metadata);
    return sourcesObject;
  }
}
