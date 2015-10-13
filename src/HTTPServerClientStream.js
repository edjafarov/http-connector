var Busboy = require('busboy');
var traverse = require('traverse');
var stream = require('stream');

module.exports = function ServerClientStream(app){
  var options = this;
  var StreamHandler;
  var FilesForRequest = {};
  app.use(function(req, res, next){
    if(req.originalUrl == options.path && req.method=='POST'){
      var message = req.body;
      message._response = res;
      if(message.__waitForFilesCallId){
        //make a TimeoutDestroy to clean dead references up
        FilesForRequest[message.__waitForFilesCallId] = {};
        message.__waitForFiles.forEach(function putStreamsInPlace(fileId){
          FilesForRequest[message.__waitForFilesCallId][fileId] = new stream.PassThrough();

          var path = fileId.split("|");

          path.push('stream');

          traverse(message).set(path, FilesForRequest[message.__waitForFilesCallId][fileId]);
        });
      }
      StreamHandler(message)
    } else if(req.originalUrl == options.path + ".files" && req.method=='POST'){
      var busboy = new Busboy({ headers: req.headers });
      var fields = {};
      busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
        fields[fieldname] = val;
      });
      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        file.pipe(FilesForRequest[fields.__waitForFilesCallId][fieldname])
      });
      //kill all after busboy end
      busboy.on('finish', function() {
        delete FilesForRequest[fields.__waitForFilesCallId];
        res.writeHead(303, { Connection: 'close', Location: '/' });
        res.end();
      });
      req.pipe(busboy);
    } else {
      return next();
    }
  });
  return {
    send: function(message){
      if(!message._response) throw Error("no response defined");
      var res = message._response;
      delete message._response;
      res.json(message);
    },
    listen: function(handler){
      StreamHandler = handler;
    }
  }
}
