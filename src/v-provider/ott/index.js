// @flow
import OTTProvider from './provider';
import VidiunPlaybackContext from './response-types/vidiun-playback-context';
import VidiunAsset from './response-types/vidiun-asset';

declare var __VERSION__: string;
declare var __NAME__: string;

const NAME = __NAME__ + '-ott';
const VERSION = __VERSION__;

const ContextType = VidiunPlaybackContext.Type;
const MediaType = VidiunAsset.Type;

export {OTTProvider as Provider, ContextType, MediaType, NAME, VERSION};
