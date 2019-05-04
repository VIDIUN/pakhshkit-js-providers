//@flow
import getLogger from '../../util/logger';
import VidiunPlaybackSource from './response-types/vidiun-playback-source';
import VidiunPlaybackContext from './response-types/vidiun-playback-context';
import VidiunAsset from './response-types/vidiun-asset';
import MediaEntry from '../../entities/media-entry';
import Drm from '../../entities/drm';
import MediaSource from '../../entities/media-source';
import MediaSources from '../../entities/media-sources';
import EntryList from '../../entities/entry-list';
import {SupportedStreamFormat, isProgressiveSource} from '../../entities/media-format';
import VidiunDrmPlaybackPluginData from '../common/response-types/vidiun-drm-playback-plugin-data';
import VidiunRuleAction from './response-types/vidiun-rule-action';
import VidiunAccessControlMessage from '../common/response-types/vidiun-access-control-message';
import type {OTTAssetLoaderResponse} from './loaders/asset-loader';

const LIVE_ASST_OBJECT_TYPE: string = 'VidiunLiveAsset';

const MediaTypeCombinations: {[mediaType: string]: Object} = {
  [VidiunAsset.Type.MEDIA]: {
    [VidiunPlaybackContext.Type.TRAILER]: () => ({type: MediaEntry.Type.VOD}),
    [VidiunPlaybackContext.Type.PLAYBACK]: mediaAssetData => {
      if (parseInt(mediaAssetData.externalIds) > 0 || mediaAssetData.objectType === LIVE_ASST_OBJECT_TYPE) {
        return {type: MediaEntry.Type.LIVE, dvrStatus: 0};
      }
      return {type: MediaEntry.Type.VOD};
    }
  },
  [VidiunAsset.Type.EPG]: {
    [VidiunPlaybackContext.Type.CATCHUP]: () => ({type: MediaEntry.Type.VOD}),
    [VidiunPlaybackContext.Type.START_OVER]: () => ({type: MediaEntry.Type.LIVE, dvrStatus: 1})
  },
  [VidiunAsset.Type.RECORDING]: {
    [VidiunPlaybackContext.Type.PLAYBACK]: () => ({type: MediaEntry.Type.VOD})
  }
};

export default class OTTProviderParser {
  static _logger = getLogger('OTTProviderParser');

  /**
   * Returns parsed media entry by given OTT response objects.
   * @function getMediaEntry
   * @param {any} assetResponse - The asset response.
   * @param {Object} requestData - The request data object.
   * @returns {MediaEntry} - The media entry
   * @static
   * @public
   */
  static getMediaEntry(assetResponse: any, requestData: Object): MediaEntry {
    const mediaEntry = new MediaEntry();
    OTTProviderParser._fillBaseData(mediaEntry, assetResponse);
    const playbackContext = assetResponse.playBackContextResult;
    const mediaAsset = assetResponse.mediaDataResult;
    const vidiunSources = playbackContext.sources;
    const filteredVidiunSources = OTTProviderParser._filterSourcesByFormats(vidiunSources, requestData.formats);
    mediaEntry.sources = OTTProviderParser._getParsedSources(filteredVidiunSources);
    const typeData = OTTProviderParser._getMediaType(mediaAsset.data, requestData.mediaType, requestData.contextType);
    mediaEntry.type = typeData.type;
    mediaEntry.dvrStatus = typeData.dvrStatus;
    mediaEntry.duration = Math.max.apply(Math, vidiunSources.map(source => source.duration));
    return mediaEntry;
  }

  /**
   * Returns parsed entry list by given OTT response objects
   * @function getEntryList
   * @param {any} playlistResponse - response
   * @returns {Playlist} - The entry list
   * @static
   * @public
   */
  static getEntryList(playlistResponse: any): EntryList {
    const entryList = new EntryList();
    const playlistItems = playlistResponse.playlistItems.entries;
    playlistItems.forEach(entry => {
      const mediaEntry = new MediaEntry();
      OTTProviderParser._fillBaseData(mediaEntry, entry);
      entryList.items.push(mediaEntry);
    });
    return entryList;
  }

  static _fillBaseData(mediaEntry: MediaEntry, assetResponse: any) {
    const mediaAsset = assetResponse.mediaDataResult;
    const metaData = OTTProviderParser.reconstructMetadata(mediaAsset);
    metaData.description = mediaAsset.description;
    metaData.name = mediaAsset.name;
    mediaEntry.metadata = metaData;
    mediaEntry.poster = OTTProviderParser._getPoster(mediaAsset.pictures);
    mediaEntry.id = mediaAsset.id;
    return mediaEntry;
  }

  /**
   * reconstruct the metadata
   * @param {Object} mediaAsset the mediaAsset that contains the response with the metadata.
   * @returns {Object} reconstructed metadata object
   */
  static reconstructMetadata(mediaAsset: Object): Object {
    const metadata = {
      metas: OTTProviderParser.addToMetaObject(mediaAsset.metas),
      tags: OTTProviderParser.addToMetaObject(mediaAsset.tags)
    };
    return metadata;
  }

  /**
   * transform an array of [{key: value},{key: value}...] to an object
   * @param {Array<Object>} list a list of objects
   * @returns {Object} an mapped object of the arrayed list.
   */
  static addToMetaObject(list: Array<Object>): Object {
    let categoryObj = {};
    if (list) {
      list.forEach(item => {
        categoryObj[item.key] = item.value;
      });
    }
    return categoryObj;
  }

  /**
   * Gets the poster url without width and height.
   * @param {Array<Object>} pictures - Media pictures.
   * @returns {string | Array<Object>} - Poster base url or array of poster candidates.
   * @private
   */
  static _getPoster(pictures: Array<Object>): string | Array<Object> {
    if (pictures && pictures.length > 0) {
      const picObj = pictures[0];
      const url = picObj.url;
      // Search for thumbnail service
      const regex = /.*\/thumbnail\/.*(?:width|height)\/\d+\/(?:height|width)\/\d+/;
      if (regex.test(url)) {
        return url;
      }
      return pictures.map(pic => ({url: pic.url, width: pic.width, height: pic.height}));
    }
    return '';
  }

  /**
   * Gets the media type (LIVE/VOD)
   * @param {Object} mediaAssetData - The media asset data.
   * @param {string} mediaType - The asset media type.
   * @param {string} contextType - The asset context type.
   * @returns {Object} - The type data object.
   * @private
   */
  static _getMediaType(mediaAssetData: Object, mediaType: string, contextType: string): Object {
    let typeData = {type: MediaEntry.Type.UNKNOWN};
    if (MediaTypeCombinations[mediaType] && MediaTypeCombinations[mediaType][contextType]) {
      typeData = MediaTypeCombinations[mediaType][contextType](mediaAssetData);
    }
    return typeData;
  }

  /**
   * Filtered the vidiunSources array by device type.
   * @param {Array<VidiunPlaybackSource>} vidiunSources - The vidiun sources.
   * @param {Array<string>} formats - Partner device formats.
   * @returns {Array<VidiunPlaybackSource>} - Filtered vidiunSources array.
   * @private
   */
  static _filterSourcesByFormats(vidiunSources: Array<VidiunPlaybackSource>, formats: Array<string>): Array<VidiunPlaybackSource> {
    if (formats.length > 0) {
      vidiunSources = vidiunSources.filter(source => formats.includes(source.type));
    }
    return vidiunSources;
  }

  /**
   * Returns the parsed sources
   * @function _getParsedSources
   * @param {Array<VidiunPlaybackSource>} vidiunSources - The vidiun sources
   * @param {Object} playbackContext - The playback context
   * @return {MediaSources} - A media sources
   * @static
   * @private
   */
  static _getParsedSources(vidiunSources: Array<VidiunPlaybackSource>): MediaSources {
    const sources = new MediaSources();
    const addAdaptiveSource = (source: VidiunPlaybackSource) => {
      const parsedSource = OTTProviderParser._parseAdaptiveSource(source);
      if (parsedSource) {
        const sourceFormat = SupportedStreamFormat.get(source.format);
        sources.map(parsedSource, sourceFormat);
      }
    };
    const parseAdaptiveSources = () => {
      vidiunSources.filter(source => !isProgressiveSource(source.format)).forEach(addAdaptiveSource);
    };
    const parseProgressiveSources = () => {
      vidiunSources.filter(source => isProgressiveSource(source.format)).forEach(addAdaptiveSource);
    };
    if (vidiunSources && vidiunSources.length > 0) {
      parseAdaptiveSources();
      parseProgressiveSources();
    }
    return sources;
  }

  /**
   * Returns a parsed adaptive source
   * @function _parseAdaptiveSource
   * @param {VidiunPlaybackSource} vidiunSource - A vidiun source
   * @returns {?MediaSource} - The parsed adaptive vidiunSource
   * @static
   * @private
   */
  static _parseAdaptiveSource(vidiunSource: ?VidiunPlaybackSource): ?MediaSource {
    const mediaSource = new MediaSource();
    if (vidiunSource) {
      const playUrl = vidiunSource.url;
      const mediaFormat = SupportedStreamFormat.get(vidiunSource.format);
      if (mediaFormat) {
        mediaSource.mimetype = mediaFormat.mimeType;
      }
      if (!playUrl) {
        OTTProviderParser._logger.error(
          `failed to create play url from source, discarding source: (${vidiunSource.fileId}), ${vidiunSource.format}.`
        );
        return null;
      }
      mediaSource.url = playUrl;
      mediaSource.id = vidiunSource.fileId + ',' + vidiunSource.format;
      if (vidiunSource.hasDrmData()) {
        const drmParams: Array<Drm> = [];
        vidiunSource.drm.forEach(drm => {
          drmParams.push(new Drm(drm.licenseURL, VidiunDrmPlaybackPluginData.Scheme[drm.scheme], drm.certificate));
        });
        mediaSource.drmData = drmParams;
      }
    }
    return mediaSource;
  }

  static hasBlockAction(response): boolean {
    return response.playBackContextResult.hasBlockAction();
  }

  static getBlockAction(response): ?VidiunRuleAction {
    return response.playBackContextResult.getBlockAction();
  }

  static getErrorMessages(response: OTTAssetLoaderResponse): Array<VidiunAccessControlMessage> {
    return response.playBackContextResult.getErrorMessages();
  }
}
