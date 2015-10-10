var express = require('express');
var test_port = 4567;
FormData = require('form-data');
var connector = require('../src/httpConnector')({
  base: 'http://localhost:'+test_port
});
var fetch = require('node-fetch');
fetch.Promise = require('es6-promise').Promise;
var sinon = require('sinon');
var bodyParser = require('body-parser');
var FileAPI = require('file-api')
  File = FileAPI.File;
  FileList = FileAPI.FileList;
  FileReader = FileAPI.FileReader;


var mockFile1 = new File({
  name: "mockFile1.txt",   // required
  type: "text/plain",     // optional
  buffer: new Buffer("Lorem ipsum dolor sit amet.")
});
var mockFile2 = new File({
  name: "mockFile2.txt",   // required
  type: "text/plain",     // optional
  buffer: new Buffer("Consectetur adipiscing elit.")
});

var messageMock = {
  prop1: "mock1",
  prop2: "mock2",
  files: [mockFile1, mockFile2]
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

  describe('send a message with file', function(){
    var response;
    before(function(done){
      cconn.send(messageMock);
      setTimeout(done, 50);
    })

    it('the message should pass from client to server', function(){
      var incomingMessage = serverHandler.lastCall.args[0];
      response = incomingMessage._response;
      delete incomingMessage._response;
      expect(incomingMessage.files[0]).to.have.property('pipe').that.is.a('function');
      expect(incomingMessage.files[1]).to.have.property('pipe').that.is.a('function')
    })
    xdescribe('send response', function(){
      before(function(done){
        messageResponseMock._response = response;
        sconn.send(messageResponseMock);
        setTimeout(done, 50);
      })
      it('the message should pass from server to client', function(){
        var incomingMessage = clientHandler.lastCall.args[0];
        //expect(incomingMessage).deep.equal(messageResponseMock)
      })
    })
  })

  after(function(done){
    srv.close();
    done()
  })
})
