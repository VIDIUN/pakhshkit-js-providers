import OTTBookmarkService from '../../../../../src/v-provider/ott/services/bookmark/bookmark-service';
import RequestBuilder from '../../../../../src/util/request-builder';
import OTTConfiguration from '../../../../../src/v-provider/ott/config';

describe('bookmark service - add', function() {
  const ottParams = OTTConfiguration.get();
  const vs = '1234';
  const serviceUrl = 'http://my/url';
  let bookMark, playerData;

  beforeEach(function() {
    playerData = {
      action: 'MY_ACTION'
    };
    bookMark = {
      type: 'MEDIA_TYPE',
      id: 'MEDIA_ID',
      position: 0,
      playerData: playerData
    };
  });

  it('should be proper values', function() {
    const request = OTTBookmarkService.add(serviceUrl, vs, bookMark);
    (request instanceof RequestBuilder).should.be.true;
    request.service.should.be.equal('bookmark');
    request.action.should.be.equal('add');
    request.method.should.be.equal('POST');
    request.url.should.be.equal(`${serviceUrl}/service/bookmark/action/add`);
    Object.assign(playerData, {objectType: 'VidiunBookmarkPlayerData'});
    Object.assign(bookMark, {objectType: 'VidiunBookmark'});
    JSON.parse(request.params).should.deep.equal({
      bookmark: bookMark,
      vs: vs,
      apiVersion: ottParams.serviceParams.apiVersion
    });
  });
});
