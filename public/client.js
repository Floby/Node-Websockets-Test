/**
 * client-side javascript
 */

(function () {

// mozilla implementation doesn't seem to work with
// socket.io *sigh* and it allows to delete native stuff
// so xhr-multipart will be used
delete WebSocket;
delete WebSockets;

var ws = {clients: [], sid: {}};
function RefreshClientsView() {
    var td = connected_td;
    var c = ws.clients;
    var ih = "";
    for(var i=0 ; i<c.length ; ++i) {
	ih += '<div><strong>'+ (i+1) +'</strong>	' + c[i].name + '</div>';
    }
    if(ih == '') {
	ih = '<div>It looks like you\'re the only one connected. looser</div>';
    }
    td.innerHTML = ih;
}


var socket = new io.Socket('localhost', {
    port: 8000
});
socket.on('connect', function() {
    Log('successfully connected to ws server');
    socket.send(name);
});
socket.on('message', function(message) {
    var o;
    try {
    o = JSON.parse(message);
    } catch(e) {
	Log("Couldn't decode message from server: " + e);
    }
    console.log(o);
    switch(o.event) {
	case 'newClient':
	    NewClient(o);
	    break;
	case 'message':
	    Message(o);
	    break;
	case 'endClient':
	    EndClient(o);
	    break;
	case 'error': 
	    ReportError(o);
	    break;
	default:
	    Log("unknown event: " + o.event);
	    break;
    }
});
socket.on('disconnect', function() {
    Log('disconnected from ws server');
});


var received_td = document.getElementById('received');
var connected_td = document.getElementById('connected');
var fetching_connected = true;
function Log(message) {
    var td = received_td;
    var div = document.createElement('div');
    div.innerHTML = message;
    td.insertBefore(div, td.firstChild);
}

function ReportError(o) {
    Log("error: " + o.message);
}
function Message(o) {
    Log(o.name + (o.broadcast ? "[bc]" : "") + ": " + o.message);
}
function NewClient(o) {
    var client = {
	name: o.name,
	sessionId: o.sessionId
    };
    ws.clients.push(client);    
    ws.sid[client.sessionId] = client;
    Log("new client: "+client.name);
    RefreshClientsView();
}
function EndClient(o) {
    var client = ws.sid[o.sessionId];
    var name = client.name;
    var i;
    for(i=0; i<ws.clients.length ; ++i) {
	if(ws.clients[i] === client) break;
    }
    ws.clients.splice(i, 1);
    delete ws.sid[o.sessionId];
    Log("lost client: "+name);
    RefreshClientsView();
}

received_td.innerHTML = "<div>Welcome</div>";

var name = prompt('What is your nickname?');
socket.connect();



var field = document.getElementById('message');
var myform = field.parentNode;
myform.onsubmit = function() {
    try {
    var ev = {};
    var regex = /(\d+) (.*)/;
    var text = field.value;
    var m = regex.exec(text)
    if(!m) {
	ev.message = text;
	socket.send(JSON.stringify(ev));
    }
    else {
	ev.message = m[2];
	try {
	    var indice = parseInt(m[1]) -1;
	    console.log(indice);
	    var dest = ws.clients[indice];
	    console.log(dest);
	    ev.dest = dest.sessionId;
	} catch(e) {
	    Log('could not find who you want to write to');
	    console.log(e);
	    return false;
	}
	socket.send(JSON.stringify(ev));
    }
    field.value = '';
    } catch (e) {
	console.log(e);
    }
    return false;
}
RefreshClientsView();
field.focus();
})();

