//@flow
import VidiunPlaybackContext from './response-types/vidiun-playback-context';
import VidiunMetadataListResponse from './response-types/vidiun-metadata-list-response';
import VidiunMediaEntry from './response-types/vidiun-media-entry';
import VidiunPlaybackSource from './response-types/vidiun-playback-source';
import VidiunDrmPlaybackPluginData from '../common/response-types/vidiun-drm-playback-plugin-data';
import PlaySourceUrlBuilder from './play-source-url-builder';
import XmlParser from '../../util/xml-parser';
import getLogger from '../../util/logger';
import OVPConfiguration from './config';
import MediaEntry from '../../entities/media-entry';
import Drm from '../../entities/drm';
import MediaSource from '../../entities/media-source';
import MediaSources from '../../entities/media-sources';
import {SupportedStreamFormat, isProgressiveSource} from '../../entities/media-format';
import Playlist from '../../entities/playlist';
import EntryList from '../../entities/entry-list';
import VidiunRuleAction from './response-types/vidiun-rule-action';
import VidiunAccessControlMessage from '../common/response-types/vidiun-access-control-message';
import type {OVPMediaEntryLoaderResponse} from './loaders/media-entry-loader';
import {ExternalCaptionsBuilder} from './external-captions-builder';

export default class OVPProviderParser {
  static _logger = getLogger('OVPProviderParser');

  /**
   * Returns parsed media entry by given OVP response objects
   * @function getMediaEntry
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {any} mediaEntryResponse - The media entry response
   * @returns {MediaEntry} - The media entry
   * @static
   * @public
   */
  static getMediaEntry(vs: string, partnerId: number, uiConfId: ?number, mediaEntryResponse: any): MediaEntry {
    const mediaEntry = new MediaEntry();
    const entry = mediaEntryResponse.entry;
    const playbackContext = mediaEntryResponse.playBackContextResult;
    const metadataList = mediaEntryResponse.metadataListResult;
    const vidiunSources = playbackContext.sources;

    mediaEntry.sources = OVPProviderParser._getParsedSources(vidiunSources, vs, partnerId, uiConfId, entry, playbackContext);
    if (OVPConfiguration.get().useApiCaptions && playbackContext.data.playbackCaptions) {
      mediaEntry.sources.captions = ExternalCaptionsBuilder.createConfig(playbackContext.data.playbackCaptions);
    }
    OVPProviderParser._fillBaseData(mediaEntry, entry, metadataList);
    return mediaEntry;
  }

  /**
   * Returns parsed playlist by given OVP response objects
   * @function getPlaylist
   * @param {any} playlistResponse - The playlist response
   * @returns {Playlist} - The playlist
   * @static
   * @public
   */
  static getPlaylist(playlistResponse: any): Playlist {
    const playlist = new Playlist();
    const playlistData = playlistResponse.playlistData;
    const playlistItems = playlistResponse.playlistItems.entries;
    playlist.id = playlistData.id;
    playlist.name = playlistData.name;
    playlist.description = playlistData.description;
    playlist.poster = playlistData.poster;
    playlistItems.forEach((entry: VidiunMediaEntry) => {
      const mediaEntry = new MediaEntry();
      OVPProviderParser._fillBaseData(mediaEntry, entry);
      playlist.items.push(mediaEntry);
    });
    return playlist;
  }

  /**
   * Returns parsed entry list by given OVP response objects
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
      OVPProviderParser._fillBaseData(mediaEntry, entry);
      entryList.items.push(mediaEntry);
    });
    return entryList;
  }

  static _fillBaseData(mediaEntry: MediaEntry, entry: VidiunMediaEntry, metadataList: ?VidiunMetadataListResponse) {
    mediaEntry.poster = entry.poster;
    mediaEntry.id = entry.id;
    mediaEntry.duration = entry.duration;
    mediaEntry.metadata = OVPProviderParser._parseMetadata(metadataList);
    mediaEntry.metadata.description = entry.description || '';
    mediaEntry.metadata.name = entry.name || '';
    mediaEntry.metadata.tags = entry.tags || '';

    mediaEntry.type = OVPProviderParser._getEntryType(entry.entryType, entry.type);
    if (mediaEntry.type === MediaEntry.Type.LIVE) {
      mediaEntry.dvrStatus = entry.dvrStatus;
    }

    return mediaEntry;
  }

  static _getEntryType(entryTypeEnum: number, typeEnum: number | string): string {
    let type = MediaEntry.Type.UNKNOWN;
    switch (entryTypeEnum) {
      case VidiunMediaEntry.MediaType.IMAGE.value:
        type = MediaEntry.Type.IMAGE;
        break;
      case VidiunMediaEntry.MediaType.AUDIO.value:
        type = MediaEntry.Type.AUDIO;
        break;
      default:
        switch (typeEnum) {
          case VidiunMediaEntry.EntryType.MEDIA_CLIP.value:
            type = MediaEntry.Type.VOD;
            break;
          case VidiunMediaEntry.EntryType.LIVE_STREAM.value:
          case VidiunMediaEntry.EntryType.LIVE_CHANNEL.value:
            type = MediaEntry.Type.LIVE;
            break;
          default:
            type = MediaEntry.Type.UNKNOWN;
        }
    }
    return type;
  }

  /**
   * Returns the parsed sources
   * @function _getParsedSources
   * @param {Array<VidiunPlaybackSource>} vidiunSources - The vidiun sources
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {Object} entry - The entry
   * @param {VidiunPlaybackContext} playbackContext - The playback context
   * @return {MediaSources} - A media sources
   * @static
   * @private
   */
  static _getParsedSources(
    vidiunSources: Array<VidiunPlaybackSource>,
    vs: string,
    partnerId: number,
    uiConfId: ?number,
    entry: Object,
    playbackContext: VidiunPlaybackContext
  ): MediaSources {
    const sources = new MediaSources();
    const addAdaptiveSource = (source: VidiunPlaybackSource) => {
      const parsedSource = OVPProviderParser._parseAdaptiveSource(source, playbackContext, vs, partnerId, uiConfId, entry.id);
      if (parsedSource) {
        const sourceFormat = SupportedStreamFormat.get(source.format);
        sources.map(parsedSource, sourceFormat);
      }
    };
    const parseAdaptiveSources = () => {
      vidiunSources.filter(source => !isProgressiveSource(source.format)).forEach(addAdaptiveSource);
    };
    const parseProgressiveSources = () => {
      const progressiveSource = vidiunSources.find(source => isProgressiveSource(source.format));
      sources.progressive = OVPProviderParser._parseProgressiveSources(progressiveSource, playbackContext, vs, partnerId, uiConfId, entry.id);
    };

    const parseExternalMedia = () => {
      const mediaSource = new MediaSource();
      mediaSource.mimetype = 'video/youtube';
      mediaSource.url = entry.referenceId;
      mediaSource.id = entry.id + '_youtube';
      sources.progressive.push(mediaSource);
    };

    if (entry.type === VidiunMediaEntry.EntryType.EXTERNAL_MEDIA.value) {
      parseExternalMedia();
    } else if (vidiunSources && vidiunSources.length > 0) {
      parseAdaptiveSources();
      parseProgressiveSources();
    }
    return sources;
  }

  /**
   * Returns a parsed adaptive source
   * @function _parseAdaptiveSource
   * @param {VidiunPlaybackSource} vidiunSource - A vidiun source
   * @param {VidiunPlaybackContext} playbackContext - The playback context
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {string} entryId - The entry id
   * @returns {?MediaSource} - The parsed adaptive vidiunSource
   * @static
   * @private
   */
  static _parseAdaptiveSource(
    vidiunSource: ?VidiunPlaybackSource,
    playbackContext: VidiunPlaybackContext,
    vs: string,
    partnerId: number,
    uiConfId: ?number,
    entryId: string
  ): ?MediaSource {
    const mediaSource: MediaSource = new MediaSource();
    if (vidiunSource) {
      let playUrl: string = '';
      const mediaFormat = SupportedStreamFormat.get(vidiunSource.format);
      const protocol = vidiunSource.getProtocol(OVPProviderParser._getBaseProtocol());
      const deliveryProfileId = vidiunSource.deliveryProfileId;
      const format = vidiunSource.format;
      let extension: string = '';
      if (mediaFormat) {
        extension = mediaFormat.pathExt;
        mediaSource.mimetype = mediaFormat.mimeType;
      }
      // in case playbackSource doesn't have flavors we don't need to build the url and we'll use the provided one.
      if (vidiunSource.hasFlavorIds()) {
        if (!extension && playbackContext.flavorAssets && playbackContext.flavorAssets.length > 0) {
          extension = playbackContext.flavorAssets[0].fileExt;
        }
        playUrl = PlaySourceUrlBuilder.build({
          entryId,
          flavorIds: vidiunSource.flavorIds,
          format,
          vs,
          partnerId,
          uiConfId,
          extension,
          protocol
        });
      } else {
        playUrl = vidiunSource.url;
      }
      if (!playUrl) {
        const message = `failed to create play url from source, discarding source: (${entryId}_${deliveryProfileId}), ${format}`;
        OVPProviderParser._logger.warn(message);
        return null;
      }
      mediaSource.url = OVPProviderParser._applyRegexAction(playbackContext, playUrl);
      mediaSource.id = entryId + '_' + deliveryProfileId + ',' + format;
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

  /**
   * Returns parsed progressive sources
   * @function _parseProgressiveSources
   * @param {VidiunPlaybackSource} vidiunSource - A vidiun source
   * @param {VidiunPlaybackContext} playbackContext - The playback context
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {string} entryId - The entry id
   * @returns {Array<MediaSource>} - The parsed progressive vidiunSources
   * @static
   * @private
   */
  static _parseProgressiveSources(
    vidiunSource: ?VidiunPlaybackSource,
    playbackContext: VidiunPlaybackContext,
    vs: string,
    partnerId: number,
    uiConfId: ?number,
    entryId: string
  ): Array<MediaSource> {
    const videoSources: Array<MediaSource> = [];
    const audioSources: Array<MediaSource> = [];
    if (vidiunSource) {
      const protocol = vidiunSource.getProtocol(OVPProviderParser._getBaseProtocol());
      const format = vidiunSource.format;
      const deliveryProfileId = vidiunSource.deliveryProfileId;
      const sourceId = deliveryProfileId + ',' + format;
      playbackContext.flavorAssets.map(flavor => {
        const mediaSource: MediaSource = new MediaSource();
        mediaSource.id = flavor.id + sourceId;
        mediaSource.mimetype = flavor.fileExt === 'mp3' ? 'audio/mp3' : 'video/mp4';
        mediaSource.height = flavor.height;
        mediaSource.width = flavor.width;
        mediaSource.bandwidth = flavor.bitrate * 1024;
        mediaSource.label = flavor.label || flavor.language;
        const playUrl = PlaySourceUrlBuilder.build({
          entryId,
          flavorIds: flavor.id,
          format,
          vs,
          partnerId: partnerId,
          uiConfId: uiConfId,
          extension: flavor.fileExt,
          protocol
        });
        if (playUrl === '') {
          OVPProviderParser._logger.warn(`failed to create play url from source, discarding source: (${entryId}_${deliveryProfileId}), ${format}.`);
          return null;
        } else {
          mediaSource.url = OVPProviderParser._applyRegexAction(playbackContext, playUrl);
          if (flavor.height && flavor.width) {
            videoSources.push(mediaSource);
          } else {
            audioSources.push(mediaSource);
          }
        }
      });
    }
    //If we have only audio flavors return them, otherwise return video flavors
    return audioSources.length && !videoSources.length ? audioSources : videoSources;
  }

  /**
   * Ovp metadata parser
   * @function _parseMetaData
   * @param {VidiunMetadataListResponse} metadataList The metadata list
   * @returns {Object} Parsed metadata
   * @static
   * @private
   */
  static _parseMetadata(metadataList: ?VidiunMetadataListResponse): Object {
    const metadata = {};
    if (metadataList && metadataList.metas && metadataList.metas.length > 0) {
      metadataList.metas.forEach(meta => {
        let metaXml: Object;
        const domParser: DOMParser = new DOMParser();
        meta.xml = meta.xml.replace(/\r?\n|\r/g, '');
        meta.xml = meta.xml.replace(/>\s*/g, '>');
        meta.xml = meta.xml.replace(/>\s*/g, '>');
        metaXml = domParser.parseFromString(meta.xml, 'text/xml');
        const metasObj: Object = XmlParser.xmlToJson(metaXml);
        const metaKeys = Object.keys(metasObj.metadata);
        metaKeys.forEach(key => {
          metadata[key] = metasObj.metadata[key]['#text'];
        });
      });
    }
    return metadata;
  }

  /**
   * Returns the base protocol
   * @function _getBaseProtocol
   * @returns {string} - The base protocol
   * @static
   * @private
   */
  static _getBaseProtocol(): string {
    const config = OVPConfiguration.get();
    const protocolRegex = /^https?:/;
    const result = protocolRegex.exec(config.cdnUrl);
    const protocol = result ? result[0] : document.location.protocol;
    if (typeof protocol === 'string') {
      return protocol.slice(0, -1); // remove ':' from the end
    }
    return 'https';
  }

  static hasBlockAction(response: OVPMediaEntryLoaderResponse): boolean {
    return response.playBackContextResult.hasBlockAction();
  }

  static getBlockAction(response: OVPMediaEntryLoaderResponse): ?VidiunRuleAction {
    return response.playBackContextResult.getBlockAction();
  }

  static getErrorMessages(response: OVPMediaEntryLoaderResponse): Array<VidiunAccessControlMessage> {
    return response.playBackContextResult.getErrorMessages();
  }

  /**
   * Applies the request host regex on the url
   * @function _applyRegexAction
   * @param {VidiunPlaybackContext} playbackContext - The playback context
   * @param {string} playUrl - The original url
   * @returns {string} - The request host regex applied url
   * @static
   * @private
   */
  static _applyRegexAction(playbackContext: VidiunPlaybackContext, playUrl: string): string {
    const regexAction = playbackContext.getRequestHostRegexAction();
    if (regexAction) {
      const regex = new RegExp(regexAction.pattern, 'i');
      if (playUrl.match(regex)) {
        return playUrl.replace(regex, regexAction.replacement + '/');
      }
    }
    return playUrl;
  }
}
