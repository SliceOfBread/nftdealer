import express from 'express';
var app = express();

import { createServer } from "http";
import * as path from 'path';
// import * as fs from 'fs';

import { Server } from "socket.io";

const server = createServer(app);
const io = new Server(server);

import pkg from 'pg';
const { Pool } = pkg;

import {
	CLICKITEM,
	DEBUG,
	PLAYERCOLOR,
	GAMESTATE
	} from './public/js/egalconstants.mjs' ;
	
import {
	GameServer} from './js/gameserver.mjs';

const port = process.env.PORT || 3000;

class GameList {
	async findGame(id) {}
	async createGame(id, info) {}
	async saveGame(id, info) {}
	async findAllGames() {}
}

class PostgreS extends GameList {
	// much of the PostgreSQL code is loosely based off of code from github terraforming-mars/src/database/PostgreSQL.ts

	constructor() {
		super();
		this.pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: {
			  rejectUnauthorized: false
			}
		});

		var thisPool = this.pool;
		
		this.pool.connect().then(function () {
			console.log('PostgreSQL connected');
			thisPool.query('CREATE TABLE IF NOT EXISTS \
				games(game_id varchar, \
				player_ids text, \
				game_init text, \
				game_state text, \
				game_complete boolean default false, \
				last_used timestamp default now(), \
				PRIMARY KEY (game_id))').then(function () {
					console.log('games table created');
				}).catch(function(err) {
					console.error('table creation error', err.stack);
				});
		}).catch(function(err)  {
			console.error('connection error', err.stack);
		});

	}

	async findGame(id) {
		const result = await this.pool.query('SELECT * FROM games WHERE game_id=$1', [id]);
			if (result.rows.length == 1) {
				// parse stuff before return
				let ret = {
					gameId:result.rows[0].game_id,
					ids:JSON.parse(result.rows[0].player_ids),
					init:JSON.parse(result.rows[0].game_init),
					lastUsed:result.rows[0].last_used,
					complete:result.rows[0].game_complete,
					state:JSON.parse(result.rows[0].game_state),
				};

				return ret;
			} else if (result.length > 1) {
				console.error(`multiple ids in database! : ${id}`);
			} else {
				console.error(`game id not in database:${id}`);
			}
		
	}
  
	async saveGame(id, info) {
		let tmp = 'UPDATE games SET player_ids = $2, game_init = $3, game_state = $4, game_complete = $5, last_used = NOW() WHERE game_id=$1';
		await this.pool.query(tmp, [id, JSON.stringify(info.ids),JSON.stringify(info.init),JSON.stringify(info.state),(info.state.state == GAMESTATE.FINALSCORE)]);
	  
		// this.games.set(id, JSON.stringify(info));
	}

	async createGame(id, info) {
		let tmp = 'INSERT INTO games (game_id, player_ids, game_init, game_state) VALUES($1, $2, $3, $4) RETURNING (xmax = 0) AS inserted';
		this.pool.query(tmp, [id,JSON.stringify(info.ids),JSON.stringify(info.init),JSON.stringify(info.state)])
		.then(function(result) {
			try {
				if (!result.rows[0].inserted) {
					console.error('ERROR:Game not inserted into database');
				}
			} catch (error) {
				console.error(error);
			}
		}).catch((err) => {
			console.error('ERROR:Trying to insert into database');
		});
	}
  
	async findAllGames() { // TODO
	  return [...this.games.values()];
	}

}
  
class InMemoryGameList extends GameList {
	constructor() {
	  super();
	  this.games = new Map();
	}
  
	async findGame(id) {
		try {
			return JSON.parse(this.games.get(id));
		} catch (error) {
			console.log("findGame failed getting " + id)
			return ;
		}
	  
	}
  
	async saveGame(id, info) {
		this.games.set(id, JSON.stringify(info));
	}
	  
	async createGame(id, info) {
	  	this.games.set(id, JSON.stringify(info));
	}
  
	async findAllGames() {
	  return [...this.games.values()];
	}
}

// TODO redo following to use Postgres if available or InMemory if not
// also TODO, rewrite gamesData access to use callback/promise/await
// const gamesData = new InMemoryGameList();
const gamesData = new PostgreS();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.resolve('./public/index.html'));
});

// app.get('/game.html', (req, res) => {
//     res.sendFile(path.resolve('./public/game.html'));
// });


app.get('/player', (req, res) => {
	if (req.query.gid) {
		res.sendFile(path.resolve('./public/player.html'));
	} else {
		// send page that redirects to show all games?
		// TODO
	}	
 });
 
//  app.get('/game', (req, res) => {
// 	if (req.query.gid) {
// 		res.sendFile(path.resolve('./game.html'));
// 	} else {
// 		// send page that shows all games?
// 		// TODO
// 	}	
//  });
 
// app.get('/style.css', (req, res) => {
// 	res.sendFile(path.resolve('./public/style.css'));
//  });
 
var game = new GameServer();
// var player2game = {};
 
io.on('connection', (socket) => {
	// *************************************
	// NOTE: for now, only one game supported. Eventually, games should be
	// stored/restored to/from a database
	// *************************************

	// see https://socket.io/get-started/private-messaging-part-2/
	//  but we want to use playerID to associate with connection

	socket.on('update request', (msg) => {
		console.log('update request rcvd, sending game update');
		if (msg && msg.gameId) {
			// check if playerId is stored
			// let thisGameId = player2game[msg.playerId];
			let thisGameId = msg.gameId;
			// fetch game from storage
			gamesData.findGame(thisGameId).then(function(thisGame) {
				if (thisGame && thisGame.ids) {
					// deserialize to game
					game.deserialize(thisGame.state);
					if (!msg.playerId) {
						// spectator TODO
						socket.emit('game update', game.serialize());
						return;
					}
					socket.emit('game update', game.serialize(msg.playerId));

					let gamePl = thisGame.ids.find((conn) => conn.playerId == msg.playerId);
					if (!gamePl) {
						// if game player not stored yet, add to thisgame and store
						thisGame.ids.push({socketId:socket.id, playerId:msg.playerId});
						gamesData.saveGame(thisGameId, thisGame);
					} else if (gamePl.socketId != socket.id) {
						// if game player stored but socketId mismatch (browser refresh, etc)
						// update socketId
						gamePl.socketId = socket.id;
						gamesData.saveGame(thisGameId, thisGame);
					} // else we already have correct socketId
				} else {
					console.log("Didn't find game:" + thisGameId);
				}	
			});

		} 
	});

	// function saveToFile(msg) {
	// 	if (msg && msg.gameId) {
	// 		const dir = './games/';
	// 		let files = fs.readdirSync(dir);
	// 		let fn = 'game' + msg.gameId + '.txt';
	// 		// if (!files.includes(fn)) {
	// 			// fetch game from storage
	// 			let thisGame = gamesData.findGame(msg.gameId);
	// 			if (!thisGame || !thisGame.ids) {
	// 				console.log(`Did not find game in storage:${msg.gameId}:`);
	// 				return;
	// 			}

	// 			try {
	// 				fs.writeFileSync(dir + fn, JSON.stringify(thisGame));
	// 			} catch (error) {
	// 				let tmp = 0;

	// 			}
				
	// 		// }
			
	// 	}
	// }

	// socket.on('save game', (msg) => saveToFile(msg));

	// function loadGame(msg) {
	// 	if (msg && msg.gameId) {
	// 		const dir = './games/';
	// 		let files = fs.readdirSync(dir);
	// 		let fn = 'game' + msg.gameId + '.txt';
	// 		if (files.includes(fn)) {
	// 			try {
	// 				let fileData = fs.readFileSync(dir + fn);
	// 				let thisGame = JSON.parse(fileData);
	// 				gamesData.saveGame(msg.gameId, thisGame);
	// 			} catch (error) {
	// 				let tmp = 0;
	// 			}
								
	// 		}
			
	// 	}
	// }

	// socket.on('load game', (msg) => loadGame(msg));

	socket.on('create game', (msg) => {
		console.log('create game rcvd, sending game setup');

		let gameId = "g" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);

		// TODO is newGame needed?
		let newGame = new GameServer();
		// setup is array of playerId (p######), name, color
		let setup = playerSetup(msg.players, msg.options);
		let initSeed = Math.floor(Math.random() * 0xffffffff);
		newGame.init(setup, msg.options, initSeed);
		// Ideally, would not send game page until we know game was created correctly
		socket.emit('game page', {gameId:gameId});
		// createGame is async but returns nothing
		gamesData.createGame(gameId, {
			ids:[],
			init: {
				players:setup,
				options:msg.options, 
				seed: initSeed,
			},
			lastUsed:Date.now(),
			complete:false,
			state:newGame.serialize("server")
		});
		
	});

	socket.on('getgame request', (msg) => {
		// this requests the ids for all the players which are used to create the game links
		if (msg && msg.gameId) {
			gamesData.findGame(msg.gameId).then(function(thisGame) {
				socket.emit('game setup', {players:thisGame.init.players, gameId:msg.gameId});
			}); 

			// if (!thisGame) {
			// 	// load game from file first
			// 	loadGame(msg);
			// 	thisGame = gamesData.findGame(msg.gameId);
			// };

			// TODO block this page after all players have 'checked in'
			// socket.emit('game setup', {players:thisGame.init.players, gameId:msg.gameId});
		}
	});

	socket.on('player move', (msg) => {
		if (msg && msg.gameId) {
			if (!msg.playerId) {
				console.log("No playerId in move msg");
				return;
			}

		} else {
			console.log("No gameId in move msg");
			return;
		}
		// fetch game from storage
		// let thisGame = await gamesData.findGame(msg.gameId);
		gamesData.findGame(msg.gameId).then(function(thisGame) {
			if (!thisGame || !thisGame.ids) {
				console.log(`Did not find game in storage:${msg.gameId}:`);
				return;
			}
			// deserialize game
			game.deserialize(thisGame.state);
			let errorFlag = false;

			// when move received
			// - check if move allowed
			// - implement move
			// - send updated state individually to all players/spectators
			if (msg.playerId != game.players[game.activePlayer].playerId) {
				// msg with incorrect playerId
				errorFlag = true;
				console.log('Rcvd move from unexpected player, ignoring');
				console.log(`Rcvd pid:${msg.playerId}, expected pid:${game.players[game.activePlayer].playerId}`);
			} else if (!game.getActiveSpaces().clickables.includes(msg.move.location)) {
				// what was clicked was not allowed to be clicked
				errorFlag = true;
				console.log("Clicked item not in allowed moves");
			} else {
				// allowed move from correct player
				// add move to move list // moved to processClick

				// process move
				if (msg.move.location == CLICKITEM.REDOBUTTON) {
					// while (game.moves.length && game.moves[game.moves.length-1].location) {
					if (game.moves.length && (game.moves[game.moves.length-1].location || DEBUG)) {
						// UNDO - remove moves that can be undone
						if (!game.moves[game.moves.length-1].location) {
							// during DEBUG, if we undo an un-undoable, we need to undo an extra
							game.moves.pop();
						}
						game.moves.pop();
					}
					// save moves and re-init game by creating new game
					let newGame = new GameServer();
					newGame.init(thisGame.init.players, thisGame.init.options, thisGame.init.seed);
					// reprocess saved moves
					newGame.processMoves(game.moves);
					// replace game with newGame
					game = newGame;
					// game update sent below
				} else {
					try {
						// don't let server crash for a problem
						game.processClick(msg.move);
					} catch (error) {
						console.log(error.message);
						errorFlag = true;
					}
					// game update sent below
				}
				// save game
				if (!errorFlag) {
					// saveToFile({gameId:msg.gameId});
					gamesData.saveGame(msg.gameId, {
						ids:thisGame.ids,
						init:thisGame.init,
						lastUsed:Date.now(),
						complete: game.gameComplete(),
						state:game.serialize("server")
					});	
				}
			}

			// send game update
			for (let entry of thisGame.ids) {
				// for each id, send serialized game state
				if (errorFlag) {
					io.to(entry.socketId).emit('server error');
				} else {
					if (entry.playerId) {
						io.to(entry.socketId).emit('game update', game.serialize(entry.playerId));
					} else {
						io.to(entry.socketId).emit('game update', game.serialize());
					}
				}
			}			
		});

		
	});


	function playerSetup(inPlayers, options) {
		let players = [];
		// for (let np=0; np < inPlayers.length; np++) {
		// 		players.splice(randomInt(0,players.length),0,{
		// 			id:"p" + randomInt(0, Number.MAX_SAFE_INTEGER).toString(16), 
		// 			name:inPlayers[np].name, 
		// 			color:inPlayers[np].color
		// 		});
		// }
		for (let np=0; np < inPlayers.length; np++) {
			{
				players.push({
					id:"p" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16), 
					name:inPlayers[np].name, 
					color:inPlayers[np].color
				});

			}
		}
		// NORMALLY above players/options  would be passed in


		// decide player colors, if not already set
		let playerOrder = [];
		let tmpColors = Object.values(PLAYERCOLOR);
		for (let p of players) {
			if (tmpColors.includes(p.color)) {
				// remove colors pre-picked
				tmpColors.splice(tmpColors.indexOf(p.color),1);
			}
		}
		for (let p of players) {
			if (p.color === "random") {
				// assign color for players without
				// p.color = removeRandomItem(tmpColors);
				p.color = tmpColors.splice(Math.floor(Math.random() * tmpColors.length), 1)[0];
			}
		}

		let startNum = Math.floor(Math.random() * players.length);
		if (options.startPlayer !== undefined && !isNaN(options.startPlayer)) {
			startNum = Number(options.startPlayer);
		}

		// NOTE: FOR NOW, color determines play order
		// start with array of colors twice: yellow,purple,orange,blue,yellow,purple,orange,blue
		tmpColors = Object.values(PLAYERCOLOR).concat(Object.values(PLAYERCOLOR));
		// remove from start of array until it is same as startPlayer color
		while (players[startNum].color != tmpColors[0]) {
			tmpColors.shift();
		}
		// keep only the first 4. In a 4P game, this is the order
		while (tmpColors.length > 4) {
			tmpColors.pop();
		}

		// loop through colors in order, if a player is that color add them to order
		while (tmpColors.length) {
			let c = tmpColors.shift();
			for (let i=0; i < players.length; i++) {
				if (players[i].color == c) {
					playerOrder.push(players[i]);
					continue;
				}
			}
		}

		return playerOrder;
	}

});

server.listen(port, () => {
   console.log(`Socket.IO server running at http://localhost:${port}/`);
});


