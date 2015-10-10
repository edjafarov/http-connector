var express = require('express');
var test_port = 4567;
var connector = require('../src/httpConnector')({
  base: 'http://localhost:'+test_port
});
var fetch = require('node-fetch');
fetch.Promise = require('es6-promise').Promise;
var sinon = require('sinon');
var bodyParser = require('body-parser');
var messageMock = {
  prop1: "mock1",
  prop2: "mock2"
}
var messageResponseMock = {
  reprop1: "remock1",
  reprop2: "remock2"
}

var expect =require('chai').expect;


describe("Server is UP", function(){
  var srv;
  var sconn, cconn, serverHandler, clientHandler;
  before(function(done){
    var app = express();
    app.use(bodyParser.json())
    sconn = connector.HTTPServerClientStream(app);
    serverHandler = sinon.stub();
    sconn.listen(serverHandler);
    cconn = connector.HTTPClientServerStream({fetch: fetch});
    clientHandler = sinon.stub();
    cconn.listen(clientHandler);
    srv = app.listen(test_port, done);
  })

  describe('send a message from client', function(){
    var response;
    before(function(done){
      cconn.send(messageMock);
      setTimeout(done, 5);
    })

    it('the message should pass from client to server', function(){
      var incomingMessage = serverHandler.lastCall.args[0];
      response = incomingMessage._response;
      delete incomingMessage._response;
      expect(incomingMessage).deep.equal(messageMock)
    })
    describe('send response', function(){
      before(function(done){
        messageResponseMock._response = response;
        sconn.send(messageResponseMock);
        setTimeout(done, 5);
      })
      it('the message should pass from server to client', function(){
        var incomingMessage = clientHandler.lastCall.args[0];
        expect(incomingMessage).deep.equal(messageResponseMock)
      })
    })
  })

  after(function(done){
    srv.close();
    done()
  })
})
