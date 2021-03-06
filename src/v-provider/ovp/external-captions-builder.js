// @flow

const VidiunCaptionType: CaptionType = {
  SRT: '1',
  DFXP: '2',
  WEBVTT: '3',
  CAP: '4'
};

const CaptionsFormatsMap: {[format: string]: string} = {
  '3': 'vtt',
  '1': 'srt'
};

class ExternalCaptionsBuilder {
  static createConfig(captions: Array<Object>): Array<PKExternalCaptionObject> {
    return captions.map(caption => {
      let url = caption.url;
      let type = CaptionsFormatsMap[caption.format];
      if ([VidiunCaptionType.DFXP, VidiunCaptionType.CAP].includes(caption.format)) {
        url = caption.webVttUrl;
        type = CaptionsFormatsMap[VidiunCaptionType.WEBVTT];
      }
      return {
        default: !!caption.isDefault,
        type: type,
        language: caption.languageCode,
        label: caption.label,
        url: url
      };
    });
  }
}

export {ExternalCaptionsBuilder};
