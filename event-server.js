#!/usr/bin/env node

var connect = require('connect');
var io	 = require('socket.io');
var sys = require('sys');
// create an http server using the connect middleware
var server = connect.createServer(
    connect.staticProvider(__dirname + '/public')
);

// since socket.io's way of storing informations
// about the clients, we'll keep or own informations
var myclients = {};

// we set up the socket.io interface to intercept
// WebSocket requests on the http server (connect)
var wsserver = io.listen(server);
wsserver.on('connection', function(client) {
    client.expectName = true;
    client.on('message', function(message) {
	// if this is the name we get
	if(this.expectName) {
	    this.name = message;
	    delete this.expectName;
	    var ev = {
		event: 'newClient',
		name: this.name,
		sessionId: this.sessionId
	    }
	    this.broadcast(JSON.stringify(ev));
	    myclients[this.sessionId] = this;
	}
	// we got an actual message or event
	else {
	    var o;
	    try {
		o = JSON.parse(message);
	    } catch(e) {
		console.log(e);
	    }
	    var ev = {
		event: 'message',
		message: o.message,
		name: this.name,
		sessionId: this.sessionId
	    };
	    if(!o.dest) {
		ev.broadcast = true;
		this.broadcast(JSON.stringify(ev));
	    }
	    else {
		var i;
		var c = myclients[o.dest];
		try {
		    c.send(JSON.stringify(ev));
		} catch(e) {
		    this.send(JSON.stringify({
			event: 'error',
			message: "could not send '"+o.message+"'"
		    }));
		}
	    }
	}
	console.log("received message from "+ this.name + ": "+ message);
    });
    client.on('disconnect', function() {
	console.log('client disconnected');
	var ev = {
	    event: 'endClient',
	    sessionId: this.sessionId
	};
	wsserver.broadcast(JSON.stringify(ev));
	delete myclients[this.sessionId];
    });

    for(var k in myclients) {
	try {
	    if(k == client.sessionId) continue;
	    var ev = {
		event: 'newClient',
		sessionId: k,
		name: myclients[k].name
	    };
	    client.send(JSON.stringify(ev));
	} catch (e) {
	    console.log(e);
	}
    }

});


server.listen(8000);

