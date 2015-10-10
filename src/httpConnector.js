var traverse = require('traverse');
var Busboy = require('busboy');

module.exports = function(options){
  var base = options.base || "";
  var path = options.path || "/http-pipe-connector";
  return {
    HTTPClientServerStream: function Stream(clientOptions){
      var fetchFn = clientOptions.fetch || fetch;
      var StreamHandler=null;
      return {
        send: function(message){
          var files = traverse(message).reduce(function(files, item){
            if(item instanceof File) files.push({path: this.path, item: item});
            return files;
          }, []);
          var waitForFiles = files.reduce(function(files, file){
            files.push(file.path.join('|'));
            return files;
          },[]);
          if(waitForFiles.length) {
            message.__waitForFiles = waitForFiles;
            message.__waitForFilesCallId = Math.ceil(Math.random() * Math.pow(10, 16));
          }

          fetchFn(base + path,{
            method: 'post',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
          }).then(function(response){
            return response.json();
          }).then(function(message){
            if(StreamHandler) return StreamHandler(message);
            return message;
          });
          if(!message.__waitForFilesCallId) return;
          var filesForm = new FormData();
          filesForm.append('__waitForFilesCallId', message.__waitForFilesCallId);
          var filesForm = files.reduce(function(filesForm, file){
            var fileId = file.path.join('|');
            filesForm.append(fileId, file.item.buffer || file.item);
            return filesForm;
          }, filesForm);

          fetchFn(base + path + ".files",{
            method: 'post',
            body: filesForm
          }).then(function(response){
            console.log(response)
          })
        },
        listen: function(handler){
          StreamHandler = handler;
        }
      }
    },
    //express app
    //highly experimental
    HTTPServerClientStream: function ServerClientStream(app){
      var StreamHandler;
      var FilesForRequest = {};
      app.use(function(req, res, next){
        if(req.originalUrl == path && req.method=='POST'){
          var message = req.body;
          message._response = res;

          if(message.__waitForFilesCallId){
            FilesForRequest[message.__waitForFilesCallId] = message.__waitForFiles.reduce(function PromiseToResolveAllFiles(all, file){
              all[file] ={};
              all[file].Promise = new Promise(function(resolve, reject){
                this.resolve = resolve;
                this.reject = reject;
              }.bind(all[file]));
              return all;
            },{})
            var filesPromiseArr = Object.keys(FilesForRequest[message.__waitForFilesCallId]).map(function getPromises(key){
              return FilesForRequest[message.__waitForFilesCallId][key].Promise;
            })
            return Promise.all(filesPromiseArr).then(function(files){
              delete FilesForRequest[message.__waitForFilesCallId];
              delete message.__waitForFilesCallId;
              delete message.__waitForFiles;
              files.forEach(function setFilesToObject(file){
                var path = file.path.split("|");
                path.push('stream');
                traverse(message).set(path, file.file);
              })
              StreamHandler(message)
            })
          }
          StreamHandler(message)
        } else if(req.originalUrl == path + ".files" && req.method=='POST'){
          var busboy = new Busboy({ headers: req.headers });
          var fields = {};
          busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
            fields[fieldname] = val;
          });
          busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            FilesForRequest[fields.__waitForFilesCallId][fieldname].resolve({file:file, path: fieldname, filename: filename,encoding:encoding, mimetype:mimetype})
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
  }
}
