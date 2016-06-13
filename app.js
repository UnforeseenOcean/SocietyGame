var express = require('express');
var app = express();
var serv = require('http').createServer(app);
var playerNumber = 1;
var world = 20;
var TIME_LIMIT = 10;
var timer = TIME_LIMIT;

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(3000, "0.0.0.0");
console.log('server started');
var SOCKET_LIST = {};

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
	socket.id = playerNumber;
	socket.timer = timer;
	SOCKET_LIST[socket.id] = socket;
	console.log('connection made');
	socket.emit('player', {
		number: socket.id
	});
	playerNumber++;
	socket.on('decision4', function() {
		world += 2;
	});
});

setInterval(function() {
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.world = world;
		socket.emit('world', {
			world: socket.world
		});
	}
}, 1000 * TIME_LIMIT);

//increment the timer
setInterval(function() {
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.timer = timer;
		socket.emit('timer', {
			timer: socket.timer
		});
	}
	timer--;
}, 1000);

//timer resets every TIMER_LIMIT seconds
//show the updated data
setInterval(function() {
	timer = TIME_LIMIT;
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.world = world;
		socket.emit('world', {
			world: socket.world
		});
	}
}, 1000 * TIME_LIMIT);