var traverse = require('traverse');
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
    // backend Mock
    }
  }
}
