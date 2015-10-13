var traverse = require('traverse');

module.exports = function(options){
  options = options || {}
  options.base = options.base || "";
  options.path = options.path || "/http-pipe-connector";
  return {
    HTTPClientServerStream: require('./HTTPClientServerStream').bind(options),
    //express app
    //highly experimental
    HTTPServerClientStream: function ServerClientStream(app){
    // backend Mock
    }
  }
}
