/*INITIALIZATION*/

	var express = require('express');
	var app = express();
	var serv = require('http').createServer(app);
	serv.listen(3000, "0.0.0.0");
	console.log('server started');
	var SOCKET_LIST = {};
	var io = require('socket.io')(serv, {});
	
	app.get('/', function(req, res) {
		res.sendFile(__dirname + '/client/Planetarium_Rules.html');
	});
	app.get('/index', function(req, res) {
		res.sendFile(__dirname + '/client/index.html');
	});
	app.get('/main', function(req, res) {
		res.sendFile(__dirname + '/client/main_host.html');
	});
	app.get('/worldend', function(req, res) {
		res.sendFile(__dirname + '/client/worldend.html');
	});
	app.get('/win', function(req, res) {
		res.sendFile(__dirname + '/client/win.html');
	});
	app.get('/winningteam', function(req, res) {
		res.sendFile(__dirname + '/client/winningteam.html');
	});
	app.get('/lose', function(req, res) {
		res.sendFile(__dirname + '/client/lose.html');
	});
	app.get('/congratulations', function(req, res) {
		res.sendFile(__dirname + '/client/congratulations.html');
	});
	app.use('/client', express.static(__dirname + '/client'));

	var playerNumber = 1;
	var totalPlayers;
	var numberOfPlayersInGroups;
	var numberOfGroups;
	var numberOfTeams;
	var numberOfPlayersInTeams;
	var world;
	var roundNumber = 1;
	var quarter = 0;
	var ROUNDS = 12;
	var playerScores = {};
	var groupScores = {};
	var teamScores = {};
	var teamNameNumbers = {};
	var teamNumberNames;
	var currentTeamNumber = 1;
	var teamGroupPlayer = {};
	var usernames = {};

	var winningTeams = [];
	var winningNames = [];

	//decide whether a round is over based on the timer or once all players have made a decision
	//either timer or waitForPlayers
	var MODES = {1: "timer",
				 2: "waitForPlayers"};
	var decisionMode;
	
	//variables for timer
	var TIME_LIMIT_MINUTES;
	var TIME_LIMIT_SECONDS;
	var timerMinutes;
	var timerSeconds;

	//variables for waitForPlayers
	var decidedPlayers = 0;


/*LISTENERS*/

	io.sockets.on('connection', function(socket) {

		socket.id = playerNumber;
		SOCKET_LIST[socket.id] = socket;
		console.log('connection made');
		console.log("Socket: " + socket.id);
		playerNumber++;
		socket.emit('indexConnect', {
			numberOfTeams: numberOfTeams, 
			numberOfGroups: numberOfGroups
		});

		socket.on('start', function(data) {
			decisionMode = MODES[data.mode];
			world = data.numberOfTeams * 10;
			totalPlayers = data.numberOfPlayers;
			numberOfGroups = data.numberOfGroups;
			numberOfTeams = data.numberOfTeams;
			numberOfPlayersInGroups = data.numberOfPlayersInGroups;
			for (var i = 1; i <= numberOfTeams; i++) {
				teamGroupPlayer[i] = [];
			};
			for (var i = 1; i <= numberOfTeams; i++) {
				for (var j = 0; j < numberOfGroups; j++) {
					teamGroupPlayer[i].push([]);
				};
			};
			if (decisionMode == "timer") {
				TIME_LIMIT_MINUTES = data.minutes;
				TIME_LIMIT_SECONDS = data.seconds;
				timerMinutes = TIME_LIMIT_MINUTES;
				timerSeconds = TIME_LIMIT_SECONDS;
				socket.emit('startTimer', {
					timer: timeLimitToString(timerMinutes, timerSeconds)
				});
			};
		});
		
		socket.on('decision1', function(data) {
			world += -1;
			groupScores[socket.groupNumber] += -2;
			teamScores[socket.teamNumber] += -2;
			playerScores[socket.playerNumber] += 2;
			checkPlayers(decisionMode);
		});

		socket.on('decision2', function(data) {
			world += 0;
			groupScores[socket.groupNumber] += 2;
			teamScores[socket.teamNumber] += 2;
			playerScores[socket.playerNumber] += -1;
			checkPlayers(decisionMode);
		});
		
		socket.on('decision3', function(data) {
			world += -1;
			groupScores[socket.groupNumber] += 1;
			teamScores[socket.teamNumber] += 1;
			playerScores[socket.playerNumber] += 1;
			checkPlayers(decisionMode);
		});

		socket.on('decision4', function(data) {
			world += 2;
			groupScores[socket.groupNumber] += 0;
			teamScores[socket.teamNumber] += 0;
			playerScores[socket.playerNumber] += -1;
			checkPlayers(decisionMode);
		});

		socket.on('playerConnect', function(data) {
			socket.playerNumber = socket.id;
			usernames[socket.playerNumber] = data.username;
			if (!(socket.playerNumber in playerScores)){
				playerScores[socket.playerNumber] = 20;
			};
			if (!(socket.teamNumber in teamScores)){
				teamScores[socket.teamNumber] = 20 * numberOfGroups;
			};
			socket.emit('team', {
				team: teamScores[socket.teamNumber] 
			});

			socket.emit('world', {
				world: world
			});
			if (decisionMode == "timer") {
				socket.emit('timer', {
					timer: timeLimitToString(timerMinutes, timerSeconds)
				});
			};

			//associate team names and numbers
			if (!(data.teamName in teamNameNumbers)) {
				teamNameNumbers[data.teamName] = currentTeamNumber;
				for (var i in SOCKET_LIST) {
					var emitSocket = SOCKET_LIST[i];
					emitSocket.emit('newTeam', {
						teamName: data.teamName,
						currentTeamNumber: currentTeamNumber
					});
				};
				currentTeamNumber++;
			};
			socket.teamNumber = teamNameNumbers[data.teamName];
			socket.groupNumber = [socket.teamNumber, data.groupNumberInput];
			teamGroupPlayer[socket.teamNumber][data.groupNumberInput - 1].push(socket.playerNumber);
			var playerNumberInGroup = teamGroupPlayer[socket.teamNumber][data.groupNumberInput - 1].indexOf(socket.playerNumber) + 1;
			socket.emit('player', {
				number: playerNumberInGroup
			});
			if (!(socket.teamNumber in teamScores)){
				teamScores[socket.teamNumber] = 20 * numberOfGroups;
			};
			if (!(socket.groupNumber in groupScores)){
				groupScores[socket.groupNumber] = 20;
			};
			socket.emit('getTeamNumber', {
				teamNameNumbers: teamNameNumbers,
				groupNumber: socket.groupNumber
			});
			socket.emit('team', {
				team: teamScores[socket.teamNumber]
			});

		});
		
		socket.on('infoRequest', function() {
			socket.emit('player', {});
			socket.emit('team', {
				team: teamScores[socket.teamNumber] 
			});
			socket.emit('world', {
				world: world
			});
			if (decisionMode == 'timer') {
				socket.emit('timer', {
					timer: timeLimitToString(timerMinutes, timerSeconds)
				});
			};
		});

		socket.on('beginGame', function() {
			setInterval(function() {
				if (timerMinutes == 0 && timerSeconds == 0) {
					timerMinutes = TIME_LIMIT_MINUTES;
					timerSeconds = TIME_LIMIT_SECONDS;
					updateRound(SOCKET_LIST);
				};
				for(var i in SOCKET_LIST) {
					var socket = SOCKET_LIST[i];
					socket.emit('timer', {
						timer: timeLimitToString(timerMinutes, timerSeconds)
					});
				};
				if (timerSeconds == 0) {
					timerSeconds = 59
					timerMinutes--;
				} else {
					timerSeconds--;
				};
			}, 1000);
		});

		socket.on('getTeamNames', function(data) {
			teamNumberNames = data.teamNumberNames;
		});

		socket.on('congratulations', function() {
			socket.emit('mainWinners', {
				teamNumberNames: teamNumberNames,
				winningTeams: winningTeams,
				winningNames: winningNames
			});
		});
	});


/*FUNCTIONS*/


	var checkPlayers = function(mode) {
		decidedPlayers++;
		if (mode == "waitForPlayers") {
			if (decidedPlayers == totalPlayers) {
				decidedPlayers = 0;
				updateRound(SOCKET_LIST);
			};
		};
	};

	var updateRound = function(sockets) {
		endGame(sockets);
		quarterlyReport(sockets);
		roundNumber++;
		for(var i in sockets) {
			var socket = sockets[i];
			socket.emit('decisionUpdate', {
				playerScore: playerScores[socket.playerNumber],
				groupScore: groupScores[socket.groupNumber],
				teamScore: teamScores[socket.teamNumber],
				world: world
			});
			socket.emit('enable', {});
			socket.emit('nextRound', {
				roundNumber: roundNumber
			});
		};
	};

	var quarterlyReport = function(sockets) {
		if (roundNumber % 3 == 0) {
			quarter++;
			for (var i in sockets) {
				var socket = sockets[i];
				quarterTeamScores = teamScores;
				socket.emit('quarter', {
					teamScores: teamScores,
					groupScores: groupScores
				});
				socket.emit('newQuarter', {
					quarter: quarter
				});
			};
		};
	};

	var endGame = function(sockets) {
		if (world <= 0) {
			for (var i in sockets) {
				var emitSocket = sockets[i];
				emitSocket.emit('worldEnd', {});
			};
		} else if (roundNumber == ROUNDS) {
			//find the winning teams
			//will only be more than one if there is a tie
			var winningTeamScore = Number.NEGATIVE_INFINITY;
			for (var team in teamGroupPlayer) {
				winningTeamScore = Math.max(winningTeamScore, teamScores[team]);
			};
			for (var team in teamGroupPlayer) {
				if (teamScores[team] == winningTeamScore) {
					winningTeams.push(team);
				};
			};
			//find the players with the highest score in each group
			var overallWinners = [];
			var teamWinners = [];
			for (var i = 0; i < winningTeams.length; i++) {
				var team = teamGroupPlayer[winningTeams[i]];
				for (var j = 0; j < team.length; j++) {
					var group = team[j];
					winningPlayerScore = Number.NEGATIVE_INFINITY;
					for (var k = 0; k < group.length; k++) {
						var player = group[k];
						teamWinners.push(player);
						winningPlayerScore = Math.max(winningPlayerScore, playerScores[player]);
					};
					for (var k = 0; k < group.length; k++) {
						var player = group[k];
						if (playerScores[player] == winningPlayerScore) {
							overallWinners.push(player);
						};
					};
				};
			};
			for (var i = 0; i < overallWinners.length; i++) {
				winningNames.push(usernames[overallWinners[i]]);
			};
			console.log("winning teams: " + winningTeams);
			console.log("overall winners: " + overallWinners);
			console.log("team winners: " + teamWinners);
			for (var i in sockets) {
				var emitSocket = sockets[i];
				if (overallWinners.indexOf(emitSocket.id) >= 0) {
					emitSocket.emit('win', {});
				} else if (teamWinners.indexOf(emitSocket.id) >= 0) {
					emitSocket.emit('teamWin', {});
				} else {
					emitSocket.emit('lose', {});
					emitSocket.emit('mainWinners', {});
				};
			};
		};
	};

	function timeLimitToString(minutes, seconds) {
		if (seconds < 10) {
			return minutes.toString() + ":0" + seconds.toString();
		} else {
			return minutes.toString() + ":" + seconds.toString();
		};
	};