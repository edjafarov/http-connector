## http-connector server to client and client to server connector

Connector have two parts. The web part and server part. Connector allows not to think about how to implement communication between client and server and just send messages out and handle incoming messages. The connector abstracts communication to two methods (send and listen) on one side and two methods(send and listen) on other side. Implementations could vary and any protocol that can send messages will work. This specific implementation is for http.

Connector doesn't implement transaction. Thus to make the communication as a transaction it should be implemented on top of Connector.

You can also pass files through the connector to a server. You can build as complex message objects as you like and put <File> objects anywhere, It could be multiple files in array for example <FileList>. When the message will pass to a server the <File> objects will have a stream property that you can use to pipe anywhere you like.


### HTTPServerClientStream

```javascript
var app = express();
app.use(bodyParser.json())
var sconn = connector.HTTPServerClientStream(app);
sconn.listen(function(message){
  //handle message
  message.files[0].stream.pipe(fs.createWriteStream())
  sconn.send({_response:message._response})
});
app.listen(process.env.PORT)
```

### HTTPClientServerStream

```javascript
var cconn = connector.HTTPClientServerStream();
cconn.send({files:document.getElementById('myInput').files})
cconn.listen(function(message){
  //handle message
});
```
