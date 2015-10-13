var traverse = require('traverse');

module.exports = function Stream(clientOptions){
  var options = this;
  clientOptions = clientOptions || {}
  var fetchFn = clientOptions.fetch || fetch;
  var StreamHandler=null;
  return {
    send: function(message){
      var files = [];
      traverse(message).forEach(function(item){
        if(item instanceof FileList) {
          this.update([].slice.call(item));
        }
        if(item instanceof File) {
          files.push({path: this.path, item: item});
          this.update({
            lastModified: item.lastModified,
            name: item.name,
            size: item.size,
            type: item.type
          })
        }
      })

      var waitForFiles = files.reduce(function(files, file){
        files.push(file.path.join('|'));
        return files;
      },[]);
      if(waitForFiles.length) {
        message.__waitForFiles = waitForFiles;
        message.__waitForFilesCallId = Math.ceil(Math.random() * Math.pow(10, 16));
      }

      fetchFn(options.base + options.path,{
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

      fetchFn(options.base + options.path + ".files",{
        method: 'post',
        body: filesForm
      }).then(function(response){
        //TODO: need to handle errors of files post somehow
        //console.log(response)
      })
    },
    listen: function(handler){
      StreamHandler = handler;
    }
  }
}
