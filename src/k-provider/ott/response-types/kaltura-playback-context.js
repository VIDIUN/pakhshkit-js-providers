//@flow
import ServiceResult from '../../common/base-service-result';
import VidiunAccessControlMessage from '../../common/response-types/vidiun-access-control-message';
import VidiunRuleAction from './vidiun-rule-action';
import VidiunPlaybackSource from './vidiun-playback-source';

export default class VidiunPlaybackContext extends ServiceResult {
  static Type: {[type: string]: string} = {
    TRAILER: 'TRAILER',
    CATCHUP: 'CATCHUP',
    START_OVER: 'START_OVER',
    PLAYBACK: 'PLAYBACK'
  };
  /**
   * @member - The playback sources
   * @type {Array<VidiunPlaybackSource>}
   */
  sources: Array<VidiunPlaybackSource> = [];
  /**
   * @member - Array of actions as received from the rules that invalidated
   * @type {Array<VidiunRuleAction>}
   */
  actions: Array<VidiunRuleAction> = [];
  /**
   * @member - Array of actions as received from the rules that invalidated
   * @type {Array<VidiunAccessControlMessage>}
   */
  messages: Array<VidiunAccessControlMessage> = [];

  /**
   * @constructor
   * @param {Object} response The response
   */
  constructor(response: Object) {
    super(response);
    if (!this.hasError) {
      const messages = response.messages;
      if (messages) {
        messages.map(message => this.messages.push(new VidiunAccessControlMessage(message)));
      }
      const actions = response.actions;
      if (actions) {
        actions.map(action => this.actions.push(new VidiunRuleAction(action)));
      }
      const sources = response.sources;
      if (sources) {
        sources.map(source => this.sources.push(new VidiunPlaybackSource(source)));
      }
    }
  }

  hasBlockAction(): boolean {
    return this.getBlockAction() !== undefined;
  }

  getBlockAction(): ?VidiunRuleAction {
    return this.actions.find(action => action.type === VidiunRuleAction.Type.BLOCK);
  }

  getErrorMessages(): Array<VidiunAccessControlMessage> {
    return this.messages;
  }
}
