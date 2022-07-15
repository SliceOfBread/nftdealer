
import {
	DEBUG,
	ACTIONLOC,
	ARTBONUSTYPE,
	ARTISTCOLOR,
	ARTLOC,
	ARTTYPE,
	ASSTLOC,
	AVAILASSTLOCS,
	AUCTIONVAL,
	BONUSTYPE,
	CLICKITEM,
	CLICKSPACE,
	CONTRACTBONUS,
	CONTRACTLOC,
	FLAG,
	GAMESTATE,
	LOC2STATE,
	MARKETCOL,
	MARKETCOL2INFL,
	MAXINFLUENCE,
	MAXREPTILES,
	PLAYERCOLOR,
	PLAYERLOC,
	PROMPT,
	REPTILELOC,
	SIGLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORCOLOR,
	VISITORLOC} from '../public/js/egalconstants.mjs';

import {
	Art,
	Artist,
	Assistant,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} from '../public/js/common.mjs';

const CLIENTSIDE = false;

function mulberry32(a) {
    return function() {
      a |= 0; 
	  a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

class Random {
    constructor(seed = 0) {
      this.seed = Math.floor(seed * 4294967296);
    }

    // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    // generate random float in [0,1) with seed
    random()  {
      let t = this.seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

}


class ArtServer extends Art {
	constructor(type, num) {
		super (type, num)
	}
	moveArtTo(location) {
		
		this.location = location;
	}


}

class ArtistServer extends Artist {
	constructor() {
		super();
	}
	init(game, type, color, num, bonus) {
		this.type = type;
		this.color = color;
		this.num = num;
		this.thumb = num;
		if (type === ARTTYPE.PAINT || type === ARTTYPE.SKETCH) {
			this.initFame = 3;
			if (color === ARTISTCOLOR.BLUE) this.initFame -= num;
		}
		if (color === ARTISTCOLOR.RED) {
			this.initFame += 4;
			this.thumb += 2;
			// let wv = Visitor.getColorFrom(game.visitors, VISITORCOLOR.WHITE,VISITORLOC.BAG);
			let wv = game.visitors.find((v) => v.color === VISITORCOLOR.WHITE && v.location.type === VISITORLOC.BAG);
			if (wv) {
				wv.moveVisitorTo({type:VISITORLOC.ARTIST, artType:type});
			} else {
				throw "Could not find a WHITE visitor for artist init";
			}
			
		}
		if (num) {
			this.initFame += 3;
		}
		this.fame = this.initFame;
		this.bonus = bonus;
		this.sigTokens[0] = {location:SIGLOC.ARTIST};
		this.sigTokens[1] = {location:SIGLOC.ARTIST};
	}
	increaseFame() {
		if (this.fame > 18) {
			// TODO error
			return;
		}
		this.fame++;
		if (this.fame === 19) return true;
		return;
	}
	moveSigToken(loc, sigTokenIdx) {
		this.sigTokens[sigTokenIdx] = loc;
	}
	serialize() {
		let obj = {};
		for (let ak of Object.keys(this)) {
			switch (ak) {
				case "type":
				case "color":
				case "num":
				case "bonus":
				case "thumb":
				case "fame":
				case "initFame":
				case "discovered":
				case "sigTokens":
					obj[ak] = this[ak];
					break;
			
				default:
					break;
			}
		}
		return obj;
	}

}

class ContractServer extends Contract {
	constructor(ARTTYPE, BONUSTYPE, num) {
		super(ARTTYPE, BONUSTYPE, num)
	}
}

class VisitorServer extends Visitor {
	constructor(color) {
		super(color);
	}
	moveVisitorTo(toLocation) {
		// let updateLocs = [];
		// switch (this.location.type) {
		// 	case VISITORLOC.PLAZA:
		// 	case VISITORLOC.LOBBY:
		// 	case VISITORLOC.GALLERY:
		// 		updateLocs.push(this.location);
		// 		break;
		// 	default:
		// 		// other locations do not need updating of 'from' loc
		// 		break;
		// }
		// switch (toLocation.type) {
		// 	case VISITORLOC.PLAZA:
		// 	case VISITORLOC.LOBBY:
		// 	case VISITORLOC.GALLERY:
		// 	case VISITORLOC.ART:
		// 		updateLocs.push(toLocation);
		// 		break;
		// 	default:
		// 		// other locations do not need updating of 'to' loc
		// 		break;
		// }
		this.location = toLocation;
		// return updateLocs;

	}

	serialize() {
		let obj = {};
		for (let ak of Object.keys(this)) {
			switch (ak) {
				case "color":
				case "location":
					obj[ak] = this[ak];
					break;
			
				default:
					break;
			}
		}
		return obj;		
	}
}

class PlayerServer extends Player {
	constructor() {
		super();
		this.playerId = null;
		this.board = new PlayerBoard(this);
		for (let i=0; i < 10; i++) {
				this.assistants.push(new Assistant(i));
		}
	}
	serialize(playerId) {
		let obj = {};
		for (let pk of Object.keys(this)) {
			switch (pk) {
				// case "id":
				case "curator":
				case "dealer":
				case "playerId":
					if (playerId != "server" && playerId != this.playerId) break;
				case "num":
				case "color":
				case "name":
				case "money":
				case "influence":
				case "location":
					obj[pk] = this[pk];
					break;

				case "assistants":
					// serialize each asst
					obj[pk] = [];
					for (let i=0; i < this[pk].length; i++) {
						obj[pk].push(this[pk][i].serialize());
					}
					break;
				default:
					break;
			}
		}
		return obj;

	}
	movePlayerTo(loc) {
		this.location = Object.assign({}, loc);
	}
	addInfluence(val) {
		let amt = val;
		if (this.influence + amt > MAXINFLUENCE) {
			amt = MAXINFLUENCE - this.influence;
		} else if (this.influence + amt < 0) {
			// error
			console.log('error: influence went negative');
		}
		this.influence += amt;
		return;
	}
	addMoney(val) {
		this.money += val;
		return;
	}
}


// FILE Game
class GameServer extends Game {
	constructor() {
		super();
		this.moves = [];
		this.myRandom = new Random();
		this.seed = 0;
		this.origSeed = 0;
		this.flags = 0;
		this.results = null;
		this.stats = {};
		//this.remember = null;
		this.substack = [];
		for (let n=0; n<8; n++) {
			let a = new ArtistServer();
			this.artists.push(a);
		}
		for (let t of Object.values(ARTTYPE)) {
			for (let i=0; i < 8; i++) {
				this.art.push(new ArtServer(t, i));
			}
		}
		for (let p=0; p < 4; p++) {
			this.players.push(new PlayerServer());
		}
		// {
		// 	let numRepTiles = 16;
		// 	if (numPlayers < 3) numRepTiles = 12;
		// 	for (let i=0; i < numRepTiles; i++) {
		// 		this.repTiles.push(new RepTile());
		// 	}
		// }
		{
			for (let i=0; i < MAXREPTILES; i++) {
				this.repTiles.push(new RepTile());
			}
		}
		// 
		for (let t of Object.values(ARTTYPE)) {
			for (let b of Object.values(CONTRACTBONUS)) {
				if (b === CONTRACTBONUS.INFLUENCE && (t === ARTTYPE.PAINT || t === ARTTYPE.PHOTO)) continue;
				if (b === CONTRACTBONUS.MONEY && (t === ARTTYPE.SKETCH || t === ARTTYPE.ABSTRACT)) continue;
				this.contracts.push(new ContractServer(t, b, this.contracts.length));
			}
		}
		// {
		// 	let numWhiteVisitors = (numPlayers === 4) ? 12 : (numPlayers === 3) ? 10 : 8;
		// 	for (let c of Object.values(VISITORCOLOR)) {
		// 		let numVisitors = numWhiteVisitors;
		// 		if (c != VISITORCOLOR.WHITE) numVisitors += 2;
		// 		for (let i=0; i < numVisitors; i++) {
		// 			this.visitors.push(new VisitorServer(c));
		// 		}
		// 	}
		// }
		{
			for (let c of Object.values(VISITORCOLOR)) {
				let numVisitors = 14;
				if (c === VISITORCOLOR.WHITE)  numVisitors = 12;
				for (let i=0; i < numVisitors; i++) {
					this.visitors.push(new VisitorServer(c));
				}
			}
		}
	}

	pileNeedsContract() {
		let addToPile = Array(this.options.numContractPiles).fill(true);
		for (let pile=0; pile < this.options.numContractPiles; pile++) {
			if (this.contracts.find((c) => c.location.type === CONTRACTLOC.DEALT && c.location.num === pile)) {
				// if any contracts in pile, mark not empty
				addToPile[pile] = false;
			}
		}
		return addToPile;
	}

	dealContracts(refill = false) {
		let addToPile = Array(this.options.numContractPiles).fill(true);
		if (refill) {
			addToPile = this.pileNeedsContract();	
		}
		let addCount = addToPile.filter((i) => i).length;
		let deck = this.contracts.filter((c) => c.location.type === CONTRACTLOC.DECK);
		if (deck.length < addCount) {
			// if not enough cards to deal, "reshuffle" all cards in DECK/DEALT/DISCARD
			this.redealPrep();
			this.logMsg("SHUFFLE");
			addToPile = Array(this.options.numContractPiles).fill(true);
		}

		// formerly in redeal()
		deck = this.contracts.filter((c) => c.location.type === CONTRACTLOC.DECK);
		for (let i=0; i < this.options.numContractPiles; i++) {
			if (!addToPile[i]) continue;
			let contractsInPile = this.contracts.filter((c) => c.location.type === CONTRACTLOC.DEALT && c.location.num === i);
			// adjust each card position so pos:0 will be on top
			for (let i in contractsInPile) {
				contractsInPile[i].location.pos++;
			}
			let c = this.removeRandomItem(deck);
			c.moveContractTo({type:CONTRACTLOC.DEALT, num:i, pos:0});
		}		
	}

	redealPrep() {
		let deck = this.contracts.filter((c) => c.location.type != CONTRACTLOC.PLAYER);
		// move those cards to the deck
		deck.forEach((c) => c.moveContractTo({type:CONTRACTLOC.DECK}));
	}

	chooseArtPileTop(type) {
		// filter array of art to include only type and only on pile
		let artOfType = this.art.filter((a) => a.type === type);
		if (artOfType.filter((a) => a.location.type === ARTLOC.PILETOP).length) {
			throw "Tried to set a second PILETOP!";
			// TODO change this error
		}
		let artPile = artOfType.filter((a) => a.location.type === ARTLOC.PILE);
		if (artPile.length) {
			let a = this.randomArrayItem(artPile);
			a.location.type = ARTLOC.PILETOP;
			return a;
		} else {
			// TODO message? no more art of type?
			return false;
		}
	}

	topOfArtPile(type) {
		return  this.art.find((a) => a.type === type && a.location.type === ARTLOC.PILETOP);
	}

	getRandomFromBag() {
		let bagVisitors = this.visitors.filter((v) =>
			v.location.type === VISITORLOC.BAG);
		if (!bagVisitors.length) return null; // bag empty ERROR?
		return this.randomArrayItem(bagVisitors);
	}

	randomInt(from, to) {
		this.myRandom.seed = this.seed;
		let r = Math.floor(this.myRandom.random() * (to-from+1) + from);
		this.seed = this.myRandom.seed;
		return r;
	}
	
	randomObj(inObj) {
		let k = Object.keys(inObj);
		return inObj[k[this.randomInt(0, k.length-1)]];
	}
	
	removeRandomItem(ar) {
		// takes array. Removes a random entry and returns it
		// The original array IS MODIFIED
		if (!ar.length) return null;
		return ar.splice(this.randomInt(0,ar.length-1),1)[0];
	}
	
	randomArrayItem(ar) {
		if (!ar.length) return null;
		return ar[this.randomInt(0,ar.length-1)];
	}
	
	// shuffle(ar) {
	// 	for (let c=0; c<ar.length; c++) {
	// 		let tmpC;
	// 		let swap = this.randomInt(0, ar.length-1);
	// 		tmpC = ar[c];
	// 		ar[c] = ar[swap];
	// 		ar[swap] = tmpC;
	// 	}
	// 	return;
	// }

	infl2Next5(infl) {
		return (infl % 5) ? (infl % 5) : 5;
	}
	
	getUsableInfl() {
		let plInf = this.players[this.activePlayer].influence;
		if (this.thisIsKO())  {
			// decrease players useful infl by amount player needs to spend to do KO
			plInf -= this.infl2Next5(plInf);
		}
		return plInf;
	}

	playerCanAfford(canAffordAmount, addlInfl = 0) {
		return this.players[this.activePlayer].money + this.infl4discount(this.getUsableInfl() + addlInfl) >= canAffordAmount;
	}

	playerGetsTix(plNum, tixColor) {
		let tixIndex = this.tickets[tixColor].indexOf(TIXLOC.BOARD);
		if (tixIndex === -1) {
			// no tix of that color left
			// take one from discards
			tixIndex = this.tickets[tixColor].indexOf(TIXLOC.DISCARD);
			// move one from any another pile to discard
			for (let tc of Object.values(TIXCOLOR)) {
				if (tc === tixColor) continue;
				let discIndex = this.tickets[tc].indexOf(TIXLOC.BOARD);
				if (discIndex != -1) {
					this.tickets[tc][discIndex] = TIXLOC.DISCARD;
					break;
				}
			}
		}
		if (tixIndex != -1) {
			let plStr = "player" + plNum;
			if (plNum < 0) {
				plStr = TIXLOC.DISCARD;
				this.logMsg("DISCARDTIX");
			} else {
				this.logMsg("GETSTIX", this.activePlayer, tixColor);
			}
			this.tickets[tixColor][tixIndex] = plStr;
			if (!this.getFlag(FLAG.MID_TRIGGERED)) {
				// haven't triggered mid-game scoring yet, check if we should
				if (!this.tickets[tixColor].includes(TIXLOC.BOARD)) {
					// the tixColor pile has just run out, trigger mid-game score
					this.setFlag(FLAG.MID_TRIGGERED);
				}
			}
			if (!this.getFlag(FLAG.TIX_EMPTY)) {
				// haven't seen tix empty yet (end game trigger)
				// 
				if (!this.tickets[TIXCOLOR.PINK].includes(TIXLOC.BOARD) &&
					!this.tickets[TIXCOLOR.BROWN].includes(TIXLOC.BOARD) && 
					!this.tickets[TIXCOLOR.WHITE].includes(TIXLOC.BOARD) ) {
					// trigger if no tix of any color on BOARD
					this.setFlag(FLAG.TIX_EMPTY);
					this.checkEndGame();
				}
			}
			return true;
		} else {
			// no tix on BOARD or DISCARD??? If plNum == -1 return false (no tix left)
			// otherwise it is an error (maybe bots hoarding tix) TODO ensure this can't happen by
			//   getting rid of most tix doms. use doms when moving tix but keep at most 2 in any pile
			//   maybe get rid of playerboard piles and put them in playerInfo
			return false;
		}
	} 

	playerMadeCelebrity(artistIdx) {
		this.logMsg("CELEB", artistIdx);
		this.players[this.activePlayer].addMoney(5);
		if (!this.getFlag(FLAG.TWO_CELEBRITY)) {
			if (this.artists.filter((a) => a.fame > 18).length > 1) {
				this.setFlag(FLAG.TWO_CELEBRITY);
				this.logMsg("ENDCOND");
				this.checkEndGame();
			}
		}
	}

	getAvailableAssistants() {
		// available assts are at desks, on action spaces or kospaces
		return this.players[this.activePlayer].assistants.filter((a) => Object.values(AVAILASSTLOCS).includes(a.location.type));
	}

	getUnemployed() {
		return this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.UNEMPLOYED);
	}
	// getEmptyDesk() {
	// 	let aList = this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.DESK);
	// 	// No desks available?
	// 	if (aList.length > 3) return null;
	// 	// Find lowest unoccupied desk
	// 	for (let i = 0; i < 4; i++) {
	// 		if (aList.find((a) => a.location.num === i)) continue; // desk occupied, skip it
	// 		return i;
	// 	}
	// 	// error
	// 	// throw "Less than 4 assistants at desks but no desk available?";
	// 	// for now, return null
	// 	return null;
	// }

	hireAsst() {
		let asst = this.getUnemployed();
		if (!asst) return;
		this.logMsg("ASST2", this.activePlayer, "HIRED");
		// get hiring bonus 
		// (0,brown,pink,infl,0,bpw*,0,money) 
		//  2   3    4    5   6  7   8  9
		switch (asst.num) {
			case 3:
				this.playerGetsTix(this.activePlayer, TIXCOLOR.BROWN);
				break;
			case 4:
				this.playerGetsTix(this.activePlayer, TIXCOLOR.PINK);
				break;
			case 5:
				{
					let bonus = this.bonusInfluence();
					this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORHIREBONUS");
					this.players[this.activePlayer].addInfluence(bonus);	
				}
				break;
			case 7:
				this.substack.push(this.state);
				this.substack.push(Object.values(TIXCOLOR));
				this.state = GAMESTATE.TIXCHOICE;
				break;
			case 9:
				{
					let bonus = this.bonusMoney();
					this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORHIREBONUS");
					this.players[this.activePlayer].addMoney(bonus);
				}
				break;
		
			default:
				break;
		}
		this.sendHome(asst);

	}

	returnContractAsst(contract) {
		this.sendHome(this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.CONTRACTBONUS && a.location.num === contract.num));
	}

	sendHome(asst) {
		if (!asst) return;

		let numUsedDesks = this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.DESK).length;

		if (numUsedDesks < 4) {
			asst.moveAsstTo({type:ASSTLOC.DESK});
			this.logMsg("ASST2", this.activePlayer, "SENTHOME")
			// asst.location = {type:ASSTLOC.DESK, num:ed};
		} else {
			asst.moveAsstTo({type:ASSTLOC.DISCARD});
			this.logMsg("ASST2", this.activePlayer, "SENTDISC")
			// asst.location = {type:ASSTLOC.DISCARD};
		}
	}

	infl4discount(infl) {
		const inflDiscount = [0,1,2,2,2,3,3,3,3,4,4,4,4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 9,10,10,11,12,13,14,15,16,17,18,19];
		return inflDiscount[infl];
	}

	infl2money(infl) {
		const inflValue = [0,1,1,1,2,2,2,2,3,3,3,3,4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9,10,11,12,13,14,15,16,17,18,20];

		return (infl > inflValue.length-1) ? 20 : inflValue[infl];

	}
	inflNextMark(infl) {
		const nextMark = [0,0,1,1,1,4,4,4,4,8,8,8,8,12,12,12,15,15,15,18,18,20,20,22,22,24,24,26,27,28,29,30,31,32,33,34];
		return nextMark[infl];
	}

	bonusInfluence(plNum = this.activePlayer) {
		// let plNum;
		// if (typeof p === 'undefined') {
		// 	plNum = this.activePlayer;
		// } else {
		// 	plNum = p;
		// }
		let numPink = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.PINK, plNum);
		let numWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, plNum);
		return (2*numPink + numWhite);
	}

	bonusMoney(plNum = this.activePlayer) {
		// let plNum;
		// if (typeof p === 'undefined') {
		// 	plNum = this.activePlayer;
		// } else {
		// 	plNum = p;
		// }
		let numBrown = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.BROWN, plNum);
		let numWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, plNum);
		return (2*numBrown + numWhite);
	}

	nextPlayer() {
		// let checkKO = false;
		let locationKO = this.players[this.activePlayer].location.loc;
		switch (this.state) {
			case GAMESTATE.EAOREND:
			case GAMESTATE.ENDTURN:
				// mark turn ended (by making it un-undoable)
				this.moves.push({plNum:this.activePlayer}); // blank move is UNDO limit
				// assume turn is over (can be changed if KO)
				this.state = GAMESTATE.PICKACTION;

				if (this.getFlag(FLAG.DID_KO)) {
					// there was a KO and it is done, send KO piece home
					let koPiece = this.getKOpiece();
					if (koPiece.player) {
						// send player piece home
						koPiece.player.movePlayerTo({type:PLAYERLOC.HOME});
					} else if (koPiece.asst) {
						// send player asst home
						this.sendHome(koPiece.asst);
					} // else no KO piece, possible if asst was used in KO
					this.currentPlayer = this.nextPlNum(this.currentPlayer);
					this.activePlayer = this.currentPlayer;
					this.checkLastRound();
					this.resetRoundFlags();
					if (this.state === GAMESTATE.PICKACTION) this.logMsg("TAKESTURN", this.activePlayer);
				} else {
					// if there was a kickout, that player is next
					// unless it was active player, then asst goes home (this already done in EAorEndTurn)
					let koPiece = this.getKOpiece();
					if (koPiece.player) {
						this.activePlayer = koPiece.playerIdx;
						// checkKO = true;
						this.logMsg("DOESKO", this.activePlayer);

					} else if (koPiece.asst && koPiece.playerIdx != this.activePlayer) {
						this.activePlayer = koPiece.playerIdx;
						// checkKO = true;
						this.logMsg("DOESKO", this.activePlayer);

					} else if (koPiece.playerIdx === this.activePlayer) {
						// player's own ast KOed
						this.sendHome(koPiece.asst);
						koPiece.asst = null;
					}
					// let tmpPiece = this.players.findIndex((p) => p.location.type === PLAYERLOC.KO);
					// if (tmpPiece === -1) {
					// 	// no player piece kicked out, check assistants for each player
					// 	for (let plNum = 0; plNum < this.numPlayers; plNum++) {
					// 		tmpPiece = this.players[plNum].assistants.find((a) => a.location.type === ASSTLOC.KO);
					// 		if (tmpPiece) {
					// 			// note - player's own asst dealt with in EAorEndTurn
					// 			this.activePlayer = plNum;
					// 			checkKO = true;
					// 			this.logMsg("DOESKO", this.activePlayer);
					// 		}
					// 	}
					// } else {
					// 	// other player piece kicked out
					// 	this.activePlayer = tmpPiece;
					// 	checkKO = true;
					// 	this.logMsg("DOESKO", this.activePlayer);
					// }
					
					this.resetTurnFlags();
					// if above did not find another player/asst in ko loc
					// OR if player cannot do any Ko action then turn is over, next player
					// otherwise activePlayer does KOpickAction
					// TODO if player WAS KOed but can't do anything, send them home!
					// if (!checkKO || !this.getKoActionClicks(locationKO)) {
					if (!(koPiece.player || koPiece.asst) || !this.getKoActionClicks(locationKO)) {
						// if no kickout, then next player (unless game over)
						this.currentPlayer = this.nextPlNum(this.currentPlayer);
						this.activePlayer = this.currentPlayer;
						// if there was a piece kicked out but nothing to do, send home
						if (koPiece.player) {
							// send player piece home
							koPiece.player.movePlayerTo({type:PLAYERLOC.HOME});
						} else if (koPiece.asst) {
							// send player asst home
							this.sendHome(koPiece.asst);
						} // else no KO piece
	
						this.checkLastRound();
						this.resetRoundFlags();
						if (this.state === GAMESTATE.PICKACTION) this.logMsg("TAKESTURN", this.activePlayer);
					} else {
						// this.setPlayerDealtContracts(0);
						// this.setPlayerDidEA(0);
						switch (locationKO) {
							case ACTIONLOC.SALES:
								this.state = GAMESTATE.KOSALES;
								break;
							case ACTIONLOC.ART :
								this.state = GAMESTATE.KOART;
								break;
							case ACTIONLOC.MEDIA :
								this.state = GAMESTATE.KOMEDIA;
								break;
							case ACTIONLOC.MARKET :
								this.state = GAMESTATE.KOMARKET;
								break;
						
							default:
								// TODO error
								break;
						}
					}
				}
				break;
			case GAMESTATE.START:
				this.moves.push({plNum:this.activePlayer}); // blank move is UNDO limit	
				if (this.activePlayer === 0) {
					// if activePlayer is start Player (0) then move to next GAMESTATE
					this.state = GAMESTATE.PICKACTION;
					this.currentPlayer = 0;
					// remove any leftover reptiles from start
					let leftovers = this.repTiles.filter((t) => t.location.type === REPTILELOC.STARTTILE);
					for (let tile of leftovers) {
						tile.moveRepTileTo({type:REPTILELOC.DISCARD});
					}
					return;
				}
				this.activePlayer--;
				break;
		
			default:
				// error
				console.log(`Error: nextPlayer called in state: ${this.state}`);
				break;
		}
	}

	nextPlNum(n) {
		// check for mid game scoring
		if (this.getFlag(FLAG.MID_TRIGGERED) && !this.getFlag(FLAG.MID_DONE)) {
			// mid game scoring!
			// https://boardgamegeek.com/thread/2114626/article/30757602#30757602
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				let bonus = this.bonusInfluence(plNum);
				this.logMsg("RCVSINFL",plNum,bonus,"FORMID");
				this.players[plNum].addInfluence(bonus);

				bonus = this.bonusMoney(plNum);
				this.logMsg("RCVSMONEY",plNum,bonus,"FORMID");
				this.players[plNum].addMoney(bonus);
			}
			// don't do this again
			this.setFlag(FLAG.MID_DONE);
		}
		return (n+1) % this.numPlayers;
	}

	init(players, options = {}, initSeed) {

		if (initSeed != undefined) {
			this.seed = initSeed;
		} else {
			this.seed = Math.floor(Math.random() * 4294967296);
		}
		this.origSeed = this.seed;

		// this will init board/players
		super.init(players, options);
		for (let pn=0; pn < this.numPlayers; pn++) {
			this.players[pn].playerId = players[pn].id; 
		}

		// init bonus tiles
		let tmpBonusTile = [];
		// there are ten bonus tiles (2 each of 5 types)
		tmpBonusTile.push(BONUSTYPE.INFLUENCE);
		tmpBonusTile.push(BONUSTYPE.MONEY);
		tmpBonusTile.push(BONUSTYPE.FAME);
		tmpBonusTile.push(BONUSTYPE.TWOTIX);
		tmpBonusTile.push(BONUSTYPE.PLAZAVISITOR);
		tmpBonusTile.push(BONUSTYPE.INFLUENCE);
		tmpBonusTile.push(BONUSTYPE.MONEY);
		tmpBonusTile.push(BONUSTYPE.FAME);
		tmpBonusTile.push(BONUSTYPE.TWOTIX);
		tmpBonusTile.push(BONUSTYPE.PLAZAVISITOR);


		//init artists
		for (let n=0; n<8; n++) {
			let a = this.artists[n];
			let artType = Object.values(ARTTYPE)[Math.floor(n/2)];
			let artistColor = Object.values(ARTISTCOLOR)[n % 2];
			a.init(this, artType, artistColor, this.randomInt(0,1), this.removeRandomItem(tmpBonusTile));
		}

		// select blue artist that starts discovered
		this.randomArrayItem(this.artists.filter((a) => a.color === ARTISTCOLOR.BLUE)).discover();
		
		// remove unused visitors
		// for 3P game remove 2 of each
		// for 1/2P game, remove 4 each
		for (let i=0; i < [0,4,4,2,0][this.numPlayers]; i++) {
			for (let c of Object.values(VISITORCOLOR)) {
				this.visitors.find((v) => v.color === c && v.location.type === VISITORLOC.BAG).moveVisitorTo({type:VISITORLOC.DISCARD});
			}
		}

		// init art pile top
		for (let t of Object.values(ARTTYPE)) {
			this.chooseArtPileTop(t);
		}
		// choose auction work(s)
		{
			// put pile top art piece of each type into auction
			
			for (let t of Object.values(ARTTYPE)) {
				this.topOfArtPile(t).location.type = ARTLOC.AUCTION;
				// set new top of pile
				this.chooseArtPileTop(t);
			}
			// remove random auction pieces, until we have correct number
			// for 4P, choose 3 for auction
			// for 3P, choose 2
			// for 2P/1P, choose 1
			let auctionWorks = this.art.filter((a) => a.location.type === ARTLOC.AUCTION);
			while (true) {
				// remove art from auction
				let a = this.removeRandomItem(auctionWorks);
				a.location.type = ARTLOC.DISCARD;
				if (auctionWorks.length < this.numPlayers) break;
				if (auctionWorks.length === 1) break;
			}
		}
		// move some visitors to new art
		for (let t of Object.values(ARTTYPE)) {
			// this.topOfArtPile(t).addVisitors(this.visitors);

			let topOfPile = this.topOfArtPile(t);
			this.visitorsToArt(topOfPile, t);		
		}

		// init the contracts		
		if (!this.options.numContractPiles) {
			this.options.numContractPiles = 4;
		}
		this.dealContracts();

		//init reputation tiles
		{
			let rtNums = [];
			for (let i=0; i<20 ; i++) {
				rtNums.push(i);
			}
			// init repTIles. 4 for starting picks plus 8/12 for market
			let count = 0;
			// pick random repTiles for intl market
			for (let c in MARKETCOL) {
				if (c=="ADD2COL" && this.numPlayers < 3) continue; // skip middle column when players < 3
				for (let artType of Object.values(ARTTYPE)) {
					let t = this.repTiles[count];
					t.init(this.removeRandomItem(rtNums));
					t.moveRepTileTo({type:REPTILELOC.INTLMARKET, artType:artType, col:c});
					count++;
				}
			}
			// pick random repTiles for starting tiles
			for (let r of Object.values(ACTIONLOC)) {
				let t = this.repTiles[count];
				t.init(this.removeRandomItem(rtNums));
				t.moveRepTileTo({type:REPTILELOC.STARTTILE, actionSpace:r})
				count++;
			}
			// mark other reptiles unused/discarded
			while (count < MAXREPTILES) {
				let t = this.repTiles[count];
				t.moveRepTileTo({type:REPTILELOC.DISCARD});
				count++;
			}	

		}

		//init lobby and plaza visitors
		// 4 go to plaza
		for (let i=0; i < 4; i++) {
			let v = this.getRandomFromBag();
			v.moveVisitorTo({type:VISITORLOC.PLAZA});
		}
		// 1 to each player lobby
		// TODO do something about DUMMY player for solo
		for (let pl=0; pl < this.numPlayers; pl++) {
			let v = this.getRandomFromBag();
			v.moveVisitorTo({plNum:pl, playerColor:this.players[pl].color, type:VISITORLOC.LOBBY});
		}

		// create curator/dealer cards
		let cCards = [0,1,2,3];
		let dCards = [0,1,2,3];
		for (let pl in this.players) {
			this.players[pl].curator = this.removeRandomItem(cCards); // new Curator(this.removeRandomItem(cCards));
			this.players[pl].dealer = this.removeRandomItem(dCards); // new Dealer(this.removeRandomItem(dCards));
		}

	}

	updateInfo() {
		return;
	}

	getActiveSpaces() {
		let tmp = {clickables:[], msgs:[]};
		switch (this.state) {
			case GAMESTATE.PICKACTION:
				{
					// check if contracts need updating, if so this is the only option
					if (this.getFlag(FLAG.UPDATE_CONTRACTS)) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.CONTINUE}));
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONTCONTRACTS") );
						break;
					}
					// show available actions/ea
					// don't show anything that can't be done

					tmp.clickables = this.getActionClicks();

					tmp.msgs.push("ACTION");

					let eAClickable = tmp.clickables.some((c) => c.type === CLICKITEM.EATIX || c.type === CLICKITEM.EABONUS);

					if (eAClickable) tmp.msgs.push("EACTION");

					if (this.getFlag(FLAG.DID_EA)) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.REDOBUTTON}));
					}
			
				}
				break;
			case GAMESTATE.EAOREND:
				if (this.getFlag(FLAG.ART_BOUGHT) || this.getFlag(FLAG.UPDATE_CONTRACTS)) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.CONTINUE}));
					if (this.getFlag(FLAG.ART_BOUGHT)) {
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONTART") );
					} else {
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONTCONTRACTS") );
					}
					break;
				}
				if (!this.getFlag(FLAG.DID_KO) && !this.getFlag(FLAG.DID_EA) ) {
					// normal player (not KO) after action hasn't done EA yet
					if (this.getEATixClicks()) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.EATIX}));
					}
					if (this.getEABonusClicks()) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.EABONUS}));
					}
				}
			// case GAMESTATE.EADONE:
			case GAMESTATE.ENDTURN:
				if (tmp.clickables.length) {
					tmp.msgs.push("EAORNONE");
					// if EA is possible, also allow DO NOTHING
					tmp.msgs.push("#".concat(CLICKITEM.DONOTHING, "#", "DONOTHING"))
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.DONOTHING}));
				} else {
					// if no EA possible, allow END TURN
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.ENDBUTTON}));
				}
				break;
			case GAMESTATE.EATIX_MAIN:
				//tmp.clickables = this.getEATixClicks(true);

				// highlight visitors that can be moved with tix
				// note: do this instead of highlighting tix and then selecting visitor of same color
				{
					let tixPlayer = "player" + this.activePlayer; // TODO this code sux!
					for (let col of Object.values( TIXCOLOR)) {
						if (this.tickets[col].includes(tixPlayer)) {
							// player has this color tix
							// highlight a visitor of that color in each lobby/plaza
							// with exception for white
							let idx = this.visitors.findIndex((v) => v.color === col && v.location.type === VISITORLOC.PLAZA);
							if (idx != -1) {
								tmp.clickables.push(this.obj2Str({type:CLICKITEM.VISITOR, num:idx}));
							}
							for (let p=0; p < this.numPlayers; p++) {
								idx = this.visitors.findIndex((v) => v.color === col && v.location.type === VISITORLOC.LOBBY && v.location.plNum === p);
								// if we find a visitor of correct color, allow it to be clicked
								// for white from player's own lobby, make sure it is allowed
								if (idx != -1 && 
										(p != this.activePlayer || // different player lobby
										col != TIXCOLOR.WHITE || // tix not white
										this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer) < this.playerHasSold().length + 1)) { // have space for more white
									tmp.clickables.push(this.obj2Str({type:CLICKITEM.VISITOR, num:idx}));
								}
							}
						}
					}
					if (tmp.clickables.length) {
						tmp.msgs.push("TIXVISITOR");
					}
					// if used at least 1 tix
					if (this.getFlag(FLAG.DID_EA)) {
						tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","DONE")); 
						tmp.clickables.push(CLICKITEM.DONOTHING);
					}
				}

				break;
			case GAMESTATE.EABONUS_MAIN:
				tmp.clickables = this.getEABonusClicks(true);
				tmp.msgs.push("CONTRACTBONUS");
				break;
			case GAMESTATE.MARKET_ASST:
			case GAMESTATE.EABONUS_ASST:
				{
					// player to choose asst
					let plAssts = this.getAvailableAssistants();
					for (let asst of plAssts) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.ASSISTANT, num:asst.num}));
					}
					tmp.msgs.push("ASST");
				}
				break;
			case GAMESTATE.EABONUS_CONTRACT:
			case GAMESTATE.SALES_MAIN:
			case GAMESTATE.SALES_GETCONTRACT:
			case GAMESTATE.SALES_SELLART:
			case GAMESTATE.SALES_VISITOR:
			case GAMESTATE.SALES_BONUSUP:
				tmp = this.getSalesClicks(true);
				break;

			case GAMESTATE.KOSALES:
			case GAMESTATE.KOART:
			case GAMESTATE.KOMEDIA:
			case GAMESTATE.KOMARKET:
				// for KO, what actions can be done
				// OR what EA can be done
				tmp = this.getKoActionClicks(Object.values(ACTIONLOC)[this.state & 0x3], true);
				// OR don't do anything
				tmp.clickables.push(this.obj2Str({type:CLICKITEM.DONOTHING}));
				tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","SKIPKO"));
				break;

			case GAMESTATE.ART_MAIN:
				tmp = this.getArtClicks(true);
				break;
			case GAMESTATE.MEDIA_MAIN: 
				tmp = this.getMediaClicks(true);
				break;
			case GAMESTATE.MARKET_MAIN:
				tmp = this.getMarketClicks(true);
				break;
			case GAMESTATE.PLACEREPTILE:
				{
					// choose available reptile loc
					let plRepTiles = this.playerRepTiles();
					for (let i=0; i < 6; i++) {
						if (!plRepTiles.find((prt) => prt.location.bonusLoc === i)) {
							// if player does not have a reptile in this bonus space it can be used
							tmp.clickables.push(this.obj2Str({type:CLICKSPACE.REPTILE, num:i}));
						}
					}
					if (tmp.clickables.length) {
						tmp.msgs.push("TILEBONUS");
					} else {
						// no spaces, tile will be discarded
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.DONOTHING}));
						tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","CONTINUE"));
						tmp.msgs.push("TILEDISC");
					}
				}
				break;
			case GAMESTATE.VISITOR2PLAZA:
				{
					// choose visitor to leave lobby
					for (let vc of Object.values(VISITORCOLOR)) {
						let visitorIndex = this.visitors.findIndex((v) => v.location.type === VISITORLOC.LOBBY && 
							v.location.plNum === this.activePlayer &&
							v.color === vc);
						if (visitorIndex != -1) {
							tmp.clickables.push(this.obj2Str({type:CLICKITEM.VISITOR, num:visitorIndex}));
						}
					}
					tmp.msgs.push("LEAVINGVISITOR");
				}
				break;
			case GAMESTATE.DECRPRICE:
				// use infl to reduce price or done
				{
					let tmpInfl = this.players[this.activePlayer].influence;
					if (tmpInfl && this.substackEnd()) {
						// if player has influence and price (on substack) > 0, show next mark down to reduce price by 1
						tmp.clickables.push(this.obj2Str({type:CLICKSPACE.INFLUENCE, num:this.inflNextMark(tmpInfl)}));
						tmp.msgs.push("INFL4COST".concat(":",this.substackEnd()-1));
					}
					// only allow done if affordable
					if (this.substackEnd() <= this.players[this.activePlayer].money) {
						tmp.clickables.push(CLICKITEM.CONTINUE);
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONT2PAY", ":", this.substackEnd()));

					}
				}
				break;
			case GAMESTATE.INCRFAME:
				// use infl to incr artist fame
				{
					let artist = this.artists[this.substackEnd()];
					if (this.players[this.activePlayer].influence && artist.fame < 19) {
						// if player has infl and artist fame can be increased
						tmp.clickables.push(this.obj2Str({type:CLICKSPACE.INFLUENCE, num:this.players[this.activePlayer].influence - this.infl2Next5(this.players[this.activePlayer].influence)}));
						tmp.msgs.push("INFL4FAME".concat(":", this.substackEnd()));
					}
					if (this.substackEnd(1) != GAMESTATE.ART_BUY || this.playerHasDisplayed().length < 3 || this.playerHasMasterpiece() || (artist.fame > 18)) {
						// only allow if not buying art OR
						//   if space available for art (<3) OR
						//   player has masterpiece or is now acquiring one
						// NOTE: no need to check if <4 spaces as that is done before art can be bought
						tmp.clickables.push(CLICKITEM.CONTINUE);
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONT2NOFAME"));
					}
				}
				break;
			case GAMESTATE.THUMBARTIST:
				// let user choose an artist to increase fame
				// i.e. any discovered with thumb level one less than thumb level chosen
				{
					let artistList = this.artists.filter((a) => a.discovered && a.thumb === this.substackEnd()-1);
					for (let artist of artistList) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, artType:artist.type, color:artist.color}))
					}
					tmp.msgs.push("PROMOARTIST"); 
				}
				break;
			case GAMESTATE.FAMEARTIST:
				// let user choose an artist to increase fame
				// i.e. any discovered, non-celebrity artist
				{
					let artistList = this.artists.filter((a) => a.discovered && a.fame < 19);
					for (let artist of artistList) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, artType:artist.type, color:artist.color}))
					}
					if (tmp.clickables.length) {
						tmp.msgs.push("FAMEARTIST");
					} else {
						tmp.clickables.push(CLICKITEM.DONOTHING);
						tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","CONTINUE"));
					}
				}
				break;
			case GAMESTATE.VISITOR2GALLERY:
				{
					// show visitors available to get (last item on substack)
					for (let vi of this.substackEnd()) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.VISITOR, num:vi}));
					}
					if (tmp.clickables.length) {
						tmp.msgs.push("GALVISITOR");
					} else {
						tmp.clickables.push(CLICKITEM.DONOTHING);
						tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","CONTINUE"));
					}
				}
				// 
				break;
			case GAMESTATE.SALES_GETTIX:
				// player putting contract in empty 3rd space gets choice of tix colors
			case GAMESTATE.TWOCHOICE:
			case GAMESTATE.TIXCHOICE:
				for (let tc of this.substackEnd()) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.TIX, color:tc}));
				}
				if (this.state === GAMESTATE.TWOCHOICE) {
					tmp.msgs.push("GETFIRSTTIX");
				} else {
					tmp.msgs.push("GETTIX");
				}
				
				break;

			case GAMESTATE.LEAVEASST:
				// get all players assts in action locs
				let tmpAssts = this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.ACTION);
				for (let a of tmpAssts) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.ASSISTANT, plNum:this.activePlayer, num:a.num}));
				}
				tmp.msgs.push("ASSTLEAVE");
				tmp.clickables.push(CLICKITEM.DONOTHING);
				tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","DONTASST"));
				break;

			case GAMESTATE.FINALAUCTION:
				// auction off the auction works
				let auctionWorks = this.art.filter((a) => a.location.type === ARTLOC.AUCTION);
				// show player choice
				for (let art of auctionWorks) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.ART, artType:art.type, num:art.num}));
					
					let value = this.auctionValue(art).value;
					tmp.msgs.push("WORKWORTH".concat(":", art.type, ":", value));
				}

				break;

			case GAMESTATE.START:
				// for first turn (select location and bonus reptile) only
				//  actionLocs are active

				let startRepTiles = this.repTiles.filter((t) => t.location.type === REPTILELOC.STARTTILE);
				for (let srt of startRepTiles) {
					tmp.clickables.push(this.obj2Str({type:CLICKSPACE.ACTION, loc:srt.location.actionSpace}));
				}
				tmp.msgs.push("STARTLOC");
				break;

			case GAMESTATE.FINALSCORE:
				return tmp;
		
			default:
				break;

		}
		if (!tmp.clickables.length) {
			// handle the 'player can't do anything case'
			tmp.clickables.push(this.obj2Str({type:CLICKITEM.ENDBUTTON}));
			tmp.msgs.push("TURNEND");
		}
		// always show REDO, if any moves unDOABLE
		if (this.moves.length && (this.moves[this.moves.length-1].location || DEBUG))	{
			tmp.clickables.push(this.obj2Str({type:CLICKITEM.REDOBUTTON}));
			// tmp.msgs.push("TURNREDO");
		}
		
		return tmp;
	}

	processMoves(moves) {
		for (let i in moves) {
			try {
				if (DEBUG && moves[i].test) {
					// moves without plNum are for DEBUG only
					switch (moves[i].type) {
						case "visitor":
							{	// {"test":1, "type":"visitor", "color":"VISITORCOLOR.WHITE", "location":{"type":"VISITORLOC.GALLERY", "plNum":0}}
								let v = this.visitors.find((visitor) => visitor.color === moves[i].color && visitor.location.type === VISITORLOC.BAG);
								v.moveVisitorTo(moves[i].location);
							}
							break;
	
						case "tix":
							{	// {"test":1, "type":"tix", "color":"TIXCOLOR.PINK", "location":{"type":"TIXLOC.PLAYER0"}}
								let tixIdx = this.tickets[moves[i].color].findIndex((t) => t === TIXLOC.BOARD);
								this.moveTix(moves[i].color, tixIdx, moves[i].location);
							}
							break;
	
						case "art":
							{	// {"test":1, "type":"art", "artType":"ARTTYPE.PHOTO", "byArtist":0, "location":{"type":"ARTLOC.SOLD", "plNum":0}}
								let art = this.art.find((a) => a.type === moves[i].artType && a.location.type === ARTLOC.PILE);
								art.moveArtTo(moves[i].location);
								art.byArtist = moves[i].byArtist;
							}
							break;
	
						case "artist":
							{	// {"test":1, "type":"artist", "color":"ARTISTCOLOR.RED", "artType":"ARTTYPE.PHOTO", "fame":14}
								let artist = this.artists.find((a) => a.type === moves[i].artType && a.color === moves[i].color);
								artist.discover();
								artist.fame = moves[i].fame;
							}
							break;
	
						case "asst":
							{	// {"test":1, "type":"asst", "player":0, "asstNum":2, "location":{"type":ASSTLOC.INTLMARKET, "artType":ARTTYPE.SKETCH, "col":0}}
								this.players[moves[i].player].assistants[moves[i].asstNum].moveAsstTo(moves[i].location)
							}
							break;
	
						case "piece":
							{	// {"test":1, "type":"piece", "player":0, "location":{"type":PLAYERLOC.ACTION, "loc":ACTIONLOC.SALES}}
								this.players[moves[i].player].movePlayerTo(moves[i].location);
							}
							break;
	
						case "reptile":
							{	// {"test":1, "type":"reptile", "tileNum":4, "location":{"type":REPTILELOC.PLAYER, "plNum":0, "bonusLoc":5}}
								this.repTiles[moves[i].tileNum].moveRepTileTo(moves[i].location);
							}
							break;
	
						case "infl":	// {"test":1, "type":"infl", "player":0, "infl":13}
							this.players[moves[i].player].influence = moves[i].infl;
							break;
						case "money":	// {"test":1, "type":"money", "player":0, "money":13}
							this.players[moves[i].player].money = moves[i].money;
							break;
	
						default:
							break;
					}
					this.moves.push(moves[i]);
				} else if (moves[i].location) {
					// moves without location are just UNDO markers
					this.processClick(moves[i]);
				}
					
			} catch (error) {
				console.log(`error processing old move:${i}`)
				console.log(error.message);
				return true;
			}
		}
		return false;
	}

	clickedEaOrNothing(clicked) {
		// for KO actions, if EA or NOTHING things are set here
		// for KO action, return false and process elsewhere
		this.setFlag(FLAG.DID_KO);
		switch (clicked) {
			case CLICKITEM.EATIX:
				this.substack.push(GAMESTATE.ENDTURN);
				this.state = GAMESTATE.EATIX_MAIN;
				this.logMsg("PLKOTIX", this.activePlayer);
				return true;
			case CLICKITEM.EABONUS:
				this.substack.push(GAMESTATE.ENDTURN);
				this.state = GAMESTATE.EABONUS_MAIN;
				this.logMsg("PLKOCBON", this.activePlayer);
				return true;
			case CLICKITEM.DONOTHING:
				this.state = GAMESTATE.ENDTURN;
				this.logMsg("PLKONONE", this.activePlayer);
				return true;
		
			default:
				// reduce infl 
				this.players[this.activePlayer].influence = this.getUsableInfl();
				// TODO log use of influence?				
				return false;
		}

	}

	processClick(move) {
		let pl = this.activePlayer;
		this.moves.push(move);
		let loc = move.location.split("-");
		let clicked = loc[0];
		let useAsst;
		let contractNum;
		let extraFame = 0;

		// TODO add log msgs
		// TODO add live scoring

		switch (this.state) {
			case GAMESTATE.KOSALES:
				//  is it an EA?
				//  is it DONOTHING?
				// this.setplayerDidKO(1);
				// clickedEaOrNothing will alter state for EATIX EABONUS and NOTHING
				// clickedEaOrNothing reduces infl (ensure it only does this once)
				//  as will happen when we show 4 more contracts
				if (!this.getFlag(FLAG.DID_KO) && this.clickedEaOrNothing(clicked)) return;
				//  must be sales action
			case GAMESTATE.SALES_MAIN:
				// this.setPlayerDidAction(1);	// if coming from KO (above) this must already be set
				this.setFlag(FLAG.DID_ACTION);
			case GAMESTATE.EABONUS_CONTRACT:
				if (clicked === CLICKITEM.ART) {
					// selling art, next get contract to use
					this.state = GAMESTATE.SALES_SELLART;
					// remember art clicked
					this.substack.push(this.art.findIndex((a) => a.type === loc[1] && a.num === Number(loc[2])));
				} else if (clicked === CLICKITEM.CONTRACT) {
					// getting contract, next get location to place it
					this.logMsg("GETSCONTRACT", this.activePlayer);
					this.state = GAMESTATE.SALES_GETCONTRACT;
					if (!this.substack.length) {
						// nothing on stack means this is not an EA
						this.substack.push(GAMESTATE.EAOREND);	
					}
					this.substack.push(Number(loc[1]));
				} else if (clicked === CLICKSPACE.DEALCONTRACTS) {
					// showing 4 more contracts, next get contract to take (or none)
					this.dealContracts();
					// this.setPlayerDealtContracts(1);
					this.setFlag(FLAG.DEALT_CONTRACTS);
					this.moves.push({plNum:this.activePlayer}); // don't allow UNDO	
					this.logMsg("DEALS4", this.activePlayer);

					// this.state unchanged
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					if (this.getFlag(FLAG.NOTHING_TURN)) {
						this.playerDidNothing();
					}
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else {
					// error
				}
				break;
			case GAMESTATE.SALES_SELLART:
				if (clicked === CLICKITEM.CONTRACT) {
					// let art = this.art[this.remember.artIndex];
					let artIdx = this.substack.pop();
					let art = this.art[artIdx];
					// this.remember.contractIndex = loc[1];
					let contractIndex = Number(loc[1]);
					this.substack.push(contractIndex);
					let salePrice = this.artists[art.byArtist].getValue();
					this.logMsg("SELLSART", this.activePlayer, art.byArtist, salePrice);
					this.players[pl].money += salePrice;
					// return signature
					let artist =  this.artists[art.byArtist];
					let sig = artist.sigTokens.find((s) => s.location === SIGLOC.ART && s.artNum === artIdx);
					sig.location = SIGLOC.ARTIST; // TODO this failed (sig undefined)
					// move art to "sold"
					art.moveArtTo({type:ARTLOC.SOLD, plNum:pl});
					// if asst on contract, send home
					this.returnContractAsst(this.contracts[contractIndex]);
					// flip contract
					this.contracts[contractIndex].faceUp = false;
					// default contract to moneyUp (for better animation)
					this.contracts[contractIndex].moneyUp = true;

					// if player has visitor in gallery, player must choose a visitor to leave with art
					if (this.visitors.findIndex((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === pl) != -1) {
						this.state = GAMESTATE.SALES_VISITOR;
					} else {
						// no visitors in gallery, player chooses sold bonus
						this.state = GAMESTATE.SALES_BONUSUP;
					}

				} else {
					// error
				}
				break;
			case GAMESTATE.SALES_VISITOR:
				{
					let contractIndex = this.substack.pop();
					// if select pink/brown visitor, that determines orientation
					// if select white visitor, get contract orientation
					// send visitor to plaza
					let visitor = this.visitors[Number(loc[1])];
					this.logMsg("VLEAVES", visitor.color);
					visitor.moveVisitorTo({type:VISITORLOC.PLAZA});

					if (visitor.color != VISITORCOLOR.WHITE) {
						if (visitor.color === VISITORCOLOR.BROWN) {
							this.contracts[contractIndex].moneyUp = true;
						} else {
							this.contracts[contractIndex].moneyUp = false;
						}
						// change state to do EA or ENDTURN
						this.EAorEndTurn();
					} else {
						// white visitor chosen, player chooses bonus
						this.substack.push(contractIndex);
						this.state = GAMESTATE.SALES_BONUSUP;
					}
				}	
				break;
			case GAMESTATE.SALES_BONUSUP:
				{
					let contractIndex = this.substack.pop();
					// can be here due to no visitors in gallery or white visitor chosen
					if (loc[1] === VISITORCOLOR.BROWN) {
						this.contracts[contractIndex].moneyUp = true;
					} else {
						this.contracts[contractIndex].moneyUp = false;
					}
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				}
				break;
			case GAMESTATE.SALES_GETCONTRACT:
				{
					let contractIndex = this.substack.pop();
					let popState = this.substack.pop();
					this.state = popState;
					let oldPileNum = this.contracts[contractIndex].location.num;
					// choose contract location, possibly get tix
					if (clicked === CLICKITEM.CONTRACT) {
						// contract replacing a contract, no tix
						// send asst home, if any
						this.returnContractAsst(this.contracts[loc[1]]);
						// move new contract to spot of old contract
						this.contracts[contractIndex].moveContractTo({type:CONTRACTLOC.PLAYER, plNum:this.activePlayer, num:this.contracts[loc[1]].location.num});
						// discard old contract
						this.contracts[loc[1]].moveContractTo({type:CONTRACTLOC.DISCARD});
					} else if (clicked === CLICKSPACE.CONTRACT) {
						// contract on empty space, get tix
						// move contract to player board
						this.contracts[contractIndex].moveContractTo({type:CONTRACTLOC.PLAYER, plNum:this.activePlayer, num:Number(loc[1])});

						// get tix (if not a choice)
						if (loc[1] === '2') {
							this.substack.push(popState);
							// user will need to select tix color (any color)
							this.substack.push(Object.values(TIXCOLOR));
							this.state = GAMESTATE.SALES_GETTIX;
						} else {
							// user gets brown or pink (bassed on location chosen)
							this.playerGetsTix(pl, loc[1]==='0' ? TIXCOLOR.BROWN : TIXCOLOR.PINK);
						}
					} else {
						// error
					}
					// TODO different stuff for 4 vs 8 piles
					// renumber pile contract came from
					if (this.options.numContractPiles === 4) {
						let oldPile = this.contracts.filter((c) => c.location.type === CONTRACTLOC.DEALT && c.location.num === oldPileNum);
						for (let i=0; i < oldPile.length; i++) {
							// since user always chooses pos=0, sub 1 from every pos
							oldPile[i].location.pos--;
						}
					} else {
						// 8 piles
						// if take from pos 0-3, slide everything down (7 will be empty)
						// if take from pos 4-7, discard 0-3 and slide everything down (3-7 empty)
						if (oldPileNum > 3) {
							// discard 0-3
							for (let pile=0; pile < 4; pile++) {
								let contract = this.contracts.find((c) => c.location.type === CONTRACTLOC.DEALT && c.location.num === pile);
								if (contract) {
									contract.moveContractTo({type:CONTRACTLOC.DISCARD});
								}
							}
						}
						let nextEmpty = -1;
						for (let pile=0; pile < 8; pile++) {
							let contract = this.contracts.find((c) => c.location.type === CONTRACTLOC.DEALT && c.location.num === pile);
							if (contract) {
								// there is a contract in this position
								if (pile > nextEmpty && nextEmpty != -1) {
									// contract needs to move down
									contract.moveContractTo({type:CONTRACTLOC.DEALT, num:nextEmpty, pos:0});
									nextEmpty++;
								}
							} else {
								// no contract here
								// if this is first empty space, set nextEmpty to it
								if (nextEmpty === -1) {
									nextEmpty = pile;
								}
							}
						}
					}

					let numPilesNeedContracts = this.pileNeedsContract().filter((i) => i).length;
					// this.setNeedContractsDealt(numPilesNeedContracts ? 1 : 0);
					// if contract pile empty, deal new contract
					if (numPilesNeedContracts) {
						this.setFlag(FLAG.UPDATE_CONTRACTS);
					} else {
						this.clearFlag(FLAG.UPDATE_CONTRACTS);
					}
				}
				break;

			case GAMESTATE.KOART:
				//  is it an EA?
				//  is it DONOTHING?
				// clickedEaOrNothing will alter state for EATIX EABONUS and NOTHING
				if (this.clickedEaOrNothing(clicked)) return;
				// must be art action
			case GAMESTATE.ART_MAIN:
				// this.setPlayerDidAction(1);
				this.setFlag(FLAG.DID_ACTION);

				// all clicks are artists
				// determine if it was to buy or to discover
				let clickedArtistIdx = this.artists.findIndex((a) => (a.type === loc[2] && a.color === loc[1]));
				let clickedArtist = this.artists[clickedArtistIdx];
				if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					if (this.getFlag(FLAG.NOTHING_TURN)) {
						this.playerDidNothing();
					}
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else if (clickedArtist.discovered) {
					// buy art
					let artworkIdx = this.art.findIndex((a) => a.type === loc[2] && a.location.type === ARTLOC.PILETOP);
					// get cost (different for commission)
					let price = clickedArtist.fame;
					let commArtist = this.playerHasCommission();
					if (commArtist === clickedArtist) {
						price = commArtist.initFame;
					}
					this.logMsg("BUYSART", this.activePlayer, clickedArtistIdx, price);
					this.substack.push(artworkIdx);			// needed for moving art
					this.substack.push(GAMESTATE.ART_BUY);	// state after both decrease price and incr fame
					this.substack.push(clickedArtistIdx);	// needed for incr fame using influence
					this.substack.push(GAMESTATE.INCRFAME);
					this.substack.push(price);				// needed for dec price using influence
					// get discounts from infl
					this.state = GAMESTATE.DECRPRICE;
					// pay for art (done after DECRPRICE)
					// increase artist fame (done at end of DECRPRICE)
					// addl fame from infl (done during INCRFAME)
					// visitors to plaza (done during INCRFAME)
					// get tix from art (done during INCRFAME)
					// move to gallery (possible reptile) (done during INCRFAME)
					// get sig (done during INCRFAME)
					// new art gets visitors (done during EAOREND)
				} else {
					// discover artist
					this.logMsg("DISCOVERS", this.activePlayer,clickedArtistIdx);
					// if red artist, move white visitor to plaza
					if (clickedArtist.color === ARTISTCOLOR.RED) {
						let artVisitor = this.visitors.find((v) => v.location.type === VISITORLOC.ARTIST && v.location.artType === clickedArtist.type);
						if (artVisitor) {
							artVisitor.moveVisitorTo({type:VISITORLOC.PLAZA});
						} else {
							// TODO error
						}
					}
					// flip artist and initialize
					clickedArtist.discover();
					// move sig to player
					clickedArtist.moveSigToken({location:SIGLOC.COMMISSION, plNum:this.activePlayer}, 0);
					// gain bonus
					this.state = GAMESTATE.EAOREND;
					switch (clickedArtist.bonus) {
						case BONUSTYPE.INFLUENCE:
							// get influence bonus
							{
								let bonus = this.bonusInfluence();
								this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addInfluence(bonus);	
							}
							break;
						case BONUSTYPE.MONEY:
							// get money bonus
							{
								let bonus = this.bonusMoney();
								this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addMoney(bonus);
							}
							break;
						case BONUSTYPE.FAME:
							// have player choose an artist for fame increase
							this.substack.push(this.state);
							this.logMsg("RCVSFAME",this.activePlayer);
							this.state = GAMESTATE.FAMEARTIST;
							break;
						case BONUSTYPE.TWOTIX:
							this.substack.push(this.state);
							// get player choice of one any color tix
							this.substack.push(Object.values(TIXCOLOR));
							this.state = GAMESTATE.TWOCHOICE;
							break;
						case BONUSTYPE.PLAZAVISITOR:
							this.substack.push(this.state);
							let vList = this.pickVisitor(VISITORLOC.PLAZA);
							this.substack.push(vList);
							// state to process selected visitor
							this.state = GAMESTATE.VISITOR2GALLERY;
							break;
					
						default:
							break;
					}
				}

				break;
			case GAMESTATE.KOMEDIA:
				//  is it an EA?
				//  is it DONOTHING?
				// clickedEaOrNothing will alter state for EATIX EABONUS and NOTHING
				if (this.clickedEaOrNothing(clicked)) return;
				// must be media action
			case GAMESTATE.MEDIA_MAIN:
				// this.setPlayerDidAction(1);
				this.setFlag(FLAG.DID_ACTION);
				if (clicked === CLICKITEM.THUMB) {
					// pay influence
					let thumbLevel = Number(loc[1]) + 1;
					this.logMsg("DOESTHUMB", this.activePlayer, thumbLevel);
					this.players[this.activePlayer].addInfluence( -thumbLevel);
					// next state will be to select an artist (unless a player choice comes before)
					// and the state after will be EAOREND
					this.substack.push(GAMESTATE.EAOREND);
					this.substack.push(thumbLevel); 
					this.state = GAMESTATE.THUMBARTIST;

					// rx bonus
					switch (thumbLevel) {
						case 1:
							// one tix
							// push state to stack
							this.substack.push(this.state);
							// get player choice of one any color tix
							this.substack.push(Object.values(TIXCOLOR));
							this.state = GAMESTATE.TIXCHOICE;
							break;
						case 2:
							// infl
							{
								let bonus = this.bonusInfluence();
								this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORPROMO");
								this.players[this.activePlayer].addInfluence(bonus);	
							}
							break;
						case 3:
							// two tix
							// push state to stack
							this.substack.push(this.state);
							// get player choice of one any color tix
							this.substack.push(Object.values(TIXCOLOR));
							this.state = GAMESTATE.TWOCHOICE;
							break;
						case 4:
							// money
							{
								let bonus = this.bonusMoney();
								this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORPROMO");
								this.players[this.activePlayer].addMoney(bonus);
							}
							break;
						case 5:
							// visitor from plaza
							// push state to stack
							this.substack.push(this.state);
							{
								// if none in plaza, will fall back to bag
								let vList = this.pickVisitor(VISITORLOC.PLAZA);
								this.substack.push(vList);
							}
							// state to process selected visitor
							this.state = GAMESTATE.VISITOR2GALLERY;
							break;
						default:
							// TODO error
							break;
					}

				// } else if (clicked === CLICKITEM.ASSISTANT) {
				} else if (clicked === CLICKITEM.HIREASST) {
					{
						// hiring assistant(s)
						const hireCost = [0,0,1,2,2,3,3,4,5,6];
						let totalCost = 0;
						let asstNum = this.getUnemployed().num;
						for (let i=0; i < Number(loc[1]); i++) {
							totalCost += hireCost[asstNum];
							asstNum++;
						}
						// after paying, player will get assts/bonuses using hireAsst
						// note: we never go into MEDIA_ASSTS state. It is used to determine where to go after DECRPRICE
						this.substack.push(Number(loc[1]));
						this.substack.push(GAMESTATE.MEDIA_ASSTS);
						// go to DECRRICE state
						this.substack.push(totalCost);
						this.state = GAMESTATE.DECRPRICE;
					}
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					if (this.getFlag(FLAG.NOTHING_TURN)) {
						this.playerDidNothing();
					}
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				}

				break;
			case GAMESTATE.KOMARKET:
				//  is it an EA?
				//  is it DONOTHING?
				// clickedEaOrNothing will alter state for EATIX EABONUS and NOTHING
				if (this.clickedEaOrNothing(clicked)) return;
				// must be market action
			case GAMESTATE.MARKET_MAIN:
				// this.setPlayerDidAction(1);
				this.setFlag(FLAG.DID_ACTION);

				if (clicked === CLICKITEM.REPTILE) {
					let repTile = this.repTiles[Number(loc[1])];
					// gain infl for col
					let column = repTile.location.col;
					this.logMsg("RCVSINFL", this.activePlayer, MARKETCOL2INFL[column], "FORCOL");
					this.logMsg("GETSTILE", this.activePlayer, repTile.tNum);
					this.players[this.activePlayer].addInfluence(MARKETCOL2INFL[column]);

					// move visitor from lobby to plaza (requires player choice)
					// note: player must have visitor in lobby to do MARKET action 
					this.substack.push(GAMESTATE.VISITOR2PLAZA);

					// place repTile, gain bonus (requires player choice)
					this.substack.push(Number(loc[1]));
					this.substack.push(GAMESTATE.PLACEREPTILE);

					// choose asst and move to space
					let artType = repTile.location.artType;
					this.substack.push({type:ASSTLOC.INTLMARKET, artType:artType, col:(3 - MARKETCOL2INFL[column])});
					this.state = GAMESTATE.MARKET_ASST;
					
				} else if (clicked === CLICKSPACE.AUCTION) {
					let row = Number(loc[1]);
					let column = Number(loc[2]);
					this.logMsg("RCVSINFL", this.activePlayer, 3-column, "FORCOL");
					// gain infl for col
					this.players[this.activePlayer].addInfluence(3-column);

					this.substack.push(GAMESTATE.EAOREND);
					// gain bonus (do this last)
					const bonuses = [
						[BONUSTYPE.ONETIX, BONUSTYPE.ASSISTANT, BONUSTYPE.TWOTIX],
						[BONUSTYPE.ASSISTANT, BONUSTYPE.INFLUENCE, BONUSTYPE.MONEY],
						[BONUSTYPE.PLAZAVISITOR, BONUSTYPE.MONEY, BONUSTYPE.INFLUENCE]];
					this.substack.push(bonuses[row][column]);
					this.substack.push(GAMESTATE.AUCTION_BONUS);

					// move asst to space
					this.substack.push({type:ASSTLOC.AUCTION, row:row, col:column});
					this.substack.push(GAMESTATE.MARKET_ASST);

					// pay cost (may use infl)
					let cost = row===0 ? 1 : row*3;
					this.logMsg("PLACEAUCTION",this.activePlayer, cost);
					this.substack.push(cost); 
					this.state = GAMESTATE.DECRPRICE;
					
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					if (this.getFlag(FLAG.NOTHING_TURN)) {
						this.playerDidNothing();
					}
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else {
					// TODO error
				}
				break;
			case GAMESTATE.MARKET_ASST:
				// asst chosen, move to correct location
				useAsst = this.players[this.activePlayer].assistants[loc[2]];
				useAsst.moveAsstTo(this.substack.pop()); // note: assistant moveTo clones "to location"

				// goto state on stack
				this.state = this.substack.pop();

				if (this.state != GAMESTATE.AUCTION_BONUS) break;
			// case GAMESTATE.AUCTION_BONUS:	// NOTE: this state is only used temporarily
				switch (this.substack.pop()) {
					case BONUSTYPE.INFLUENCE:
						// get influence bonus
						{
							let bonus = this.bonusInfluence();
							this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORBONUS");
							this.players[this.activePlayer].addInfluence(bonus);	
						}
						this.state = this.substack.pop();				
						break;
					case BONUSTYPE.MONEY:
						// get money bonus
						{
							let bonus = this.bonusMoney();
							this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
							this.players[this.activePlayer].addMoney(bonus);
						}
						this.state = this.substack.pop();				
						break;
					case BONUSTYPE.ASSISTANT:
						this.state = this.substack.pop();				
						this.hireAsst(); // may change state
						break;
					case BONUSTYPE.ONETIX:
						// get player choice of one any color tix
						this.substack.push(Object.values(TIXCOLOR));
						this.state = GAMESTATE.TIXCHOICE;
						break;
					case BONUSTYPE.TWOTIX:
						// get player choice of one any color tix
						this.substack.push(Object.values(TIXCOLOR));
						this.state = GAMESTATE.TWOCHOICE;
						break;
					case BONUSTYPE.PLAZAVISITOR:
						let vList = this.pickVisitor(VISITORLOC.PLAZA);
						this.substack.push(vList);
						// state to process selected visitor
						this.state = GAMESTATE.VISITOR2GALLERY;
						
						break;
				
					default:
						// TODO error
						break;
				}
				break;
			case GAMESTATE.EATIX_MAIN:
				{
					this.setFlag(FLAG.DID_EA);
					if (clicked === CLICKITEM.VISITOR) {
						// discard a ticket
						// this.setPlayerDidEA(1);
						let vColor = this.visitors[Number(loc[1])].color;
						let tixNum = this.tickets[vColor].indexOf("player" + this.activePlayer);
						this.moveTix(vColor, tixNum, TIXLOC.DISCARD);
						// move clicked visitor toward player gallery
						if (this.visitors[Number(loc[1])].location.type === VISITORLOC.LOBBY) {
							if (this.visitors[Number(loc[1])].location.plNum === this.activePlayer) {
								// player's own lobby, move to gallery
								this.logMsg("USESTIX", this.activePlayer, vColor, "PLGALLERY");
								this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.GALLERY, plNum:this.activePlayer, playerColor:this.activeColor()});

							} else {
								// other player's lobby, move to plaza
								this.logMsg("USESTIX", this.activePlayer, vColor, "PLAZA");
								let fromPlayer = this.visitors[Number(loc[1])].location.plNum;
								this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.PLAZA});
							}
						} else {
							// move to player's lobby from plaza
							this.logMsg("USESTIX", this.activePlayer, vColor, "PLLOBBY");
							this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.LOBBY, plNum:this.activePlayer, playerColor:this.activeColor()});
						}

					} else if (clicked === CLICKITEM.DONOTHING) {
						let fromState = this.substack.pop();
						// EAtix is either EA before/after normal turn OR EA as KO
						if (fromState === GAMESTATE.PICKACTION) {
							// must be before normal action
							this.state = GAMESTATE.PICKACTION;
						} else {
							// must be after action OR EA as KO
							this.state = GAMESTATE.ENDTURN;
						}

					} else {
						// TODO error
					}
					
					
				}
				break;
			case GAMESTATE.EABONUS_ASST:
			case GAMESTATE.EABONUS_MAIN:
				// this.setPlayerDidEA(1);
				this.setFlag(FLAG.DID_EA);
	
				// contract selected (for bonus)
				// did player select asst already (EABONUS_ASST) OR
				// asst at desk OR
				// asst in KO space OR
				// only one asst on board use one automatically
				// if none of the above, it must be multiple on board
				// give player choice of them
				if (clicked === CLICKITEM.CONTRACT) {
					// not coming from state===EABONUS_ASST
					// check for assts at desk
					// useAsst = this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.DESK);
					// contractNum = loc[1];
	
					// if (!useAsst) {
					// 	// no asst at desk, check KO locations
					// 	useAsst = this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.KO);
					// 	if (!useAsst) {
					// 		// no asst in KO position, check action locations
					// 		let plAssts = this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.ACTION);					
					// 		if (plAssts.length === 1) {
					// 			// only one asst avail and on an action loc
					// 			useAsst = plAssts[0];
					// 		} else {
								// need to remember contract that was selected
								this.substack.push(Number(loc[1]));
								// get asst choice from player
								this.state = GAMESTATE.EABONUS_ASST;
								return;
					// 		}
					// 	} 
					// }
				} else {
					// must be asst
					useAsst = this.players[this.activePlayer].assistants[loc[2]];
					contractNum = this.substack.pop();
				}

				// move asst to contract
				this.logMsg("ASST2", this.activePlayer, "SENTCONT");
				useAsst.moveAsstTo({type:ASSTLOC.CONTRACTBONUS, num:contractNum});

				// do bonus (or change to state that will)
				// NOTE: bonuses are optional meaning you don't have to use them
				// the only case I can think of where it MIGHT make sense is you place
				// and asst on a CONTRACT bonus, even though you can't or don't want contract OR
				// use get ASST but you don't want it OR
				// use one of the get visitor bonuses even though there is none to get because
				// you would otherwise not have desk space for all assts
				let vList;
				if (this.contracts[contractNum].faceUp) {
					switch (this.contracts[contractNum].bonusType) {
						case CONTRACTBONUS.CONTRACT:
							// since this is an EA, we already have return state info on stack (PICKACTION/EAOREND/KOEA)
							// get a new contract, if possible
							this.logMsg("RCVSCONT",this.activePlayer)
							this.state = GAMESTATE.EABONUS_CONTRACT; 
							break;
						case CONTRACTBONUS.ASSISTANT:
							// get next asst (might trigger other tix sel sub)
							this.state = this.substack.pop();
							this.hireAsst(); // may change state
							break;
						case CONTRACTBONUS.PLAZAPINKBROWN:
							// state to go to after is already on stack
							
							// get choice of plaza pink or brown visitor
							// NOTE: if neither exists, player can choose pink/brown from bag
							vList = this.pickVisitor(VISITORLOC.PLAZA, [VISITORCOLOR.PINK, VISITORCOLOR.BROWN]);
							this.substack.push(vList);
							// state to process selected visitor
							this.state = GAMESTATE.VISITOR2GALLERY;
							break;
						case CONTRACTBONUS.BAG:
							// state to go to after is already on stack
	
							// get choice of visitor from bag
							vList = this.pickVisitor(VISITORLOC.BAG);
							this.substack.push(vList);
							// state to process selected visitor
							this.state = GAMESTATE.VISITOR2GALLERY;
							break;
						case CONTRACTBONUS.INFLUENCE:
							// get influence bonus
							{
								let bonus = this.bonusInfluence();
								this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addInfluence(bonus);	
							}
							this.state = this.substack.pop();
							break;
						case CONTRACTBONUS.MONEY:
							// get money bonus
							{
								let bonus = this.bonusMoney();
								this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addMoney(bonus);
							}
							this.state = this.substack.pop();
							break;
					
						default:
							// error TODO
							break;
					}
				} else {
					// back of contract bonus TODO
					if (this.contracts[contractNum].moneyUp) {
						let bonus = this.bonusMoney();
						this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
						this.players[this.activePlayer].addMoney(bonus);

					} else {
						let bonus = this.bonusInfluence();
						this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORBONUS");
						this.players[this.activePlayer].addInfluence(bonus);	

					}
					this.state = this.substack.pop();
				}

				break;

			case GAMESTATE.TWOCHOICE:
				// give selected tix to player
				this.playerGetsTix(pl, loc[1]);
				// remove ticket color from further choice
				{
					// NOTE this could be done in many ways as choice is always from all 3 colors here
					let colorList = this.substack.pop().filter((col) => col != loc[1]);
					this.substack.push(colorList);
				}
				// get next choice
				this.state = GAMESTATE.TIXCHOICE;
				break;
			case GAMESTATE.SALES_GETTIX:
			case GAMESTATE.TIXCHOICE:
				// give selected tix to player
				this.playerGetsTix(pl, loc[1]);

				// remove tix choice from substack
				this.substack.pop();

				// new state is state stored on substack
				this.state = this.substack.pop();

				break;
			case GAMESTATE.VISITOR2GALLERY:
				// clicked either visitor or DONOTHING
				if (clicked === CLICKITEM.VISITOR) {
					// move selected a visitor to gallery
					let visitor = this.visitors[Number(loc[1])];
					this.logMsg("GETVISITOR",this.activePlayer,visitor.color);
					visitor.moveVisitorTo({type:VISITORLOC.GALLERY, plNum:this.activePlayer, playerColor:this.activeColor()});
					// check if bag empty
					if (!this.getFlag(FLAG.BAG_EMPTY)) {
						if (this.bagEmpty()) {
							this.setFlag(FLAG.BAG_EMPTY);
							// TODO add msg
							this.checkEndGame();
						}
					}
				} else if (clicked === CLICKITEM.DONOTHING) {
					// nothing to do
				} else {
					// error
					console.log("unknown click in state VISITOR2GALLERY");
				}

				// remove visitor list from stack (it was used, not popped, in getActiveSpaces)
				this.substack.pop();
				// go to state on stack
				this.state = this.substack.pop();
				break;
			case GAMESTATE.PLACEREPTILE:
				// clicked a reptile space or DONOTHING (no spaces available)
				if (clicked === CLICKSPACE.REPTILE) {
					// move reptile and collect bonus
					let repTileNum = this.substack.pop();

					let bonusNum = Number(loc[1]);
					this.logMsg("PLACESTILE", this.activePlayer, this.repTiles[repTileNum].tNum);
					this.repTiles[repTileNum].moveRepTileTo({type:REPTILELOC.PLAYER, plNum:this.activePlayer, bonusLoc:bonusNum});

					switch (bonusNum) {
						case 0:
							// gain infl
							{
								let bonus = this.bonusInfluence();
								this.logMsg("RCVSINFL",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addInfluence(bonus);	
							}
							this.state = this.substack.pop();
							break;
						case 1:
							// gain money
							{
								let bonus = this.bonusMoney();
								this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addMoney(bonus);	
							}
							this.state = this.substack.pop();
							break;
						case 2:
							// any artist gains fame
							this.state = GAMESTATE.FAMEARTIST;
							this.logMsg("RCVSFAME",this.activePlayer);
							break;
						case 3:
							// get any visitor from plaza
							let vList = this.pickVisitor(VISITORLOC.PLAZA);
							this.substack.push(vList);
							// state to process selected visitor
							this.state = GAMESTATE.VISITOR2GALLERY;
							break;
						case 4:
							// get two diff tix
							this.substack.push(Object.values(TIXCOLOR));
							this.state = GAMESTATE.TWOCHOICE;
							break;
						case 5:
							// get free asst
							this.state = this.substack.pop();
							this.hireAsst(); // may change state							
							break;
					
						default:
							break;
					}
				}

				break;
			case GAMESTATE.VISITOR2PLAZA:
				if (clicked === CLICKITEM.VISITOR) {
					// move chosen visitor to plaza
					let visitor = this.visitors[Number(loc[1])];
					this.logMsg("VLEAVES",visitor.color);
					visitor.moveVisitorTo({type:VISITORLOC.PLAZA});
					// done with action
					this.state = GAMESTATE.EAOREND;
				} else {
					// TODO error
				}

				break;
			case GAMESTATE.DECRPRICE:
				// either used infl to reduce price or done
				if (clicked === CLICKITEM.CONTINUE) {
					let price = this.substack.pop();
					// spend price
					if (price > this.players[this.activePlayer].money) {
						// TODO ERROR getActiveSpaces doesn't allow this
					} else {
						// pay price
						this.players[this.activePlayer].addMoney(-price);
						// go to state on stack
						this.state = this.substack.pop();
						if (this.state === GAMESTATE.INCRFAME) {
							// only get here by buying art
							// we just paid for art, now incr fame based on art/white visitors
							let artist = this.artists[this.substackEnd()];
							if (artist.fame < 19) {
								// note: can buy from celebrity but only as commission but fame already maxed
								let art = this.art[this.substack[this.substack.length-3]];
								let playerNumWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
								artist.fame += art.fameBonus.fixed + art.fameBonus.perWhite * playerNumWhite;
								if (artist.fame >= 19) {
									artist.fame = 19;
									this.playerMadeCelebrity(this.substackEnd());
								}
							}
						} else if (this.state === GAMESTATE.MEDIA_ASSTS) {
							// came from hire assistants
							this.state = GAMESTATE.EAOREND; // next state unless subroutine for onetix
							let num2hire = this.substack.pop();
							for (let i=0; i < num2hire; i++) {
								this.hireAsst();	// move next asst to desk and get bonus
							}
						}
					}
				} else if (clicked === CLICKSPACE.INFLUENCE) {
					// reduce infl to next mark
					let infl = this.players[this.activePlayer].influence;
					this.logMsg("USESINFL4M",this.activePlayer);
					this.players[this.activePlayer].addInfluence(this.inflNextMark(infl) - infl);
					// reduce price by 1 (note: we only send INFL space if price>0 and we check incoming msgs vs sent)
					this.substack[this.substack.length-1]--;
				} else {
					// error TODO
				}
				break;
			case GAMESTATE.INCRFAME:
				// either used infl to increase fame or done
				if (clicked === CLICKITEM.CONTINUE) {
					// pop artist idx
					let artistIdx = this.substack.pop();
					let artist = this.artists[artistIdx];
					// we could be here from player buying art, disc artist bonus, reptile bonus
					let fromState = this.substack.pop();
					if (fromState === GAMESTATE.ART_BUY) {
						// art is paid and artist fame is increased
						// this.setArtWasBought(1);
						this.setFlag(FLAG.ART_BOUGHT);
						let artworkIdx = this.substack.pop();
						let art = this.art[artworkIdx];
						// move visitors to plaza
						let visitorsOnArt = this.visitors.filter((v) => v.location.type === VISITORLOC.ART && v.location.artType === art.type);
						for (let v of visitorsOnArt) {
							v.moveVisitorTo({type:VISITORLOC.PLAZA});
						}
						// if player will get reptile (from 3rd art), go to that state next (maybe, see tix bonus)
						let plRepTileIdx = this.playerRepTileDisplayIdx();
						if (this.playerHasDisplayed().length === 2 && plRepTileIdx != -1) {
							if (this.visitors.find((v) => v.location.type === VISITORLOC.LOBBY && v.location.plNum === this.activePlayer)) {
								this.substack.push(GAMESTATE.VISITOR2PLAZA);
							} else {
								this.substack.push(GAMESTATE.EAOREND);
							}
							this.logMsg("GETSTILE", this.activePlayer, this.repTiles[plRepTileIdx].tNum);

							this.substack.push(plRepTileIdx);
							this.state = GAMESTATE.PLACEREPTILE;
						} else {
							this.state = GAMESTATE.EAOREND;
						}
						// move art to gallery
						art.moveArtTo({type:ARTLOC.DISPLAY, plNum:this.activePlayer});
						// set which artist produced art
						art.byArtist = artistIdx;
						// this.logMsg("GETSART", this.activePlayer, art.type, artistIdx);
						// move sig to art
						// if player has commission, use that token
						let sigIdx = artist.sigTokens.findIndex((st) => st.location === SIGLOC.COMMISSION && st.plNum === this.activePlayer);
						// if player did not have commsission, get artist token
						if (sigIdx != -1) this.logMsg("USEDCOMM", this.activePlayer);
						if (sigIdx === -1) sigIdx = artist.sigTokens.findIndex((st) => st.location === SIGLOC.ARTIST);
						if (sigIdx != -1) {
							artist.moveSigToken({location:SIGLOC.ART, artNum:artworkIdx}, sigIdx);
						} else {
							// TODO error
						}
						// get tix due to art (may need player interaction)
						for (let tBonus of art.tixBonus) {
							// while there can be multiple bonus tix, there will be a max one that needs choosing
							switch (tBonus) {
								case BONUSTYPE.PINKTIX:
									this.playerGetsTix(this.activePlayer, TIXCOLOR.PINK);
									break;
								case BONUSTYPE.BROWNTIX:
									this.playerGetsTix(this.activePlayer, TIXCOLOR.BROWN);
									break;
								case BONUSTYPE.ONETIX:
									// push either PLACEREPTILE or EAOREND state
									this.substack.push(this.state);
									// get player choice of one any color tix
									this.substack.push(Object.values(TIXCOLOR));
									this.state = GAMESTATE.TIXCHOICE;
									break;
								case BONUSTYPE.PINKWHITE:
									// push either PLACEREPTILE or EAOREND state
									this.substack.push(this.state);
									// get player choice of either PINK or WHITE tix
									this.substack.push([TIXCOLOR.PINK, TIXCOLOR.WHITE]);
									this.state = GAMESTATE.TIXCHOICE;
									break;
								case BONUSTYPE.BROWNWHITE:
									// push either PLACEREPTILE or EAOREND state
									this.substack.push(this.state);
									// get player choice of either BROWN or WHITE tix
									this.substack.push([TIXCOLOR.BROWN, TIXCOLOR.WHITE]);
									this.state = GAMESTATE.TIXCHOICE;
									break;
								case BONUSTYPE.TWOTIX:
									// push either PLACEREPTILE or EAOREND state
									this.substack.push(this.state);
									// get player choice of one any color tix
									this.substack.push(Object.values(TIXCOLOR));
									this.state = GAMESTATE.TWOCHOICE;
									// after selection, it removes chosen one and goes to TIXCHOICE
									
									break;
							
								default:
									// error TODO
									break;
							}
						}
						// (after done) show new art and add visitors
					} else {
						// go to state on stack
						this.state = fromState;
					}
				} else if (clicked === CLICKSPACE.INFLUENCE) {
					// reduce infl to next mod 5 space
					let infl = this.players[this.activePlayer].influence;
					this.logMsg("USESINFL4F",this.activePlayer);
					this.players[this.activePlayer].addInfluence(-this.infl2Next5(infl));
					// incr artist fame
					if (this.artists[this.substackEnd()].increaseFame()) {
						// if artist fame now 19 then celebrity, player gets 5
						this.playerMadeCelebrity(this.substackEnd());
					}
				} else {
					// error TODO
				}
				break;
			case GAMESTATE.THUMBARTIST:
				extraFame = 1;
				{
					let thumbLevel = this.substack.pop(); // get new thumblevel from stack (1-5)
					let thumbLevelIdx = thumbLevel - 1; (0-4)
					let artistIdx = this.artists.findIndex((artist) => artist.color === loc[1] && artist.type === loc[2]); // clicked artist index
					let artist = this.artists[artistIdx]; // clicked artist
					// see if there's a thumb on artist already
					let thumbIndex = -1;
					// don't check for previous level unless new thumb is 2 or more (there is no physical 0 thumb)
					if (thumbLevelIdx) thumbIndex = this.thumbs[thumbLevelIdx-1].findIndex((thumb) => thumb.color && thumb.color === artist.color && thumb.artType === artist.type);
					if (thumbIndex != -1) {
						// remove old thumb
						this.thumbs[thumbLevelIdx-1][thumbIndex] = {};
					}
					// add new thumb to artist
					thumbIndex = this.thumbs[thumbLevelIdx].findIndex((t) => !t.color); // unused thumb of correct level
					this.thumbs[thumbLevelIdx][thumbIndex] = {color:artist.color, artType:artist.type};
					// update artist thumb level
					artist.thumb = thumbLevel;
					this.logMsg("THUMBSUP", this.activePlayer, artistIdx, thumbLevel);
				}

			case GAMESTATE.FAMEARTIST:
				if (clicked === CLICKITEM.ARTIST) {
					// increase this artist's fame
					let artistIdx = this.artists.findIndex((a) => a.color === loc[1] && a.type === loc[2]);
					let artist = this.artists[artistIdx];
					// note following is slightly different from buying art as there is no art bonus fame
					if (artist.fame < 19) {
						// note: can buy from celebrity but only as commission but fame already maxed
						let playerNumWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
						artist.fame += extraFame + playerNumWhite;	// extraFame only set by THUMBARTIST state
						this.logMsg("INCRFAME", this.activePlayer, artistIdx, Math.min(artist.fame, 19));
						if (artist.fame >= 19) {
							artist.fame = 19;
							this.playerMadeCelebrity(artistIdx);
						}
					}
					this.state = GAMESTATE.INCRFAME;
					this.substack.push(artistIdx);
				} else if (clicked = CLICKITEM.DONOTHING) {
						// go to state on stack
						this.state = this.substack.pop();
				} else {
					// TODO error
				}
				break;
			case GAMESTATE.ENDTURN:
				if (clicked === CLICKITEM.ENDBUTTON) {
					// finalize turn and go to next player
					this.endTurnRefill();
					this.nextPlayer();
				} else {
					// error
				}
				break;
			case GAMESTATE.EAOREND:
				switch (clicked) {
					case CLICKITEM.EATIX:
						this.substack.push(GAMESTATE.ENDTURN);
						this.state = GAMESTATE.EATIX_MAIN;
						break;
					case CLICKITEM.EABONUS:
						// this.setPlayerDealtContracts(0);
						this.clearFlag(FLAG.DEALT_CONTRACTS);
						this.substack.push(GAMESTATE.ENDTURN);
						this.state = GAMESTATE.EABONUS_MAIN;
						break;
					case CLICKITEM.DONOTHING:
						this.logMsg("PLEANONE", this.activePlayer);
						this.state = GAMESTATE.ENDTURN;
						break;
						
					// this case only if artWasBought or needContractsDealt
					case CLICKITEM.CONTINUE:
						this.endTurnRefill();
						// if (this.getFlag(FLAG.ART_BOUGHT)) {
						// 	// show new art and visitors
						// 	for (let artType of Object.values(ARTTYPE)) {
						// 		if (this.art.find((art) => art.location.type === ARTLOC.PILETOP && art.type === artType)) {
						// 			// pile has top, do nothing
						// 		} else {
						// 			// pile has no top, make one
						// 			let artTop = this.chooseArtPileTop(artType);
						// 			if (artTop) {
						// 				// a new piletop was selected, add visitors
						// 				this.visitorsToArt(artTop, artType);
						// 			}
						// 		}
						// 	}
						// 	// this.setArtWasBought(0);
						// 	this.clearFlag(FLAG.ART_BOUGHT);
						// 	this.moves.push({plNum:this.activePlayer}); // don't allow UNDO
						// 	// state stays same
						// } else if (this.getFlag(FLAG.UPDATE_CONTRACTS)) {
						// 	// deal new contracts
						// 	this.dealContracts(true);
						// 	// this.setNeedContractsDealt(0);
						// 	this.clearFlag(FLAG.UPDATE_CONTRACTS);
						// 	this.moves.push({plNum:this.activePlayer}); // don't allow UNDO
						// 	// state stays same
						// } else {
						// 	// TODO error
						// }
						break;

					// this case only occurs in EAOREND
					case CLICKITEM.ENDBUTTON:
						// finalize turn and go to next player
						this.endTurnRefill();
						this.nextPlayer();
						break;

					default:
						break;
				}
				break;
			case GAMESTATE.PICKACTION:
				{
					if (clicked == CLICKITEM.CONTINUE) {
						this.endTurnRefill();
						return;
					} else if (clicked === CLICKITEM.EATIX) {
						this.substack.push(GAMESTATE.PICKACTION);
						this.logMsg("PLEATIX", this.activePlayer);
						this.state = GAMESTATE.EATIX_MAIN;
						// TODO more logging
						return;
					} else if (clicked === CLICKITEM.EABONUS) {
						this.substack.push(GAMESTATE.PICKACTION);
						this.logMsg("PLEACBON", this.activePlayer);
						this.state = GAMESTATE.EABONUS_MAIN;
						return;
					}
					this.logMsg("PLTO", this.activePlayer, loc[1]);
					let asstMoved = false;
					// is there a piece on that location? if so, move to ko
					let locPiece = this.players.find((p) => p.location.loc === loc[1]);
					if (locPiece) {
						// another player piece on location being moved to
						//  if FINAL_ROUND, send home
						if (this.getFlag(FLAG.FINAL_ROUND)) {
							locPiece.movePlayerTo({type:PLAYERLOC.HOME});
						} else {
							// move it to ko
							locPiece.movePlayerTo({type:PLAYERLOC.KO, loc:locPiece.location.loc});
							this.logMsg("PLKOED", this.players.findIndex((p) => p.location.loc === loc[1]));
						}
					} else {
						// check if any assistants on location and move them to ko
						for (let plNum = 0; plNum < this.numPlayers; plNum++) {
							locPiece = this.players[plNum].assistants.find((a) => a.location.type === ASSTLOC.ACTION && a.location.loc === loc[1]);
							if (locPiece) {
								if (plNum === pl && this.players[pl].location.type != PLAYERLOC.HOME) {
									// player's own asst on move to location
									// player not coming from home
									// move asst to old location
									locPiece.moveAsstTo(this.players[pl].location);
									// locPiece.location = Object.assign({}, this.players[pl].location); 
									asstMoved = true;
								} else {
									// if FINAL_ROUND, send home
									if (this.getFlag(FLAG.FINAL_ROUND)) {
										this.sendHome(locPiece);
									} else {
										this.logMsg("PLKOED", plNum);
										locPiece.moveAsstTo({type:ASSTLOC.KO, loc:locPiece.location.loc}) ;
									}
								}
							}
						}
					}

					// next state to doAction
					this.state = LOC2STATE[loc[1]];

					// leave assistant behind
					if (!asstMoved && (this.players[pl].location.type != PLAYERLOC.HOME) && !this.getFlag(FLAG.FINAL_ROUND)) {
						// asst priority
						// - if KO asst, use it (done above)
						// - else if asst at desk, use it
						// - else if any asst in action loc, allow player to choose 1 or none
						let tmpAsst = this.players[pl].assistants.find((a) => a.location.type === ASSTLOC.DESK);
						if (tmpAsst) {
							// asst at desk
							tmpAsst.moveAsstTo(this.players[pl].location);
						} else {
							tmpAsst = this.players[pl].assistants.find((a) => a.location.type === ASSTLOC.ACTION);
							if (tmpAsst) {
								// have at least one asst on an action spot
								// allow user to chose to move asst
								// this.remember = {state:this.state, location: Object.assign({}, this.players[pl].location)};
								this.substack.push(this.state);
								this.substack.push(this.players[pl].location);
								this.state = GAMESTATE.LEAVEASST;
							}
							// no assts on action locs, state set above
						}
					}

					// move player to loc
					this.players[pl].movePlayerTo({type:loc[0], loc:loc[1]});
					// this.players[pl].location = {type:loc[0], loc:loc[1]};

				}
				break;
			case GAMESTATE.LEAVEASST:
				{
					let plLoc = this.substack.pop();
					if (clicked != CLICKITEM.DONOTHING) {
						// move selected asst to old player location
						this.players[loc[1]].assistants[loc[2]].moveAsstTo(plLoc);
					}
					// go to remebered state
					this.state = this.substack.pop();
				}
				break;
			case GAMESTATE.FINALAUCTION:
				{
					// player will have clicked art from auction
					// move it temporarily to "TOPLAYER"
					let chosenArt = this.art.find((art) => art.type === loc[1] && art.num === Number(loc[2]));
					chosenArt.moveArtTo({type:ARTLOC.TOPLAYER, plNum:this.activePlayer});
					this.logMsg("AUCTIONPICK", this.activePlayer, chosenArt.type);

					// if more bidders and more art available, go to next player
					let playerBids = this.substack.pop();
					let auctionWorks = this.art.filter((a) => a.location.type === ARTLOC.AUCTION);
					if (playerBids.length && auctionWorks.length) {
						this.activePlayer = playerBids.shift().plNum;
						this.substack.push(playerBids);
					} else {
						// done with auction
						this.state = GAMESTATE.FINALSCORE;
						this.logMsg("FINALSCORE");
						this.finalScore();
						this.finalResults();
					}
				}
				break;
			case GAMESTATE.START:
				{
					let tile = this.repTiles.find((t) => 
						t.location.type === REPTILELOC.STARTTILE && t.location.actionSpace === loc[1]);
				
					if (!tile) {
						return false;
					}
					// move it to player's display
					tile.moveRepTileTo({type:REPTILELOC.DISPLAY, plNum:pl}); 

					// move player piece to selected location
					this.players[pl].movePlayerTo({type:loc[0], loc:loc[1]});
					this.logMsg("STARTPOS", this.activePlayer, loc[1], tile.tNum);
					// this.players[pl].location = {type:loc[0], loc:loc[1]};

					this.nextPlayer();
				}
				break;
		
			default:
				break;
		}
		
		return ;

	}
	
	endTurnRefill() {
		if (this.getFlag(FLAG.ART_BOUGHT)) {
			// show new art and visitors
			for (let artType of Object.values(ARTTYPE)) {
				if (this.art.find((art) => art.location.type === ARTLOC.PILETOP && art.type === artType)) {
					// pile has top, do nothing
				} else {
					// pile has no top, make one
					let artTop = this.chooseArtPileTop(artType);
					if (artTop) {
						// a new piletop was selected, add visitors
						this.visitorsToArt(artTop, artType);
					}
				}
			}
			this.clearFlag(FLAG.ART_BOUGHT);
			this.moves.push({plNum:this.activePlayer}); // don't allow UNDO
		} 
		if (this.getFlag(FLAG.UPDATE_CONTRACTS)) {
			// deal new contracts
			this.dealContracts(true);
			this.clearFlag(FLAG.UPDATE_CONTRACTS);
			this.moves.push({plNum:this.activePlayer}); // don't allow UNDO
		}

	}

	EAorEndTurn() {
		// was this a KO?
		if (this.thisIsKO()) {
			// this was a KO action / EA
			let koPiece = this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.KO);
			if (koPiece) {
				this.sendHome(koPiece);
			} else if (this.players[this.activePlayer].location.type === PLAYERLOC.KO) {
				this.players[this.activePlayer].movePlayerTo({type:PLAYERLOC.HOME});
				// this.players[this.activePlayer].location = {type:PLAYERLOC.HOME};
			}
			this.state = GAMESTATE.ENDTURN;
			return;
		}

		// if not KO action / EA
		// after player does last thing go to either EAOREND or ENDTURN
		if (!this.getFlag(FLAG.DID_EA) && (this.getEATixClicks() || this.getEABonusClicks())) {
			this.state = GAMESTATE.EAOREND;
		} else {
			// if player's own asst in ko, return it home
			let koPiece = this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.KO);
			if (koPiece) {
				this.sendHome(koPiece);
			}
			this.state = GAMESTATE.ENDTURN;
		}
	}

	thisIsKO() {
		return this.activePlayer != this.currentPlayer;
	}

	playerDidNothing() {
		// if player can't do anything then
		//   if there are any tickets, discard one
		//   else if there are any visitors in the bag, draw one to the plaza
		// WHY?
		// It is possible, especially with bots, to get into a situation where
		// no player can do anything, leading to an infinite loop. Using the above
		// forces the game to end (tix done and bag empty -> game over)

		// any tix left
		if (this.playerGetsTix(-1, TIXCOLOR.BROWN)) return;

		// no tix left, any visitors in bag?
		let tmpVisitor = this.getRandomFromBag();	// null if bag empty
		if (tmpVisitor) {
			tmpVisitor.moveVisitorTo({type:VISITORLOC.PLAZA});
			this.logMsg("VISITOR2PLAZA", tmpVisitor.color);
			// TODO add playerDidNothing to code
		}
		
	}

	getActionClicks() {
		let clickables = [];
		let playerLoc = this.players[this.activePlayer].location;
		if (playerLoc.type != PLAYERLOC.HOME) playerLoc = this.players[this.activePlayer].location.loc;

		if (playerLoc !=  ACTIONLOC.SALES && this.getSalesClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.SALES}));
		}
		if (playerLoc !=  ACTIONLOC.ART && this.getArtClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.ART}));
		}
		if (playerLoc !=  ACTIONLOC.MEDIA && this.getMediaClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MEDIA}));
		}
		if (playerLoc !=  ACTIONLOC.MARKET && this.getMarketClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MARKET}));
		}
		this.clearFlag(FLAG.NOTHING_TURN);
		if (!clickables.length) {
			// if you can't do ANYTHING then allow move and pass
			// https://boardgamegeek.com/thread/1468940
			
			// manually add all action locations player does not occupy
			for (let i in ACTIONLOC) {
				// skip location if active player is there
				let al = ACTIONLOC[i];
				if (playerLoc === al) continue;
				
				clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:al}));
			}
			this.setFlag(FLAG.NOTHING_TURN);
		}
		if (this.getEATixClicks()) {
			clickables.push(this.obj2Str({type:CLICKITEM.EATIX}));
		}
		if (this.getEABonusClicks()) {
			clickables.push(this.obj2Str({type:CLICKITEM.EABONUS}));
		}

		return clickables;

	}

	getKoActionClicks(koLoc, getClickables = false) {
		let cFlag = false;
		let tmp = {clickables:[], msgs:[]};
		if (this.players[this.activePlayer].influence > 0) {
			let hFlag = true;
			switch (koLoc) {
				case ACTIONLOC.SALES:
					tmp = this.getSalesClicks(true);
					break;
				case ACTIONLOC.ART:
					tmp = this.getArtClicks(true);
					break;
				case ACTIONLOC.MEDIA:
					tmp = this.getMediaClicks(true);
					break;
				case ACTIONLOC.MARKET:
					tmp = this.getMarketClicks(true);								
					break;
			
				default:
					// error
					break;
			}
			let infl = this.getUsableInfl();
			for (let m in tmp.msgs) {
				if (koLoc === ACTIONLOC.MEDIA && tmp.msgs[m].startsWith("#")) {
					// hire needs special updating
					// add a msg and don't mess with buttons
					if (hFlag) tmp.msgs.push("HIREKOMSG".concat(":", infl));
					hFlag = false;	// only do this once
				} else {
					tmp.msgs[m] = "REDUCINFL".concat(":", tmp.msgs[m], ":", infl);
				}
				
				// tmp.msgs[m] += ` (${PROMPT.EN.REDUCINFL} ${infl})`;
			}
		}

		let eaFlag = false;
		if (this.getEATixClicks()) {
			tmp.clickables.push(this.obj2Str({type:CLICKITEM.EATIX}));
			eaFlag = true;
		}
		if (this.getEABonusClicks()) {
			tmp.clickables.push(this.obj2Str({type:CLICKITEM.EABONUS}));
			eaFlag = true;
		}
		if (eaFlag) tmp.msgs.push("EACTION");

		return getClickables ? tmp : tmp.clickables.length;

	}

	getSalesClicks(getClickables = false) {
		// - can we get a contract? (or deal 4 contracts)
		// 		CLICKITEM.CONTRACT-num or CLICKSPACE.DEALCONTRACTS 
		// - can we sell art?
		//		CLICKITEM.ART-artType-num
		// 
		//  
		let clickables = [];
		let cFlag = false;
		let msgs = [];
		let playerFaceUpContracts = this.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === this.activePlayer && c.faceUp);
		switch (this.state) {
			case GAMESTATE.PICKACTION:
			case GAMESTATE.KOSALES:
			case GAMESTATE.SALES_MAIN:
				// sell art (only available if player has not dealt 4 contracts)
				// to sell:
				// player has contract
				// player has matching art
				// note: highlight art that can be sold, later, after art selected, contract(s) will be highlighted
				if ((playerFaceUpContracts.length) && !this.getFlag(FLAG.DEALT_CONTRACTS)) {
					let playerContractTypes = [];
					for (let pc of playerFaceUpContracts) {
						// array of all players contract types (incl dupes)
						playerContractTypes.push(pc.artType);
					}
					let playerArt = this.playerHasDisplayed();
					for (let pa of playerArt) {
						if (playerContractTypes.includes(pa.type)) {
							clickables.push(this.obj2Str({type:CLICKITEM.ART, artType:pa.type, num:pa.num}));
							cFlag = true;
						}
					}
					if (cFlag) msgs.push("SELLART");
					cFlag = false;
				}
			case GAMESTATE.EABONUS_CONTRACT:
				// get a contract
				// to get contract:
				// player has a contract space available
				if (playerFaceUpContracts.length < 3) {
					if (this.options.numContractPiles===4 && !this.getFlag(FLAG.DEALT_CONTRACTS)) {
						clickables.push(this.obj2Str({type:CLICKSPACE.DEALCONTRACTS}));
						msgs.push("DEALMORE");
					}
	
					// set dealt cards clickable
					let dealtContracts = this.contracts.filter((c) => c.location.type === CONTRACTLOC.DEALT && c.location.pos === 0);
					for (let dc of dealtContracts) {
						clickables.push(this.obj2Str({type:CLICKITEM.CONTRACT, num:dc.num}));
						cFlag = true;
					}
					if (cFlag) msgs.push("GETCONTRACT");
					cFlag = false;
				}
				break;
			case GAMESTATE.SALES_GETCONTRACT:
				// player chose a contract, highlight where it can go
				// TODO fix this (easier to filter for !faceUp player contracts + empty spaces?)
				let playerFaceDownContracts = this.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === this.activePlayer && !c.faceUp);
				let availableSpaces = [true, true, true];
				for (let pc of playerFaceUpContracts) {
					// locations with unfilled contracts can't be used
					availableSpaces[pc.location.num] = false;
				}
				for (let aS = 0; aS < 3; aS++) {
					if (availableSpaces[aS]) {
						// does space have used contract? or is it empty?
						let usedContract = playerFaceDownContracts.find((c) => c.location.num === aS);
						if (usedContract) {
							// have a used contract
							clickables.push(this.obj2Str({type:CLICKITEM.CONTRACT, num:usedContract.num}));
							cFlag = true;
						} else {
							// empty space
							clickables.push(this.obj2Str({type:CLICKSPACE.CONTRACT, num:aS}));
							cFlag = true;
						}
					}
				}
				if (cFlag) msgs.push("PLACECONTRACT");
				cFlag = false;
				break;
			case GAMESTATE.SALES_SELLART:
				// player chose art to sell, highlight contract(s) that can be used
				let usableContracts = playerFaceUpContracts.filter((c) => c.artType === this.art[this.substackEnd()].type); //TODO debug this 
				for (let uc of usableContracts) {
					clickables.push(this.obj2Str({type:CLICKITEM.CONTRACT, num:uc.num}));
					cFlag = true;
				}
				if (cFlag) msgs.push("USECONTRACT");
				cFlag = false;
				break;
			case GAMESTATE.SALES_VISITOR:
				// state only entered if have visitors in gallery
				// if (this.visitors.findIndex((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === this.activePlayer) != -1) {
					// art/contract chosen
					// and has visitor(s) in gallery
					// select visitor that leaves
					for (let vc of Object.values(VISITORCOLOR)) {
						let visitorIndex = this.visitors.findIndex((v) => v.location.type === VISITORLOC.GALLERY && 
							v.location.plNum === this.activePlayer &&
							v.color === vc);
						if (visitorIndex != -1) {
							clickables.push(this.obj2Str({type:CLICKITEM.VISITOR, num:visitorIndex}));
							cFlag = true;
						}
					}
					if (cFlag) msgs.push("LEAVINGVISITOR");
					cFlag = false;
				// } else {
				// 	// art/contract chosen
				// 	// no visitors in gallery
				// 	clickables.push(this.obj2Str({type:CLICKITEM.ORIENTATION, color:VISITORCOLOR.PINK}));
				// 	clickables.push(this.obj2Str({type:CLICKITEM.ORIENTATION, color:VISITORCOLOR.BROWN}));
				// 	msgs.push("bonus to make available");
				// }
				break;
			case GAMESTATE.SALES_BONUSUP:
				// chose white visitor (or none) to leave, select bonus orientation
				clickables.push(this.obj2Str({type:CLICKITEM.ORIENTATION, color:VISITORCOLOR.PINK}));
				clickables.push(this.obj2Str({type:CLICKITEM.ORIENTATION, color:VISITORCOLOR.BROWN}));
				msgs.push("BONUSUP");
				
				break;
		
			default:
				// TODO error?
				break;
		}
		
		return getClickables ? {clickables:clickables, msgs:msgs} : clickables.length;
	}

	getArtClicks(getClickables = false) {
		let clickables = [];
		let cFlag = false;
		let msgs = [];
		switch (this.state) {
			case GAMESTATE.PICKACTION:
			case GAMESTATE.KOART:
			case GAMESTATE.ART_MAIN:
				// to buy art need:
				// artist is discovered
				// artist is not celebrity and has sig token available OR
				// 	 player has commission
				// there is art left to buy
				// player has space
				// player can afford
				let availArtists = this.artists.filter((a) => 
					a.discovered && 
					((a.fame < 19 && (a.sigTokens[0].location === SIGLOC.ARTIST || a.sigTokens[1].location === SIGLOC.ARTIST)) || 
						(a.sigTokens[0].location === SIGLOC.COMMISSION &&  a.sigTokens[0].plNum === this.activePlayer))
					);
				let playerArt = this.playerHasDisplayed();
				let artSpaceAvailable = false;
				let maybeArtSpace = false;
				if (playerArt.length < 3) {
					artSpaceAvailable = true;
				} else if (playerArt.length < 4) {
					// check if player has a masterpiece OR
					// maybe could make one now
					if (this.playerHasMasterpiece()) {
						artSpaceAvailable = true;
					} else {
						// can player create masterpiece ?
						maybeArtSpace = true;
					}
				}
				let playerCommission = this.playerHasCommission();
				for (let aa of availArtists) {
					let checkArt = this.topOfArtPile(aa.type);
					if (checkArt && this.playerCanAfford((playerCommission == aa) ? aa.initFame : aa.fame)) {
						if (artSpaceAvailable) {
							clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, artType:aa.type, color:aa.color}));
							cFlag = true;
						} else if (maybeArtSpace) {
							// check if player can both afford to buy art AND
							// increase it to masterpiece
							// artist current fame
							let tmpFame = aa.fame;
							// add fixed amount based on art
							tmpFame += checkArt.fameBonus.fixed;
							// add variable amount based on # of white meeples in player's gallery 
							tmpFame += checkArt.fameBonus.perWhite * this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
							if (tmpFame < 19) {
								// just buying art doesn't bump to celebrity, check if player can use infl
								let tmpInfl = this.players[this.activePlayer].influence;
								let tmpMoney = this.players[this.activePlayer].money;
								while (tmpMoney < ((playerCommission == aa) ? aa.initFame : aa.fame)) {
									// player needs to use some infl for money
									tmpInfl = this.inflNextMark(tmpInfl);
									tmpMoney++;
								}
								// player can use the rest of infl for fame
								tmpFame += Math.ceil(tmpInfl / 5);
							}
							if (tmpFame > 18) {
								// good luck testing this path!
								clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, artType:aa.type, color:aa.color}));
								cFlag = true;
							} 
						}
					}

				}
				if (cFlag) msgs.push("BUYARTIST");
				cFlag = false;

				//  to discover need:
				// player doesn't have discovered sig token
				// artist undiscovered
				if (!this.playerHasCommission()) {
					for (let aa of this.artists) {
						if (!aa.discovered) {
							clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, artType:aa.type, color:aa.color}));
							cFlag = true;
						}
					}
				}
				if (cFlag) msgs.push("DISCARTIST");
				cFlag = false;

				break;
		
			default:
				break;
		}

		// return either array of clickable locations or whether any were clickable
		return getClickables ? {clickables:clickables, msgs:msgs} : clickables.length;
	}

	getMediaClicks(getClickables = false) {
		let clickables = [];
		let cFlag = false;
		let msgs = [];
		let availArtists = this.artists.filter((a) => a.discovered && (a.thumb < 5) && (a.thumb+1  <= this.getUsableInfl()));
		switch (this.state) {
			case GAMESTATE.PICKACTION:
			case GAMESTATE.KOMEDIA:
			case GAMESTATE.MEDIA_MAIN:
				// to promote need:
				// - discovered artist with promotion level < 5 AND 
				// 		<= infl player - 1 (i.e. player can pay infl for thumb) AND
				//		thumb of correct level is available
				if (availArtists.length) {
					// for (let artist of availArtists) {
					// 	let thumb = this.thumbs[artist.thumb + 1].find((t) => !t.color);
					// 	if (!thumb) continue;	// no thumb available
					// 	clickables.push(this.obj2Str({type:CLICKITEM.ARTIST, color:artist.color, artType:artist.type}));
					// }
					// msgs.push("artist to promote");

					for (let promoLvl = 1; promoLvl <= 5; promoLvl++) {
						let thumbLevelIdx = promoLvl - 1;
						let thumbIdx = this.thumbs[thumbLevelIdx].map((t) => !t.color).lastIndexOf(true); //findIndex((t) => !t.color);
						if (thumbIdx === -1) continue;	// no thumb available
						if (availArtists.find((aa) => aa.thumb+1 === promoLvl)) {
							// there is an artist that an be promoted to this level
							clickables.push(this.obj2Str({type:CLICKITEM.THUMB, level:thumbLevelIdx, num:thumbIdx}));
							cFlag = true;
						}
					}
					if (cFlag) msgs.push("PROMOLEVEL");
					cFlag = false;
				}

				// to hire:
				// need empty desks
				// need assts unemployed
				// need money and/or influence to cover cost
				let numDesksAvailable = 4 - this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.DESK).length;
				let unemployed = this.players[this.activePlayer].assistants.filter((a) => a.location.type === ASSTLOC.UNEMPLOYED);
				if (numDesksAvailable && unemployed.length) {
					const hireCost = [0,0,1,2,2,3,3,4,5,6];
					let emps2Hire = 0;
					let totalCost = 0;
					for (let i=10-unemployed.length; i < 10; i++) {
						totalCost += hireCost[i];
						if ((emps2Hire >= numDesksAvailable) || !this.playerCanAfford(totalCost)) break;
						emps2Hire++;
						clickables.push(this.obj2Str({type:CLICKITEM.HIREASST, num:emps2Hire}));
						msgs.push( "#".concat(this.obj2Str({type:CLICKITEM.HIREASST, num:emps2Hire}), "#", "HIRE", ":", emps2Hire, ":", totalCost));
					}
	
				}
				
				break;
		
			default:
				break;
		}
	
		return getClickables ? {clickables:clickables, msgs:msgs} : clickables.length;
	}

	getMarketClicks(getClickables = false) {
		let clickables = [];
		let cFlag = false;
		let msgs = [];
		// for all, player has correct visitors and 1+ avail. asst.
		// for top, space for tile, acquired right ARTTYPE
		// for bottom, space is empty, can pay
		
		// player has 1+ asst.
		let availableAssts = this.getAvailableAssistants();
		if (availableAssts.length) {

			// player has correct lobby visitors
			let visitorsForCol = {};
			for (let col in MARKETCOL) {
				visitorsForCol[col] = 0;
			}

			switch (this.state) {
				case GAMESTATE.PICKACTION:
				case GAMESTATE.KOMARKET:
				case GAMESTATE.MARKET_MAIN:
					if (this.repTiles.filter((r) => r.location.type === REPTILELOC.PLAYER && r.location.plNum === this.activePlayer).length < 6) {
						// player has empty reptile space (less than 6)
						// first column: have 1+ visitor, any color
						let activePlayerLobby = this.visitors.filter((v) => 
							v.location.type === VISITORLOC.LOBBY &&
							v.location.plNum === this.activePlayer);
						visitorsForCol[MARKETCOL.ADD3COL] = activePlayerLobby.length > 0;
						// second column: have 1+ brown and 1+ pink
						visitorsForCol[MARKETCOL.ADD2COL] = (activePlayerLobby.findIndex((v) => v.color === VISITORCOLOR.BROWN) > -1) &&
							(activePlayerLobby.findIndex((v) => v.color === VISITORCOLOR.PINK) != -1);
						// third column: have 1+ white and 1+ brown/pink
						visitorsForCol[MARKETCOL.ADD1COL] = (activePlayerLobby.findIndex((v) => v.color === VISITORCOLOR.WHITE) > -1) &&
							(activePlayerLobby.findIndex((v) => 
								(v.color === VISITORCOLOR.PINK) ||
								(v.color === VISITORCOLOR.BROWN)) > -1);

						for (let at of Object.values(ARTTYPE)) {
							if ((this.art.findIndex((a) => ((a.location.type === ARTLOC.DISPLAY) || (a.location.type === ARTLOC.SOLD)) && a.type === at && a.location.plNum === this.activePlayer) != -1)) {
								// player has on display or has sold this type of art AND
								for (let col in MARKETCOL) {
									if (visitorsForCol[col] ) {
										// col is usable
										let index = this.repTiles.findIndex((r) => r.location.type === REPTILELOC.INTLMARKET && r.location.artType === at && r.location.col === col);
										if (index != -1) {
											// col has a reptile on it
											clickables.push(this.obj2Str({type:CLICKITEM.REPTILE, num:index}));
											cFlag = true;
										}
									}
								}

							}
						}
					}
					if (cFlag) msgs.push("TILE2GET");
					cFlag = false;


					// no need to check if player can get bonus for an auction space, see https://boardgamegeek.com/thread/1694828/auction-market-international
					// get an array of all the assistants in the auction
					let auctionAssts = [];
					for (let pl=0; pl < this.numPlayers; pl++) {
						auctionAssts = auctionAssts.concat(this.players[pl].assistants.filter((a) => a.location.type === ASSTLOC.AUCTION));
					}
					for (let av of Object.values(AUCTIONVAL)) {
						let row = Math.floor((av - 1)/2); // 0/2/5
						for (let col in MARKETCOL) {
							let colNum = 3 - MARKETCOL2INFL[col];	// 0-2
							if (colNum == 1 && this.numPlayers < 3) continue;
							if (visitorsForCol[col] &&
								this.playerCanAfford(av, MARKETCOL2INFL[col]) &&
								(!auctionAssts.find((a) => a.location.row === row && a.location.col === colNum))) {
								// col is usable AND
								// player can afford it AND
								// col has no asst on it
								clickables.push(this.obj2Str({type:CLICKSPACE.AUCTION, row:row, col:colNum}));
								cFlag = true;
							}
						}
					}
					if (cFlag) msgs.push("AUCTIONSPACE");

					break;
			
				default:
					// TODO error
					break;
			}
		}

		// return either array of clickable locations or whether any were clickable
		return getClickables ? {clickables:clickables, msgs:msgs} : clickables.length;
	}

	getEATixClicks(getClickables = false) {
		let clickables = [];
		if (!this.getFlag(FLAG.DID_EA)) {
			// can player use tickets?
			let tixPlayer = "player" + this.activePlayer; // TODO this code sux!
			for (let col of Object.values( TIXCOLOR)) {
				if (this.tickets[col].includes(tixPlayer)) {
					// player has color ticket, can they use it?
					// they can if there are visitors of that color in any lobby or plaza
					// EXCEPT white visitors in own lobby subject to limit
					let colVisitors = this.visitors.filter((v) => v.color === col && (v.location.type === VISITORLOC.PLAZA || v.location.type === VISITORLOC.LOBBY));
					if (colVisitors.length) {
						if (col != TIXCOLOR.WHITE) {
							clickables.push(this.obj2Str({type:CLICKITEM.TIX, color:col}));
						} else {
							let playerLobby = colVisitors.filter((v) => v.location.type === VISITORLOC.LOBBY && v.location.plNum === this.activePlayer);
							if (colVisitors.length > playerLobby.length || // there are white visitors elsewhere to move OR
								this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer) < this.playerHasSold().length + 1) {	// another white visitor is allowed
								
								clickables.push(this.obj2Str({type:CLICKITEM.TIX, color:col}));
							}
						}
					}
				}
			}
		} 
		return getClickables ? clickables : clickables.length;
	}

	playerHasCommission() {
		// commmission will always be sig 0
		return this.artists.find((artist) => artist.sigTokens[0].location === SIGLOC.COMMISSION && artist.sigTokens[0].plNum === this.activePlayer);
	}

	playerHasMasterpiece() {
		let playerArt = this.playerHasDisplayed();
		for (let pArt of playerArt) {
			if (this.artists[pArt.byArtist].fame > 18) return true;
		}
		return false;
	}

	playerRepTileDisplayIdx() {
		return this.repTiles.findIndex((t) => t.location.type === REPTILELOC.DISPLAY && t.location.plNum === this.activePlayer);
	}

	playerRepTiles(plNum = this.activePlayer) {
		return this.repTiles.filter((t) => t.location.type === REPTILELOC.PLAYER && t.location.plNum === plNum);
	}

	checkEndGame() {
		if (!this.getFlag(FLAG.END_TRIGGERED)) {
			let count = 0;
			if (this.getFlag(FLAG.BAG_EMPTY)) count++;
			if (this.getFlag(FLAG.TIX_EMPTY)) count++;
			if (this.getFlag(FLAG.TWO_CELEBRITY)) count++;
			if (count > 1) {
				this.setFlag(FLAG.END_TRIGGERED);
				this.logMsg("ENDTRIG");
			}
		}
		
	}

	checkLastRound() {
		if (this.activePlayer === 0 && this.getFlag(FLAG.END_TRIGGERED)) {
			if (!this.getFlag(FLAG.FINAL_ROUND)) {
				this.setFlag(FLAG.FINAL_ROUND);
				this.logMsg("FINALTURN");
			} else {
				// game is over
				// do the auction
				// get bidders and bids
				const bids = [[1,1.01,1.1],[3.002,3.02,3.2],[6.004,6.04,6.4]];
				let playerBids = [];
				for (let plNum=0; plNum < this.numPlayers; plNum++) {
					let bid = 0;
					let auctionAssts = this.players[plNum].assistants.filter((asst) => asst.location.type === ASSTLOC.AUCTION);
					for (let asst of auctionAssts) {
						bid += bids[asst.location.row][asst.location.col];
					}
					if (bid) playerBids.push({plNum:plNum, bid:bid});
				}
				playerBids.sort((a,b) => b.bid - a.bid);
				if (playerBids.length) {
					this.activePlayer = playerBids.shift().plNum;
					this.substack.push(playerBids);
					this.state = GAMESTATE.FINALAUCTION;
					this.logMsg("FINALAUCTION")
				} else {
					// no bids????
					this.state = GAMESTATE.FINALSCORE;
					this.logMsg("FINALSCORE");
					this.finalScore();
					this.finalResults();
				}
			}
		} 
	}

	finalScore(forLiveScore = false) {
		// let money = [0,0,0,0];
		// let infl = [0,0,0,0];
		// for (let plNum=0; plNum < this.numPlayers; plNum++) {
		// 	money[plNum] = this.players[plNum].money;
		// 	infl[plNum] = this.players[plNum].influence;
		// }
		let money = {};
		let infl = {};

		money.onhand = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.onhand[plNum] = this.players[plNum].money;
		}

		// column majorities
		money.columns = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.columns[plNum] = 0;
		}
		const majorityBonus = [[6,3,1],[10,6,3],[15,10,6]];
		for (let col=0; col < 3; col++) {
			if (this.numPlayers < 3 && col===1) continue;
			let numAsstInCol = [0,0,0,0];
			for (let plNum=0; plNum < this.numPlayers; plNum++) {
				// get num assts each player has in specific col of market/auction 
				numAsstInCol[plNum] = this.players[plNum].assistants.filter((a) => (a.location.type === ASSTLOC.INTLMARKET || a.location.type === ASSTLOC.AUCTION) && a.location.col === col).length;
			}
			let bonusIdx = 0;
			let maxAssts = Math.max(...numAsstInCol);
			let colBonus = majorityBonus[col][bonusIdx];
			while (maxAssts && bonusIdx < 3) {
				// maxCount = how many players are tied at this count
				let maxCount = numAsstInCol.filter((n) => n === maxAssts).length;
				for (let i=1; i < maxCount; i++) {
					// if players are tied, add up bonues for tied positions
					bonusIdx++;
					if (bonusIdx < 3) colBonus +=  majorityBonus[col][bonusIdx];
				}
				// divide bonus by number of players to rcv
				colBonus = Math.floor(colBonus/maxCount);
				for (let plNum=0; plNum < this.numPlayers; plNum++) {
					if (numAsstInCol[plNum] === maxAssts) {
						// this player gets bonus
						money.columns[plNum] += colBonus;
						if (!forLiveScore) this.logMsg("COLBONUS",plNum,colBonus,col+1);
						// remove this player from further consideration
						numAsstInCol[plNum] = 0;
					}
				}
				// move to next bonus
				bonusIdx++;
				maxAssts = Math.max(...numAsstInCol);
				if (bonusIdx < 3) colBonus = majorityBonus[col][bonusIdx];
			}
		}

		// repTiles
		money.repTiles = [];
		infl.repTiles = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.repTiles[plNum] = 0;
			infl.repTiles[plNum] = 0;
		}
		// note: normally reptiles can be scored in any order BUT rep tile 0 MUST be scored before others for that plaayer
		// To simplify, loop all reptiles starting from 0 and score in that order
		for (let i=0; i < 20; i++) {
			// find repTile 'i' and see if it should be scored LOC=PLAYER
			let tile = this.repTiles.find((t) => t.tNum === i && t.location.type === REPTILELOC.PLAYER);
			if (tile) {
				let money2add = 0;
				let infl2add = 0;
				let tmpNum = 0;
				switch (i) {
					case 0:	// 1 money per 3 infl (score first)
						money2add = Math.floor(infl[tile.location.plNum] / 3);
						break;
					case 1:	// 1 infl + 3 money per Collector
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, tile.location.plNum);
						money2add = 3 * tmpNum;
						infl2add = tmpNum;
						break;
					case 2:	// 1 infl + 2 money per VIP
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.PINK, tile.location.plNum);
						money2add = 2 * tmpNum;
						infl2add = tmpNum;
						break;
					case 3:	// 1 infl + 2 money per Investor
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.BROWN, tile.location.plNum);
						money2add = 2 * tmpNum;
						infl2add = tmpNum;
						break;
					case 4: // 1 money per visitor
						money2add = this.visitors.filter((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === tile.location.plNum).length;
						break;
					case 5: // 4 money per set of visitors
						money2add = 4 * Math.min(this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, tile.location.plNum),
							this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.PINK, tile.location.plNum),
							this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.BROWN, tile.location.plNum));
						break;
					case 6: // 1 infl + 2 money per repTile
						tmpNum = this.repTiles.filter((t) => t.location.type === REPTILELOC.PLAYER && t.location.plNum === tile.location.plNum).length;
						money2add = 2 * tmpNum;
						infl2add = tmpNum;
						break;
					case 7: // 1 infl + 3 money per asst in auction
						tmpNum = this.players[tile.location.plNum].assistants.filter((a) => a.location.type === ASSTLOC.AUCTION).length;
						money2add = 3 * tmpNum;
						infl2add = tmpNum;
						break;
					case 8: // 1 infl + 1 money per asst not unemployed https://boardgamegeek.com/thread/1533273
						tmpNum = 10 - this.players[tile.location.plNum].assistants.filter((a) => a.location.type === ASSTLOC.DISCARD || a.location.type === ASSTLOC.UNEMPLOYED).length;
						money2add = tmpNum;
						infl2add = tmpNum;
						break;
					case 9: // 2 money per artist with 4 thumb or higher
						tmpNum = this.artists.filter((a) => a.thumb > 3).length;
						money2add = 2 * tmpNum;
						break;
					case 10: // 2 money per work of art acquired
						tmpNum = this.art.filter((a) => (a.location.type === ARTLOC.DISPLAY || a.location.type === ARTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 2 * tmpNum;
						break;
					case 11: // 1 infl + 3 money per artwork sold
						tmpNum = this.art.filter((a) => (a.location.type === ARTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						infl2add = tmpNum;
						break;
					case 12: // 1 infl + 3 money per artwork on exhibit
						tmpNum = this.art.filter((a) => (a.location.type === ARTLOC.DISPLAY) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						infl2add = tmpNum;
						break;
					case 13: // 1 infl + 2 money per art type acquired
						for (let artType of Object.values(ARTTYPE)) {
							if (this.art.some((a) => a.type === artType && (a.location.type === ARTLOC.DISPLAY || a.location.type === ARTLOC.SOLD) && a.location.plNum === tile.location.plNum)) tmpNum++;
						}
						money2add = 2 * tmpNum;
						infl2add = tmpNum;
						break;
					case 14: // 1 infl + 3 money per photograph acquired
					case 15: // 1 infl + 3 money per painting acquired
					case 16: // 1 infl + 3 money per digital art acquired
					case 17: // 1 infl + 3 money per sketch acquired
						const conv = [ARTTYPE.PHOTO, ARTTYPE.PAINT, ARTTYPE.ABSTRACT, ARTTYPE.SKETCH];
						tmpNum = this.art.filter((a) => a.type === conv[i-14] && (a.location.type === ARTLOC.DISPLAY || a.location.type === ARTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						infl2add = tmpNum;
						break;
					case 18: // 1 infl + 2 money per artist with 15+ fame
						tmpNum = this.artists.filter((a) => a.fame > 14).length;
						money2add = 2 * tmpNum;
						infl2add = tmpNum;
						break;
					case 19: // 2 infl + 4 money per Masterpiece on exhibit
						{
							let playerArt = this.playerHasDisplayed(tile.location.plNum);
							for (let pArt of playerArt) {
								if (this.artists[pArt.byArtist].fame > 18) tmpNum++;
							}
						}
						money2add = 4 * tmpNum;
						infl2add = 2 * tmpNum;
						break;
				}
				if (money2add) {
					money.repTiles[tile.location.plNum] += money2add;
					if (!forLiveScore) this.logMsg("TILEMONEY",tile.location.plNum,money2add,i);
				}
				if (infl2add) {
					infl.repTiles[tile.location.plNum] += infl2add;
					if (!forLiveScore) this.logMsg("TILEINFL",tile.location.plNum,infl2add,i);
				}
				
			}
		}

		// sale value of exhibitted art
		money.exhibitted = [];

		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.exhibitted[plNum] = 0;
		}
			let exhibitArt = this.art.filter((a) => a.location.type === ARTLOC.DISPLAY);
		for (let art of exhibitArt) {
			let val = this.artists[art.byArtist].getValue();
			money.exhibitted[art.location.plNum] += val;
			if (!forLiveScore) this.logMsg("EXART",art.location.plNum,val,art.byArtist);
		}


		// auction works
		money.auction = [];
		let plAuctionArt = [null,null,null,null];
		
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.auction[plNum] = 0;
		}
		let auctionWorks = this.art.filter((a) => a.location.type === ARTLOC.TOPLAYER);
		for (let art of auctionWorks) {
			// remember art won for later
			plAuctionArt[art.location.plNum] = art;

			// player who won art rcvs its value
			let av = this.auctionValue(art);
			money.auction[art.location.plNum] += av.value;
			if (!forLiveScore) this.logMsg("AUCTIONART",art.location.plNum,av.value,av.artistIdx);
		}
		

		// curator
		// dealer
		money.secretCards = [];
		for (let plNum = 0; plNum < this.numPlayers; plNum++) {
			money.secretCards[plNum] = 0;
			// for each player, compute value of curator and dealer cards without auction
			let cVal = this.curatorValue(plNum);
			let dVal = this.dealerValue(plNum);
			// if player has won auction determine which card gains more
			if (plAuctionArt[plNum] && plAuctionArt[plNum].type) {
				let dValWith = this.dealerValue(plNum, plAuctionArt[plNum].type);
				let cValWith = this.curatorValue(plNum, plAuctionArt[plNum].type);
				if ((cVal + dValWith) > (cValWith + dVal)) {
					// it is better to move auction work to sell pile
					dVal = dValWith;
					if (!forLiveScore) {
						this.logMsg("TOSOLD",plNum);
						plAuctionArt[plNum].moveArtTo({type:ARTLOC.SOLD, plNum:plNum});
					}
				} else {
					cVal = cValWith;
					if (!forLiveScore) {
						this.logMsg("TODISPLAY",plNum);
						plAuctionArt[plNum].moveArtTo({type:ARTLOC.DISPLAY, plNum:plNum});
					}
				}
			}
			money.secretCards[plNum] += cVal;
			if (!forLiveScore) this.logMsg("DISPLAYBONUS",plNum,cVal);

			money.secretCards[plNum] += dVal;
			if (!forLiveScore) this.logMsg("SOLDBONUS",plNum,dVal);
		}

		let gainedInfl = [0,0,0,0];
		for (let stype in infl) {
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				gainedInfl[plNum] += infl[stype][plNum];
			}
		}

		// infl track
		money.infl = [];
		for (let plNum = 0; plNum < this.numPlayers; plNum++) {
			let val = this.infl2money(gainedInfl[plNum] + this.players[plNum].influence);
			money.infl[plNum] = val;
			if (!forLiveScore) this.logMsg("INFLBONUS",plNum,val);
		}

		
		let ret = [0,0,0,0];
		for (let stype in money) {
			if (!forLiveScore && stype == "onhand") continue;
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				ret[plNum] += money[stype][plNum];
			}
		}
		if (forLiveScore) {
			return ret;
		} else {
			// actually add money/influence if it's not for live score
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				this.players[plNum].addMoney(ret[plNum]);
				this.players[plNum].addInfluence(gainedInfl[plNum]);
			}
			// save money for as stats
			this.stats.scoring = money;
		}
	}

	finalResults() {
		// most money wins
		// tie breaker 1 - most art purchased
		// tie breaker 2 - most gallery visitors
		// tie breaker 3 - most assistants in play
		this.results = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			let numArtBought = this.art.filter((a) => (a.location.type === ARTLOC.DISPLAY || a.location.type === ARTLOC.SOLD) && a.location.plNum === plNum).length;
			let numVisitors = this.visitors.filter((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === plNum).length;
			let asstInPlay = 10 - this.players[plNum].assistants.filter((a) => a.location.type === ASSTLOC.DISCARD || a.location.type === ASSTLOC.UNEMPLOYED).length;
			let score = (((this.players[plNum].money * 32) + numArtBought * 32) + numVisitors * 16) + asstInPlay;
			this.results.push({player:plNum, money:this.players[plNum].money, score:score});
		}
		this.results.sort((a,b) => b.score - a.score);



	}

	evalCards(numNeeded, locType, auctionArtType = null, plNum ) {
		const artBonusTypes = Object.values(ARTTYPE);
		let getBonus = true;
		for (let i=0; i<4; i++) {
			if (!numNeeded[i]) continue;
			let numOfType = this.art.filter((a) => a.location.type === locType && a.location.plNum === plNum && a.type === artBonusTypes[i]).length;
			if (auctionArtType === artBonusTypes[i]) numOfType++;
			if (numOfType < numNeeded[i]) {
				getBonus = false;
				break;
			}
		}
		return getBonus;
	}

	neededHung(cardNum) {
		const bonus2 = [1,3,0,2];
		let numNeeded = [[1,1,1,1],[1,1,1,1]];
		numNeeded[0][cardNum] = 0;
		numNeeded[1][cardNum] = 2;
		numNeeded[1][bonus2[cardNum]] = 0;
		return numNeeded;
	}

	curatorValue(plNum, auctionArtType = null) {
		let totalBonus = 0;
		let cardNum = this.players[plNum].curator;
		let numNeeded = this.neededHung(cardNum);
		for (let bNum=0; bNum < numNeeded.length; bNum++) {
			let getBonus = this.evalCards(numNeeded[bNum], ARTLOC.DISPLAY, auctionArtType, plNum);
			if (getBonus) totalBonus += 10 + 5 * bNum; // 10 for bonus 0, 15 for bonus 1
		}
		return totalBonus;
	}

	neededSold(cardNum) {
		let numNeeded = [[0,0,0,0],[0,0,0,0],[0,0,0,0]];
		numNeeded[0][cardNum] = 1;
		numNeeded[1][(cardNum+1)%4] = 1;
		numNeeded[1][(cardNum+2)%4] = 1;
		numNeeded[2][(cardNum+3)%4] = 2;
		return numNeeded;
	}

	dealerValue(plNum, auctionArtType = null) {
		let totalBonus = 0;
		let cardNum = this.players[plNum].dealer;
		let numNeeded = this.neededSold(cardNum);
		for (let bNum=0; bNum < numNeeded.length; bNum++) {
			let getBonus = this.evalCards(numNeeded[bNum], ARTLOC.SOLD, auctionArtType, plNum);
			if (getBonus) {
				totalBonus += 5; // 5 for bonus 0
				if (bNum) totalBonus += 5;	// 10 for bonus 1/2
			}
		}
		return totalBonus;

	}

	bagEmpty() {
		// return true if no visitors in BAG
		if (this.visitors.find((v) => v.location.type === VISITORLOC.BAG)) return false;

		return true;
	}

	visitorsIn(l, color, plNum) {
		let locTypes;
		if (typeof l === 'string') {
			locTypes = [l];
		} else {
			locTypes = l;
		}
		return this.visitors.filter((v) => 
			v.color === color && 
			locTypes.includes(v.location.type) &&
			(typeof v.location.plNum === 'undefined' || v.location.plNum === plNum));

	}

	numVisitorsIn(l, color, plNum) {
		return this.visitorsIn(l, color, plNum).length;
	}

	pickVisitor(fromLoc, colors = Object.values(VISITORCOLOR)) {
		// fromloc is PLAZA or BAG
		// returns array of available visitors (indexes)
		let ret = [];
		let vFlag = false;
		for (let i=0; i < colors.length; i++) {
			// find a visitor of each color specified
			let vi = this.visitors.findIndex((v) => v.color === colors[i] && v.location.type === fromLoc);
			if (vi != -1) {
				vFlag = true; // we found a visitor of color allowed by choice
				// if white visitor and player already has max white ( > numSold) skip it
				if (colors[i] === VISITORCOLOR.WHITE && this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer) > this.playerHasSold().length) continue;
				ret.push(vi);
			}
		}
		if (ret.length === 0 && fromLoc === VISITORLOC.PLAZA) {
			// if no visitors of correct colors available and it is 'pick from plaza' then player gets same choice from bag
			// unless choice included white AND player is at limit of white AND only white available, player gets nothing
			if (!vFlag) ret = this.pickVisitor(VISITORLOC.BAG, colors);	

		}
		return ret;
	}

	// updateVisitors(locs) {
	// 	for (let loc of locs) {
	// 		// update the num field for visitors
	// 		let vInLoc = this.visitors.filter((v) => v.location.type === loc.type && (loc.type === VISITORLOC.PLAZA || v.location.plNum === loc.plNum));
	// 		for (let i=0; i < vInLoc.length; i++) {
	// 			vInLoc[i].location.num = i;
	// 		}
	// 	}
	// 	return;
	// }

	visitorsToArt(art, artType) {
		for (let i = 0; i < art.numTixBonus; i++) {
			let vFromBag = this.getRandomFromBag();
			if (vFromBag) {
				// if there was a visitor pulled from bag, move to art
				vFromBag.moveVisitorTo({type:VISITORLOC.ART, artType:artType});
				// check if bag empty
				if (!this.getFlag(FLAG.BAG_EMPTY)) {
					if (this.bagEmpty()) {
						this.setFlag(FLAG.BAG_EMPTY);
						// TODO add msg
						this.checkEndGame();
					}
				}

			} else {

				break;
			}
		}

	}

	getEABonusClicks(getClickables = false) {
		let clickables = [];
		if (!this.getFlag(FLAG.DID_EA)) {
			// can player use contract bonus?
			// player has available asst?
			if (this.players[this.activePlayer].assistants.find((a) => a.location.type === ASSTLOC.DESK ||  a.location.type === ASSTLOC.ACTION || a.location.type === ASSTLOC.KO)) {
				let playerContracts = this.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === this.activePlayer);
				for (let pc of playerContracts) {
					// player has contract without used bonus?
					if (!this.players[this.activePlayer].assistants.find((a) => (a.location.type === ASSTLOC.CONTRACTBONUS || a.location.type === ASSTLOC.SOLDBONUS) && a.location.num === pc.num)) {
						clickables.push(this.obj2Str({type:CLICKITEM.CONTRACT, num:pc.num}));
					}
				}
			}
		} 
		return getClickables ? clickables : clickables.length;
	}

	moveTix(tixColor, tixNum, toLoc) {
		// use only to discard and for debug.
		// use playerGetsTix for other stuff
		this.tickets[tixColor][tixNum] = toLoc;
		return;
	}

	getKOpiece() {
		// for any piece return player number in .playerIdx
		// for player piece return link to player in .player, otherwise return null
		// for asst, return link to asst in .asst and asst# in asstIdx
		let ret = {player:null, asst:null, playerIdx:null, asstIdx:null};
		ret.playerIdx = this.players.findIndex((p) => p.location.type === PLAYERLOC.KO);
		if (ret.playerIdx == -1) {
			// no player piece kicked out, check assistants for each player
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				ret.asstIdx = this.players[plNum].assistants.findIndex((a) => a.location.type === ASSTLOC.KO);
				if (ret.asstIdx != -1) {
					ret.playerIdx = plNum;
					ret.asst = this.players[plNum].assistants[ret.asstIdx];
				}
			}
		} else {
			// player piece kicked out
			ret.player = this.players[ret.playerIdx];
		}
		return ret;

	}

	setFlag(bitMask) {
		this.flags |= bitMask;
	}

	clearFlag(bitMask) {
		this.flags &= ~(bitMask);
	}

	// setFlag(val, bitMask) {
	// 	let setMask = 1 << bitMask;
	// 	if (val) {
	// 		this.flags |= setMask;
	// 	} else {
	// 		let mask = 0xffffffff ^ setMask;
	// 		this.flags &= mask;
	// 	}
	// }
	resetTurnFlags() {
		const mask = ~(FLAG.DID_EA | FLAG.DEALT_CONTRACTS | FLAG.ART_BOUGHT | FLAG.UPDATE_CONTRACTS);
		this.flags &= mask;
	}

	resetRoundFlags() {
		const mask = ~(FLAG.DID_EA | FLAG.DID_ACTION | FLAG.DID_KO | FLAG.DEALT_CONTRACTS | FLAG.ART_BOUGHT | FLAG.UPDATE_CONTRACTS);
		this.flags &= mask;
	}

	resetFlags() {
		this.flags = 0;
	}


	substackEnd(offset = 0) {
		if (this.substack.length) return this.substack[this.substack.length-1-offset];
		return;
	}

	logMsg(msg) {
		let tmp = msg;
		for (let i=1; i<arguments.length; i++) {
			tmp = tmp.concat(':', arguments[i]);
		}
		this.log.push(tmp);		
	}

	gameComplete() {
		return (this.state === GAMESTATE.FINALSCORE);
	}

	serialize(playerId = null) {
		let obj = {clickables:[], msgs:[], moveNum:this.moves.length};
		let tmp;
		let playerIndex = this.players.findIndex((p) => p.playerId === playerId );
		if (playerId && playerId != "server") {
			obj.playerNum = playerIndex;
			if (playerIndex === this.activePlayer && this.state != GAMESTATE.FINALSCORE) {
				tmp = this.getActiveSpaces();
				obj.clickables = tmp.clickables;
				obj.msgs = tmp.msgs;
			} else {
				// moved to client
				// obj.msgs.push(this.players[this.activePlayer].name + " is taking their turn.");
			}
			// add live scoring
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				if (this.state == GAMESTATE.FINALSCORE) {
					obj.score = '';
				} else {
					obj.score = this.finalScore(true);
				}
			}
			// add auction works values
			let auctionWorks = this.art.filter((a) => a.location.type === ARTLOC.AUCTION);
			for (let art of auctionWorks) {
				if (!obj.auction) obj.auction = {};
				let val = this.auctionValue(art).value;
				obj.auction[art.type] = val;
			}

			// obj.soldcard/hungcard will be array of objects like:
			// [{"paint":1},{"sketch":2,"photo":1,"abstract":1}]
			// each array entry is the bonus reqs
			const artBonusTypes = Object.values(ARTTYPE);
			obj.soldcard = [];
			let numNeeded = this.neededSold(this.players[playerIndex].dealer);
			for (let i of numNeeded) {
				tmp = {};
				for (let j=0; j < i.length; j++) {
					tmp[artBonusTypes[j]] = i[j];
				}
				obj.soldcard.push(tmp);
			}

			obj.hungcard = [];
			numNeeded = this.neededHung(this.players[playerIndex].curator);
			for (let i of numNeeded) {
				tmp = {};
				for (let j=0; j < i.length; j++) {
					tmp[artBonusTypes[j]] = i[j];
				}
				obj.hungcard.push(tmp);
			}

		}
		for(let k of Object.keys(this)) {
			switch (k) {
				case "currentPlayer":
				case "seed":
				case "origSeed":
				case "moves":
				case "substack":
					// above only serialized for server
					if (playerId != "server") break;
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
					// these are straightforward to stringify
					obj[k] = this[k];
					break;
				// case "log":
					// let logSendSize = Math.min(logsize, this.log.length);
					// if (logsize === 0) logSendSize = this.log.length;
					// obj[k] = this[k].slice(this.log.length - logSendSize);
					// break;
				case "artists":
				case "art":
				case "contracts":
				case "repTiles":
				case "players":
				case "visitors":
					// arrays
					obj[k] = this.arraySerialize(this[k], playerId);
					
					break;
				// 	break;

				default:
					break;
			}
		}
		return obj;
	}
	arraySerialize(a, playerId) {
		let obj = [];
		for (let itm of a) {
			obj.push(itm.serialize(this.state === GAMESTATE.FINALSCORE ? "server" : playerId));
		}
		return obj;
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
			case CLICKITEM.ART:
				return o.type + "-" + o.artType + "-" + o.num;
			case CLICKITEM.ARTIST:
				return o.type + "-" + o.color + "-" + o.artType;
			case CLICKITEM.ASSISTANT:
				return o.type + "-" + this.activePlayer + "-" + o.num;
			case CLICKITEM.THUMB:
				return o.type +  "-" + o.level + "-" + o.num;
			case CLICKITEM.HIREASST:
			case CLICKITEM.CONTRACT:
			case CLICKITEM.VISITOR:
			case CLICKITEM.REPTILE:
			case CLICKSPACE.CONTRACT:
			case CLICKSPACE.INFLUENCE:
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
}


export {
	ArtistServer,
	ArtServer,
	ContractServer,
	PlayerServer,
	GameServer,
	VisitorServer }


