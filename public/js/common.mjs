import {
	NFTLOC,
	NFTISTCOLOR,
	HELPERLOC,
	AVAILHELPERLOCS,
	BONUSTYPE,
	CLICKITEM,
	CLICKSPACE,
	CONTRACTLOC,
	GAMESTATE,
	PLAYERLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORLOC} from './egalconstants.mjs';


// FILE nft
// Note: Nft in client is limited to owned and top of piles
class Nft {
	constructor(type, num) {
		this.type = type;
		this.num = num;
		// 	0; 0+ reknown, pink tix
		// 	1; 0+ reknown, brown tix
		// 	2; 0+ reknown, any tix
		// 	3; 0+ reknown, any tix
		// 	4; 1+ reknown, pink + brown/white tix
		// 	5; 1+ reknown, brown + pink/white tix
		// 	6; 1+ reknown, any 2 tix
		// 	7; 2+ reknown, any 2 tix
		this.tixBonus = [];	// buy nft tix bonus
		this.numTixBonus = 1;
		this.reknownBonus = {fixed:0, perWhite:1};
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
				this.reknownBonus.fixed = 1;
				break;
			case 5:
				this.tixBonus.push(BONUSTYPE.BROWNTIX);
				this.tixBonus.push(BONUSTYPE.PINKWHITE);
				this.numTixBonus = 2;
				this.reknownBonus.fixed = 1;
				break;
			case 6:
			case 7:
				this.tixBonus.push(BONUSTYPE.TWOTIX);
				this.numTixBonus = 2;
				this.reknownBonus.fixed = num - 5;	// 1 for 6, 2 for 7
				break;
		
			default:
				break;
		}
		this.byArtist = null;
		this.location = {};
		this.location.type = NFTLOC.PILE;
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
class Helper {
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
	moveHelperTo(location) {
		this.location = Object.assign({}, location);
	}
}


// FILE Nftist
class Nftist {
	constructor() {
		this.type = null;
		this.color = null;
		this.initReknown = 1;
		this.num = 1;
		this.thumb = 1;
		this.reknown = 1;
		this.discovered = false;
		this.sigTokens = [{},{}]; 
		this.bonus = null;
	}

	discover() {
		this.discovered = true;
	}
	getValue(rLevel = this.reknown) {
		switch (rLevel) {
			case 1: return 0;
			case 2: 
			case 3: 
			case 4: return 5;
			case 5: if (this.initReknown >= 4) return 5;
			case 6:
			case 7: return 8;
			case 8: if (this.initReknown >= 4) return 8;
			case 9:
			case 10: return 11;
			case 11: if (this.initReknown >= 4) return 11;
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
				case "initReknown":
				case "reknown":
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
	constructor(nftType, bonusType, num) {
		// CHANGE TODO
		// dom should have no info unless cards are face up
		this.nftType = nftType;
		this.bonusType = bonusType;
		this.num = num;
		this.location = {type:CONTRACTLOC.DECK};
		// NOTE: for location.type = DEALT, num=column and pos=position in stack (0 = top)
		this.faceUp = false;	// show back or front?
		this.moneyUp = false;	// if showing back, is money on top or cred?
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
				case "nftType":
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
				case "nftType":
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
		this.cred = 10;
		this.location = {type:PLAYERLOC.HOME};

		this.helpers = [];

	}
	deserialize(obj) {
		for (let pk of Object.keys(obj)) {
			switch (pk) {
				case "num":
				case "color":
				case "name":
				case "money":
				case "cred":
				case "location":
				case "curator":
				case "dealer":
				case "playerId":
						this[pk] = obj[pk];
					break;

				case "helpers":
					// deserialize each helper
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
		this.cred = 10;
		this.location = {type:PLAYERLOC.HOME};

		for (let i=0; i < 10; i++) {
			if (i<2) {
				// move 2 helpers to desks
				this.helpers[i].init(this, {type:HELPERLOC.DESK, num:i});
			} else {
				this.helpers[i].init(this, {type:HELPERLOC.UNEMPLOYED});
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
	
	
}



// FILE Game
class Game {
	constructor() {
		this.numPlayers = 0;
		this.turnNum = 0;
		this.currentPlayer = null;
		this.activePlayer = null;
		this.options = {};
		this.state = GAMESTATE.START;
		this.tickets = {};
		this.thumbs = [];
		
		// folowing done in client/server
		this.nftists = [];
		this.players = [];
		this.board = {};
		this.nft = [];
		this.repTiles = [];
		this.contracts = [];
		this.visitors = [];

		this.log = [];
		
	}

	playerHasDisplayed(pl = this.activePlayer) {
		return this.nft.filter((c) => c.location.type == NFTLOC.WALLET && c.location.plNum == pl);
	}

	playerHasSold(pl = this.activePlayer) {
		return this.nft.filter((a) => a.location.type == NFTLOC.SOLD && a.location.plNum == pl);
	}

	numMagnate() {
		return this.nftists.filter((nftist) => nftist.reknown > 18).length;
	}

	getFlag(bitMask) {
		return this.flags & (bitMask);
	}

	auctionValue(nft) {
		let redArtistIdx = this.nftists.findIndex((a) => a.type === nft.type && a.color === NFTISTCOLOR.RED);
		let blueArtistIdx = this.nftists.findIndex((a) => a.type === nft.type && a.color === NFTISTCOLOR.BLUE);
		let redArtist = this.nftists[redArtistIdx];
		let blueArtist = this.nftists[blueArtistIdx];
		let ret = {value: 0, nftistIdx:0};
		// if both nftists are discovered or undiscovered, value of auction is max
		// otherwise value is whichever is discovered
		if (redArtist.discovered === blueArtist.discovered) {
			if (redArtist.getValue() >= blueArtist.getValue()) {
				ret.value = redArtist.getValue();
				ret.nftistIdx = redArtistIdx;
			} else {
				ret.value = blueArtist.getValue();
				ret.nftistIdx = blueArtistIdx;
			}
		} else if (redArtist.discovered) {
			ret.value = redArtist.getValue();
			ret.nftistIdx = redArtistIdx;
		} else {
			ret.value = blueArtist.getValue();
			ret.nftistIdx = blueArtistIdx;
		}
		return ret;
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
				case "turnNum":
				case "state":
				case "tickets":
				case "thumbs":
				case "results":
				case "stats":
				case "log":
					this[k] = rebuild[k];
					break;
				case "nftists":
				case "nft":
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

	obj2Str(o) {
		switch (o.type) {
			case CLICKITEM.EATIX:
			case CLICKITEM.EABONUS:
			case CLICKITEM.CONTINUE:
			case CLICKITEM.DONOTHING:
			case CLICKITEM.REDOBUTTON:
			case CLICKITEM.ENDBUTTON:
			case CLICKSPACE.DEALCONTRACTS:
				return o.type;
			case CLICKITEM.NFT:
				return o.type + "-" + o.nftType + "-" + o.num;
			case CLICKITEM.NFTIST:
				return o.type + "-" + o.color + "-" + o.nftType;
			case CLICKITEM.HELPER:
				return o.type + "-" + this.activePlayer + "-" + o.num;
			case CLICKITEM.THUMB:
				return o.type +  "-" + o.level + "-" + o.num;
			case CLICKITEM.HIREHELPER:
			case CLICKITEM.CONTRACT:
			case CLICKITEM.VISITOR:
			case CLICKITEM.REPTILE:
			case CLICKSPACE.CONTRACT:
			case CLICKSPACE.CRED:
			case CLICKSPACE.REPTILE:
				return o.type + "-" + o.num;
			case CLICKITEM.ORIENTATION:
			case CLICKITEM.TIX:
				return o.type + "-" + o.color;
			case CLICKSPACE.ACTION:
				return o.type + "-" + o.loc;
			case CLICKSPACE.AUCTION:
				return o.type + "-" + o.row + "-" + o.col;
		
			default:
				// error
				console.log('obj2str did not find ' + o.type);
				break;
		}
	}

	getAvailableHelpers() {
		// available helpers are at desks, on action spaces or kospaces
		return this.players[this.activePlayer].helpers.filter((a) => Object.values(AVAILHELPERLOCS).includes(a.location.type));
	}

	getUnemployed() {
		return this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.UNEMPLOYED);
	}

}

export {
	Nft,
	Nftist,
	Helper,
	Board,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} 