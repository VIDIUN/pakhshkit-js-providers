//@flow
import ServiceResult from '../../common/base-service-result';
import VidiunAccessControlMessage from '../../common/response-types/vidiun-access-control-message';
import VidiunPlaybackSource from './vidiun-playback-source';
import VidiunAccessControlModifyRequestHostRegexAction from './vidiun-access-control-modify-request-host-regex-action';
import VidiunRuleAction from './vidiun-rule-action';
import VidiunFlavorAsset from './vidiun-flavor-asset';

export default class VidiunPlaybackContext extends ServiceResult {
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
   * @member - The flavor assets
   * @type {Array<VidiunFlavorAsset>}
   */
  flavorAssets: Array<VidiunFlavorAsset> = [];

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
        actions.map(action => {
          if (action.type === VidiunRuleAction.Type.REQUEST_HOST_REGEX) {
            this.actions.push(new VidiunAccessControlModifyRequestHostRegexAction(action));
          } else {
            this.actions.push(new VidiunRuleAction(action));
          }
        });
      }
      const sources = response.sources;
      if (sources) {
        sources.map(source => this.sources.push(new VidiunPlaybackSource(source)));
      }
      const flavorAssets = response.flavorAssets;
      if (flavorAssets) {
        flavorAssets.map(flavor => this.flavorAssets.push(new VidiunFlavorAsset(flavor)));
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

  /**
   * Get the VidiunAccessControlModifyRequestHostRegexAction action
   * @function getRequestHostRegexAction
   * @returns {?VidiunAccessControlModifyRequestHostRegexAction} The action
   * */
  getRequestHostRegexAction(): ?VidiunAccessControlModifyRequestHostRegexAction {
    const action = this.actions.find(action => action.type === VidiunRuleAction.Type.REQUEST_HOST_REGEX);
    if (action instanceof VidiunAccessControlModifyRequestHostRegexAction) {
      return action;
    }
  }
}
