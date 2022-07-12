import {
	ARTLOC,
	ASSTLOC,
	BONUSTYPE,
	CONTRACTLOC,
	GAMESTATE,
	PLAYERLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORLOC} from './egalconstants.mjs';


// FILE art
// Note: Art in client is limited to owned and top of piles
class Art {
	constructor(type, num) {
		this.type = type;
		this.num = num;
		// 	0; 0+ fame, pink tix
		// 	1; 0+ fame, brown tix
		// 	2; 0+ fame, any tix
		// 	3; 0+ fame, any tix
		// 	4; 1+ fame, pink + brown/white tix
		// 	5; 1+ fame, brown + pink/white tix
		// 	6; 1+ fame, any 2 tix
		// 	7; 2+ fame, any 2 tix
		this.tixBonus = [];	// buy art tix bonus
		this.numTixBonus = 1;
		this.fameBonus = {fixed:0, perWhite:1};
		switch (num) {
			case 0:
				this.tixBonus.push(BONUSTYPE.PINKTIX);
				break;
			case 1:
				this.tixBonus.push(BONUSTYPE.BROWNTIX);
				break;
			case 2:
			case 3:
				this.tixBonus.push(BONUSTYPE.ONETIX);				
				break;
			case 4:
				this.tixBonus.push(BONUSTYPE.PINKTIX);
				this.tixBonus.push(BONUSTYPE.BROWNWHITE);
				this.numTixBonus = 2;
				this.fameBonus.fixed = 1;
				break;
			case 5:
				this.tixBonus.push(BONUSTYPE.BROWNTIX);
				this.tixBonus.push(BONUSTYPE.PINKWHITE);
				this.numTixBonus = 2;
				this.fameBonus.fixed = 1;
				break;
			case 6:
			case 7:
				this.tixBonus.push(BONUSTYPE.TWOTIX);
				this.numTixBonus = 2;
				this.fameBonus.fixed = num - 5;	// 1 for 6, 2 for 7
				break;
		
			default:
				break;
		}
		this.byArtist = null;
		this.location = {};
		this.location.type = ARTLOC.PILE;
		this.dom = null;
	}

	serialize() {
		let obj = {};
		for (let ak of Object.keys(this)) {
			switch (ak) {
				case "type":
				case "num":
				case "byArtist":
				case "location":
					obj[ak] = this[ak];
					break;
			
				default:
					break;
			}
		}
		return obj;
	}
	deserialize(obj) {
		for (let ak of Object.keys(obj)) {
			switch (ak) {
				case "type":
				case "num":
				case "byArtist":
				case "location":
					this[ak] = obj[ak];
					break;
			
				default:
					break;
			}
		}
		return;
	}	
}



// 
class Assistant {
	constructor(num) {
		this.location = null;
		this.num = num;
	}
	init(player, location) {
		this.location = location;
	}
	serialize() {
		let obj = {};
		for (let pk of Object.keys(this)) {
			switch (pk) {
				case "location":
					obj[pk] = this[pk];
					break;

				default:
					break;
			}
		}
		return obj;
	}
	deserialize(obj) {
		for (let pk of Object.keys(obj)) {
			switch (pk) {
				case "location":
						this[pk] = obj[pk];
					break;

				default:
					break;
			}
		}
		return;
	}
	moveAsstTo(location) {
		this.location = Object.assign({}, location);
	}
}


// FILE Artist
class Artist {
	constructor() {
		this.type = null;
		this.color = null;
		this.initFame = 1;
		this.num = 1;
		this.thumb = 1;
		this.fame = 1;
		this.discovered = false;
		this.sigTokens = [{},{}]; 
		this.bonus = null;
	}

	discover() {
		this.discovered = true;
	}
	getValue(rLevel = this.fame) {
		switch (rLevel) {
			case 1: return 0;
			case 2: 
			case 3: 
			case 4: return 5;
			case 5: if (this.initFame >= 4) return 5;
			case 6:
			case 7: return 8;
			case 8: if (this.initFame >= 4) return 8;
			case 9:
			case 10: return 11;
			case 11: if (this.initFame >= 4) return 11;
			case 12:
			case 13:
			case 14: return 14;
			case 15:
			case 16:
			case 17:
			case 18: return 17;
			case 19: return 20;
			default:
				// error
				break;
		}
	}
	deserialize(obj) {
		for (let ak of Object.keys(obj)) {
			switch (ak) {
				case "type":
				case "color":
				case "num":
				case "bonus":
				case "thumb":
				case "initFame":
				case "fame":
				case "discovered":
				case "sigTokens":
					this[ak] = obj[ak];
					break;
			
				default:
					break;
			}
		}
		return;
	}
}

// FILE board
class Board {
	constructor() {
	}
}

// FILE contracts
class Contract {
	constructor(artType, bonusType, num) {
		// CHANGE TODO
		// dom should have no info unless cards are face up
		this.artType = artType;
		this.bonusType = bonusType;
		this.num = num;
		this.location = {type:CONTRACTLOC.DECK};
		// NOTE: for location.type = DEALT, num=column and pos=position in stack (0 = top)
		this.faceUp = false;	// show back or front?
		this.moneyUp = false;	// if showing back, is money on top or infl?
	}
	moveContractTo(location) {
		switch (location.type) {
			case CONTRACTLOC.DISCARD:
			case CONTRACTLOC.DECK:
				this.faceUp = false;
				break;
			case CONTRACTLOC.DEALT:
			case CONTRACTLOC.PLAYER:
				this.faceUp = true;
				break;
		
			default:
				break;
		}
		this.location = location;
	}

	serialize() {
		let obj = {};
		for (let ak of Object.keys(this)) {
			switch (ak) {
				case "artType":
				case "bonusType":
				case "num":
					if (this.location.type == CONTRACTLOC.DECK || this.location.type == CONTRACTLOC.DISCARD) break;
				case "location":
				case "faceUp":
				case "moneyUp":
					obj[ak] = this[ak];
					break;
			
				default:
					break;
			}
		}
		return obj;		
	}
	deserialize(obj) {
		for (let ak of Object.keys(obj)) {
			switch (ak) {
				case "artType":
				case "bonusType":
				case "num":
				case "location":
				case "faceUp":
				case "moneyUp":
					this[ak] = obj[ak];
					break;
			
				default:
					break;
			}
		}
		return;		
	}
}

// FILE player
class Player {
	constructor() {
		this.color = null;
		this.name = null;
		this.iAmClient = false;
		this.board = null;


		this.curator = null;
		this.dealer = null;
		this.money = 10;
		this.influence = 10;
		this.location = {type:PLAYERLOC.HOME};

		this.assistants = [];

	}
	deserialize(obj) {
		for (let pk of Object.keys(obj)) {
			switch (pk) {
				case "num":
				case "color":
				case "name":
				case "money":
				case "influence":
				case "location":
				case "curator":
				case "dealer":
				case "playerId":
						this[pk] = obj[pk];
					break;

				case "assistants":
					// deserialize each asst
					for (let i=0; i < this[pk].length; i++) {
						this[pk][i].deserialize(obj[pk][i]);
					}
					break;
				default:
					break;
			}
		}
		return;

	}
	init(info, plNum) {
		this.num = plNum;
		this.color = info.color;
		this.name = info.name;
		this.iAmClient = false;

		this.board.init(this);
		this.curator = null;
		this.dealer = null;
		this.money = 10;
		this.influence = 10;
		this.location = {type:PLAYERLOC.HOME};

		for (let i=0; i < 10; i++) {
			if (i<2) {
				// move 2 assistants to desks
				this.assistants[i].init(this, {type:ASSTLOC.DESK, num:i});
			} else {
				this.assistants[i].init(this, {type:ASSTLOC.UNEMPLOYED});
			}
		}
		
	}
}

// FILE playerboard
class PlayerBoard {
	constructor() {
		this.color = null;
	}
	init(player) {
		this.color = player.color;
	}
}

// FILE reptile
class RepTile {
	constructor() {
		this.tNum = null;
		this.location = null;
	}
	init(tNum) {
		this.tNum = tNum;
	}
	moveRepTileTo(location) {
		this.location = location;
	}
	serialize() {
		let obj = {};
		for (let ak of Object.keys(this)) {
			switch (ak) {
				case "tNum":
				case "location":
					obj[ak] = this[ak];
					break;
			
				default:
					break;
			}
		}
		return obj;
	}
	deserialize(obj) {
		for (let ak of Object.keys(obj)) {
			switch (ak) {
				case "tNum":
				case "location":
					this[ak] = obj[ak];
					break;
			
				default:
					break;
			}
		}
		return ;
	}
}


// FILE visitor
class Visitor {
	constructor(color) {
		this.color = color;
		this.location = {type:VISITORLOC.BAG};
	}
	deserialize(obj) {
		for (let ak of Object.keys(obj)) {
			switch (ak) {
				case "color":
				case "location":
					this[ak] = obj[ak];
					break;
			
				default:
					break;
			}
		}
		return;		
	}
	// static getColorFrom(aVisitors, color, getFrom) {
	// 	let vList = aVisitors.filter((v) => 
	// 		v.color == color && v.location.type == getFrom);
	// 	if (!vList.length) {
	// 		return null;
	// 	}
	// 	return vList[0];
	// }
	
	
}



// FILE Game
class Game {
	constructor() {
		this.numPlayers = 0;
		this.currentPlayer = null;
		this.activePlayer = null;
		this.options = {};
		this.state = GAMESTATE.START;
		this.tickets = {};
		this.thumbs = [];
		
		// folowing done in client/server
		this.artists = [];
		this.players = [];
		this.board = {};
		this.art = [];
		this.repTiles = [];
		this.contracts = [];
		this.visitors = [];

		this.log = [];
		
	}

	playerHasDisplayed(pl = this.activePlayer) {
		return this.art.filter((c) => c.location.type == ARTLOC.DISPLAY && c.location.plNum == pl);
	}

	playerHasSold(pl = this.activePlayer) {
		return this.art.filter((a) => a.location.type == ARTLOC.SOLD && a.location.plNum == pl);
	}

	numCelebrity() {
		return this.artists.filter((artist) => artist.fame > 18).length;
	}

	getFlag(bitMask) {
		return this.flags & (bitMask);
	}


	init(players, options = {}) {
		this.options = options;
		this.state = GAMESTATE.START;
		this.numPlayers = players.length;

		let numTix = 20;
		if (this.numPlayers < 4) {
			numTix = 10;
			if (this.numPlayers == 3) numTix = 15;
		}

		for (let col of Object.values( TIXCOLOR)) {
			this.tickets[col] = new Array(numTix).fill(TIXLOC.BOARD);
		}

		// init thumbs
		for (let n=0; n < 5; n++) {
			this.thumbs[n] = [];
			for (let i=0; i < 4; i++) {
				this.thumbs[n].push({});
			}
		}

		
		// init players
		for (let pn=0; pn < players.length; pn++) {
			this.players[pn].init(players[pn], pn);
		}

		// set activePlayer to last player
		this.activePlayer = this.numPlayers - 1;


	}
	deserialize(rebuild) {
		// rebuild - just copy information over
		// during play, this is only used for init client and refresh

		for(let k of Object.keys(rebuild)) {
			switch (k) {
				case "currentPlayer":
				case "seed":
				case "origSeed":
				case "moves":
				case "substack":
				case "flags":
				case "options":
				case "activePlayer":
				case "numPlayers":
				case "state":
				case "tickets":
				case "thumbs":
				case "results":
				case "stats":
				case "log":
					this[k] = rebuild[k];
					break;
				case "artists":
				case "art":
				case "contracts":
				case "repTiles":
				case "players":
				case "visitors":
					// arrays of Class objects
					// note the objects have been created by Game
					for (let a in this[k]) {
						this[k][a].deserialize(rebuild[k][a]);
					}
					
					break;


				default:
					break;
			}
		}
	}

	activeColor() {
		return this.players[this.activePlayer].color;
	}

}

export {
	Art,
	Artist,
	Assistant,
	Board,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} 