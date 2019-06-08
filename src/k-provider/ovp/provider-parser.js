//@flow
import VidiunFlavorAsset from './response-types/vidiun-flavor-asset'
import VidiunMetadataListResponse from './response-types/vidiun-metadata-list-response'
import VidiunMediaEntry from './response-types/vidiun-media-entry'
import VidiunPlaybackSource from './response-types/vidiun-playback-source'
import VidiunDrmPlaybackPluginData from '../common/response-types/vidiun-drm-playback-plugin-data'
import PlaySourceUrlBuilder from './play-source-url-builder'
import XmlParser from '../../util/xml-parser'
import getLogger from '../../util/logger'
import OVPConfiguration from './config'
import MediaEntry from '../../entities/media-entry'
import Drm from '../../entities/drm'
import MediaSource from '../../entities/media-source'
import MediaSources from '../../entities/media-sources'
import {SupportedStreamFormat} from '../../entities/media-format'
import BaseProviderParser from '../common/base-provider-parser'

export default class OVPProviderParser extends BaseProviderParser {
  static _logger = getLogger("OVPProviderParser");

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
    mediaEntry.poster = entry.poster;
    mediaEntry.id = entry.id;
    mediaEntry.duration = entry.duration;
    mediaEntry.metadata = this._parseMetadata(metadataList);
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
   * @param {Object} playbackContext - The playback context
   * @return {MediaSources} - A media sources
   * @static
   * @private
   */
  static _getParsedSources(vidiunSources: Array<VidiunPlaybackSource>, vs: string, partnerId: number, uiConfId: ?number, entry: Object, playbackContext: Object): MediaSources {
    const sources = new MediaSources();
    const addAdaptiveSource = (source: VidiunPlaybackSource) => {
      const parsedSource = OVPProviderParser._parseAdaptiveSource(source, playbackContext.flavorAssets, vs, partnerId, uiConfId, entry.id);
      const sourceFormat = SupportedStreamFormat.get(source.format);
      sources.map(parsedSource, sourceFormat);
    };
    const parseAdaptiveSources = () => {
      vidiunSources.filter((source) => !OVPProviderParser._isProgressiveSource(source)).forEach(addAdaptiveSource);
    };
    const parseProgressiveSources = () => {
      const progressiveSource = vidiunSources.find(OVPProviderParser._isProgressiveSource);
      sources.progressive = OVPProviderParser._parseProgressiveSources(progressiveSource, playbackContext.flavorAssets, vs, partnerId, uiConfId, entry.id);
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
   * @param {Array<VidiunFlavorAsset>} flavorAssets - The flavor Assets of the vidiun source
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {string} entryId - The entry id
   * @returns {MediaSource} - The parsed adaptive vidiunSource
   * @static
   * @private
   */
  static _parseAdaptiveSource(vidiunSource: ?VidiunPlaybackSource, flavorAssets: Array<VidiunFlavorAsset>, vs: string, partnerId: number, uiConfId: ?number, entryId: string): MediaSource {
    const mediaSource: MediaSource = new MediaSource();
    if (vidiunSource) {
      let playUrl: string = "";
      const mediaFormat = SupportedStreamFormat.get(vidiunSource.format);
      let extension: string = "";
      if (mediaFormat) {
        extension = mediaFormat.pathExt;
        mediaSource.mimetype = mediaFormat.mimeType;
      }
      // in case playbackSource doesn't have flavors we don't need to build the url and we'll use the provided one.
      if (vidiunSource.hasFlavorIds()) {
        if (!extension && flavorAssets && flavorAssets.length > 0) {
          extension = flavorAssets[0].fileExt;
        }
        playUrl = PlaySourceUrlBuilder.build({
          entryId: entryId,
          flavorIds: vidiunSource.flavorIds,
          format: vidiunSource.format,
          vs: vs,
          partnerId: partnerId,
          uiConfId: uiConfId,
          extension: extension,
          protocol: vidiunSource.getProtocol(this._getBaseProtocol())
        });
      } else {
        playUrl = vidiunSource.url;
      }
      if (playUrl === "") {
        OVPProviderParser._logger.error(`failed to create play url from source, discarding source: (${entryId}_${vidiunSource.deliveryProfileId}), ${vidiunSource.format}.`);
        return mediaSource;
      }
      mediaSource.url = playUrl;
      mediaSource.id = entryId + "_" + vidiunSource.deliveryProfileId + "," + vidiunSource.format;
      if (vidiunSource.hasDrmData()) {
        const drmParams: Array<Drm> = [];
        vidiunSource.drm.forEach((drm) => {
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
   * @param {Array<VidiunFlavorAsset>} flavorAssets - The flavor Assets of the vidiun source
   * @param {string} vs - The vs
   * @param {number} partnerId - The partner ID
   * @param {number} uiConfId - The uiConf ID
   * @param {string} entryId - The entry id
   * @returns {Array<MediaSource>} - The parsed progressive vidiunSources
   * @static
   * @private
   */
  static _parseProgressiveSources(vidiunSource: ?VidiunPlaybackSource, flavorAssets: Array<VidiunFlavorAsset>, vs: string, partnerId: number, uiConfId: ?number, entryId: string): Array<MediaSource> {
    const videoSources: Array<MediaSource> = [];
    const audioSources: Array<MediaSource> = [];
    if (vidiunSource) {
      const protocol = vidiunSource.getProtocol(this._getBaseProtocol());
      const format = vidiunSource.format;
      const sourceId = vidiunSource.deliveryProfileId + "," + vidiunSource.format;
      flavorAssets.map((flavor) => {
        const mediaSource: MediaSource = new MediaSource();
        mediaSource.id = flavor.id + sourceId;
        mediaSource.mimetype = (flavor.fileExt === 'mp3') ? 'audio/mp3' : 'video/mp4';
        mediaSource.height = flavor.height;
        mediaSource.width = flavor.width;
        mediaSource.bandwidth = flavor.bitrate * 1024;
        mediaSource.label = flavor.label || flavor.language;
        mediaSource.url = PlaySourceUrlBuilder.build({
          entryId: entryId,
          flavorIds: flavor.id,
          format: format,
          vs: vs,
          partnerId: partnerId,
          uiConfId: uiConfId,
          extension: flavor.fileExt,
          protocol: protocol
        });
        if (flavor.height && flavor.width) {
          videoSources.push(mediaSource);
        } else {
          audioSources.push(mediaSource);
        }
      });
    }
    //If we have only audio flavors return them, otherwise return video flavors
    return (audioSources.length && !videoSources.length) ? audioSources : videoSources;
  }

  /**
   * Ovp metadata parser
   * @function _parseMetaData
   * @param {VidiunMetadataListResponse} metadataList The metadata list
   * @returns {Object} Parsed metadata
   * @static
   * @private
   */
  static _parseMetadata(metadataList: VidiunMetadataListResponse): Object {
    const metadata = {};
    if (metadataList && metadataList.metas && metadataList.metas.length > 0) {
      metadataList.metas.forEach((meta) => {
        let metaXml: Object;
        const domParser: DOMParser = new DOMParser();
        meta.xml = meta.xml.replace(/\r?\n|\r/g, "");
        meta.xml = meta.xml.replace(/>\s*/g, '>');
        meta.xml = meta.xml.replace(/>\s*/g, '>');
        metaXml = domParser.parseFromString(meta.xml, 'text/xml');
        const metasObj: Object = XmlParser.xmlToJson(metaXml);
        const metaKeys = Object.keys(metasObj.metadata);
        metaKeys.forEach((key) => {
          metadata[key] = metasObj.metadata[key]["#text"];
        })
      })
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
    if (typeof protocol === "string") {
      return protocol.slice(0, -1) // remove ':' from the end
    }
    return "https";
  }
}
