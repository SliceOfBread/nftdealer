
import {
	DEBUG,
	ACTIONLOC,
	NFTISTCOLOR,
	NFTLOC,
	NFTTYPE,
	HELPERLOC,
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
	MARKETCOL2CRED,
	MAXCRED,
	MAXREPTILES,
	PLAYERLOC,
	REPTILELOC,
	SIGLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORCOLOR,
	VISITORLOC} from '../public/js/egalconstants.mjs';

import {
	Nft,
	Nftist,
	Helper,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} from '../public/js/common.mjs';

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


class NftServer extends Nft {
	constructor(type, num) {
		super (type, num)
	}
	moveArtTo(location) {
		
		this.location = location;
	}


}

class NftistServer extends Nftist {
	constructor() {
		super();
	}
	init(game, type, color, num, bonus) {
		this.type = type;
		this.color = color;
		this.num = num;
		this.thumb = num;
		if (type === NFTTYPE.GALAXY || type === NFTTYPE.DEJACAT) {
			this.initReknown = 3;
			if (color === NFTISTCOLOR.BLUE) this.initReknown -= num;
		}
		if (color === NFTISTCOLOR.RED) {
			this.initReknown += 4;
			this.thumb += 2;
			// let wv = Visitor.getColorFrom(game.visitors, VISITORCOLOR.WHITE,VISITORLOC.BAG);
			let wv = game.visitors.find((v) => v.color === VISITORCOLOR.WHITE && v.location.type === VISITORLOC.BAG);
			if (wv) {
				wv.moveVisitorTo({type:VISITORLOC.NFTIST, nftType:type});
			} else {
				throw "Could not find a WHITE visitor for nftist init";
			}
			
		}
		if (num) {
			this.initReknown += 3;
		}
		this.reknown = this.initReknown;
		this.bonus = bonus;
		this.sigTokens[0] = {location:SIGLOC.NFTIST};
		this.sigTokens[1] = {location:SIGLOC.NFTIST};
	}
	increaseReknown() {
		if (this.reknown > 18) {
			// TODO error
			return;
		}
		this.reknown++;
		if (this.reknown === 19) return true;
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
				case "reknown":
				case "initReknown":
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
	constructor(NFTTYPE, BONUSTYPE, num) {
		super(NFTTYPE, BONUSTYPE, num)
	}
}

class VisitorServer extends Visitor {
	constructor(color) {
		super(color);
	}
	moveVisitorTo(toLocation) {
		this.location = toLocation;

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
				this.helpers.push(new Helper(i));
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
				case "cred":
				case "location":
					obj[pk] = this[pk];
					break;

				case "helpers":
					// serialize each helper
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
	addCred(val) {
		let amt = val;
		if (this.cred + amt > MAXCRED) {
			amt = MAXCRED - this.cred;
		} else if (this.cred + amt < 0) {
			// error
			console.log('error: cred went negative');
		}
		this.cred += amt;
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
			let a = new NftistServer();
			this.nftists.push(a);
		}
		for (let t of Object.values(NFTTYPE)) {
			for (let i=0; i < 8; i++) {
				this.nft.push(new NftServer(t, i));
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
		for (let t of Object.values(NFTTYPE)) {
			for (let b of Object.values(CONTRACTBONUS)) {
				if (b === CONTRACTBONUS.CRED && (t === NFTTYPE.GALAXY || t === NFTTYPE.PHAKELAND)) continue;
				if (b === CONTRACTBONUS.MONEY && (t === NFTTYPE.DEJACAT || t === NFTTYPE.ABSTRACT)) continue;
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
		// filter array of nft to include only type and only on pile
		let nftOfType = this.nft.filter((a) => a.type === type);
		if (nftOfType.filter((a) => a.location.type === NFTLOC.PILETOP).length) {
			throw "Tried to set a second PILETOP!";
			// TODO change this error
		}
		let nftPile = nftOfType.filter((a) => a.location.type === NFTLOC.PILE);
		if (nftPile.length) {
			let a = this.randomArrayItem(nftPile);
			a.location.type = NFTLOC.PILETOP;
			return a;
		} else {
			// TODO message? no more nft of type?
			return false;
		}
	}

	topOfArtPile(type) {
		return  this.nft.find((a) => a.type === type && a.location.type === NFTLOC.PILETOP);
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

	cred2Next5(cred) {
		return (cred % 5) ? (cred % 5) : 5;
	}
	
	getUsableCred() {
		let plInf = this.players[this.activePlayer].cred;
		if (this.thisIsKO())  {
			// decrease players useful cred by amount player needs to spend to do KO
			plInf -= this.cred2Next5(plInf);
		}
		return plInf;
	}

	playerCanAfford(canAffordAmount, addlCred = 0) {
		return this.players[this.activePlayer].money + this.cred4discount(this.getUsableCred() + addlCred) >= canAffordAmount;
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

	playerMadeMagnate(nftistIdx) {
		this.logMsg("CELEB", this.activePlayer, nftistIdx, 5);
		this.players[this.activePlayer].addMoney(5);
		if (!this.getFlag(FLAG.TWO_MAGNATE)) {
			if (this.nftists.filter((a) => a.reknown > 18).length > 1) {
				this.setFlag(FLAG.TWO_MAGNATE);
				this.logMsg("ENDCOND");
				this.checkEndGame();
			}
		}
	}
	// getEmptyDesk() {
	// 	let aList = this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.DESK);
	// 	// No desks available?
	// 	if (aList.length > 3) return null;
	// 	// Find lowest unoccupied desk
	// 	for (let i = 0; i < 4; i++) {
	// 		if (aList.find((a) => a.location.num === i)) continue; // desk occupied, skip it
	// 		return i;
	// 	}
	// 	// error
	// 	// throw "Less than 4 helpers at desks but no desk available?";
	// 	// for now, return null
	// 	return null;
	// }

	hireHelper() {
		let helper = this.getUnemployed();
		if (!helper) return;
		this.logMsg("HELPER2", this.activePlayer, "HIRED");
		// get hiring bonus 
		// (0,brown,pink,cred,0,bpw*,0,money) 
		//  2   3    4    5   6  7   8  9
		switch (helper.num) {
			case 3:
				this.playerGetsTix(this.activePlayer, TIXCOLOR.BROWN);
				break;
			case 4:
				this.playerGetsTix(this.activePlayer, TIXCOLOR.PINK);
				break;
			case 5:
				{
					let bonus = this.bonusCred();
					this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORHIREBONUS");
					this.players[this.activePlayer].addCred(bonus);	
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
		this.sendHome(helper);

	}

	returnContractHelper(contract) {
		this.sendHome(this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.CONTRACTBONUS && a.location.num === contract.num));
	}

	sendHome(helper) {
		if (!helper) return;

		let numUsedDesks = this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.DESK).length;

		if (numUsedDesks < 4) {
			helper.moveHelperTo({type:HELPERLOC.DESK});
			this.logMsg("HELPER2", this.activePlayer, "SENTHOME")
			// helper.location = {type:HELPERLOC.DESK, num:ed};
		} else {
			helper.moveHelperTo({type:HELPERLOC.DISCARD});
			this.logMsg("HELPER2", this.activePlayer, "SENTDISC")
			// helper.location = {type:HELPERLOC.DISCARD};
		}
	}

	cred4discount(cred) {
		const credDiscount = [0,1,2,2,2,3,3,3,3,4,4,4,4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 9,10,10,11,12,13,14,15,16,17,18,19];
		return credDiscount[cred];
	}

	cred2money(cred) {
		const credValue = [0,1,1,1,2,2,2,2,3,3,3,3,4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9,10,11,12,13,14,15,16,17,18,20];

		return (cred > credValue.length-1) ? 20 : credValue[cred];

	}
	credNextMark(cred) {
		const nextMark = [0,0,1,1,1,4,4,4,4,8,8,8,8,12,12,12,15,15,15,18,18,20,20,22,22,24,24,26,27,28,29,30,31,32,33,34];
		return nextMark[cred];
	}

	bonusCred(plNum = this.activePlayer) {
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
					} else if (koPiece.helper) {
						// send player helper home
						this.sendHome(koPiece.helper);
					} // else no KO piece, possible if helper was used in KO
					this.currentPlayer = this.nextPlNum(this.currentPlayer);
					this.activePlayer = this.currentPlayer;
					this.checkLastRound();
					this.resetRoundFlags();
					if (this.state === GAMESTATE.PICKACTION) {
						this.turnNum++;
						this.logMsg("TAKESTURN", this.activePlayer, this.turnNum);
					}
				} else {
					// if there was a kickout, that player is next
					// unless it was active player, then helper goes home (this already done in EAorEndTurn)
					let koPiece = this.getKOpiece();
					if (koPiece.player) {
						this.activePlayer = koPiece.playerIdx;
						// checkKO = true;
						this.logMsg("DOESKO", this.activePlayer);

					} else if (koPiece.helper && koPiece.playerIdx != this.activePlayer) {
						this.activePlayer = koPiece.playerIdx;
						// checkKO = true;
						this.logMsg("DOESKO", this.activePlayer);

					} else if (koPiece.playerIdx === this.activePlayer) {
						// player's own ast KOed
						this.sendHome(koPiece.helper);
						koPiece.helper = null;
					}
					
					this.resetTurnFlags();
					// if above did not find another player/helper in ko loc
					// OR if player cannot do any Ko action then turn is over, next player
					// otherwise activePlayer does KOpickAction
					// if player WAS KOed but can't do anything, send them home!
					if (!(koPiece.player || koPiece.helper) || !this.getKoActionClicks(locationKO)) {
						// if no kickout, then next player (unless game over)
						this.currentPlayer = this.nextPlNum(this.currentPlayer);
						this.activePlayer = this.currentPlayer;
						// if there was a piece kicked out but nothing to do, send home
						if (koPiece.player) {
							// send player piece home
							koPiece.player.movePlayerTo({type:PLAYERLOC.HOME});
						} else if (koPiece.helper) {
							// send player helper home
							this.sendHome(koPiece.helper);
						} // else no KO piece
	
						this.checkLastRound();
						this.resetRoundFlags();
						if (this.state === GAMESTATE.PICKACTION) {
							this.turnNum++;
							this.logMsg("TAKESTURN", this.activePlayer, this.turnNum);
						}
					} else {
						// this.setPlayerDealtContracts(0);
						// this.setPlayerDidEA(0);
						switch (locationKO) {
							case ACTIONLOC.SALES:
								this.state = GAMESTATE.KOSALES;
								break;
							case ACTIONLOC.NFT :
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
					this.turnNum++;
					this.logMsg("TAKESTURN", this.activePlayer, this.turnNum);
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
			// https://boardgamegeek.com/thread/2114626/nfticle/30757602#30757602
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				let bonus = this.bonusCred(plNum);
				this.logMsg("RCVSCRED",plNum,bonus,"FORMID");
				this.players[plNum].addCred(bonus);

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
		this.turnNum = 0;

		// init bonus tiles
		let tmpBonusTile = [];
		// there are ten bonus tiles (2 each of 5 types)
		tmpBonusTile.push(BONUSTYPE.CRED);
		tmpBonusTile.push(BONUSTYPE.MONEY);
		tmpBonusTile.push(BONUSTYPE.REKNOWN);
		tmpBonusTile.push(BONUSTYPE.TWOTIX);
		tmpBonusTile.push(BONUSTYPE.PLAZAVISITOR);
		tmpBonusTile.push(BONUSTYPE.CRED);
		tmpBonusTile.push(BONUSTYPE.MONEY);
		tmpBonusTile.push(BONUSTYPE.REKNOWN);
		tmpBonusTile.push(BONUSTYPE.TWOTIX);
		tmpBonusTile.push(BONUSTYPE.PLAZAVISITOR);


		//init nftists
		for (let n=0; n<8; n++) {
			let a = this.nftists[n];
			let nftType = Object.values(NFTTYPE)[Math.floor(n/2)];
			let nftistColor = Object.values(NFTISTCOLOR)[n % 2];
			a.init(this, nftType, nftistColor, this.randomInt(0,1), this.removeRandomItem(tmpBonusTile));
		}

		// select blue nftist that starts discovered
		this.randomArrayItem(this.nftists.filter((a) => a.color === NFTISTCOLOR.BLUE)).discover();
		
		// remove unused visitors
		// for 3P game remove 2 of each
		// for 1/2P game, remove 4 each
		for (let i=0; i < [0,4,4,2,0][this.numPlayers]; i++) {
			for (let c of Object.values(VISITORCOLOR)) {
				this.visitors.find((v) => v.color === c && v.location.type === VISITORLOC.BAG).moveVisitorTo({type:VISITORLOC.DISCARD});
			}
		}

		// init nft pile top
		for (let t of Object.values(NFTTYPE)) {
			this.chooseArtPileTop(t);
		}
		// choose auction work(s)
		{
			// put pile top nft piece of each type into auction
			
			for (let t of Object.values(NFTTYPE)) {
				this.topOfArtPile(t).location.type = NFTLOC.AUCTION;
				// set new top of pile
				this.chooseArtPileTop(t);
			}
			// remove random auction pieces, until we have correct number
			// for 4P, choose 3 for auction
			// for 3P, choose 2
			// for 2P/1P, choose 1
			let auctionWorks = this.nft.filter((a) => a.location.type === NFTLOC.AUCTION);
			while (true) {
				// remove nft from auction
				let a = this.removeRandomItem(auctionWorks);
				a.location.type = NFTLOC.DISCARD;
				if (auctionWorks.length < this.numPlayers) break;
				if (auctionWorks.length === 1) break;
			}
		}
		// move some visitors to new nft
		for (let t of Object.values(NFTTYPE)) {
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
				for (let nftType of Object.values(NFTTYPE)) {
					let t = this.repTiles[count];
					t.init(this.removeRandomItem(rtNums));
					t.moveRepTileTo({type:REPTILELOC.INTLMARKET, nftType:nftType, col:c});
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
			v.moveVisitorTo({plNum:pl, type:VISITORLOC.LOBBY});
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
				if (this.getFlag(FLAG.NFT_BOUGHT) || this.getFlag(FLAG.UPDATE_CONTRACTS)) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.CONTINUE}));
					if (this.getFlag(FLAG.NFT_BOUGHT)) {
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
			case GAMESTATE.MARKET_HELPER:
			case GAMESTATE.EABONUS_HELPER:
				{
					// player to choose helper
					let plHelpers = this.getAvailableHelpers();
					let deskHelper = plHelpers.find((h) => h.location.type === HELPERLOC.DESK);
					if (deskHelper) plHelpers = [deskHelper];
					for (let helper of plHelpers) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.HELPER, num:helper.num}));
					}
					tmp.msgs.push("HELPER");
				}
				break;
			case GAMESTATE.EABONUS_CONTRACT:
			case GAMESTATE.SALES_MAIN:
			case GAMESTATE.SALES_GETCONTRACT:
			case GAMESTATE.SALES_SELLART:
			case GAMESTATE.SALES_VISITOR:
			case GAMESTATE.SALES_BONUSUP:
			case GAMESTATE.KO_GETCONTRACT:
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

			case GAMESTATE.NFT_MAIN:
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
				// use cred to reduce price or done
				{
					let tmpCred = this.players[this.activePlayer].cred;
					if (tmpCred && this.substackEnd()) {
						// if buying art, check if player needs to make nftist into magnate to fit art, if so, limit cred->money
						//   enough to allow cred->reknown (magnate)
						let playerNumWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
						let nft = this.substack.length > 4 ? this.nft[this.substackEnd(4)] : null;
						if (this.substack.length > 3 && this.substackEnd(3) === GAMESTATE.NFT_BUY && // player buying nft AND
							this.playerHasDisplayed().length === 3 &&	// player already has 3 nfts displayed AND
							!this.playerHasMasterpiece() &&	// player does not have masterpiece AND
							// nftist reknown + max player can incr reknown (if player uses cred4money) is less than 19
							this.nftists[this.substackEnd(2)].reknown + nft.reknownBonus.fixed + nft.reknownBonus.perWhite * playerNumWhite + Math.ceil(this.credNextMark(tmpCred)/5) < 19) {
							// if all above is true, do not allow cred4money

							
						} else {
							// if any of above is false, allow cred4money
							// if player has cred and price (on substack) > 0, show next mark down to reduce price by 1
							tmp.clickables.push(this.obj2Str({type:CLICKSPACE.CRED, num:this.credNextMark(tmpCred)}));
							tmp.msgs.push("CRED4COST".concat(":",this.substackEnd()-1));
						}
					}
					// only allow done if affordable
					if (this.substackEnd() <= this.players[this.activePlayer].money) {
						tmp.clickables.push(CLICKITEM.CONTINUE);
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONT2PAY", ":", this.substackEnd()));

					}
				}
				break;
			case GAMESTATE.INCRREKNOWN:
				// use cred to incr nftist reknown
				{
					let nftist = this.nftists[this.substackEnd()];
					if (this.players[this.activePlayer].cred && nftist.reknown < 19) {
						// if player has cred and nftist reknown can be increased
						tmp.clickables.push(this.obj2Str({type:CLICKSPACE.CRED, num:this.players[this.activePlayer].cred - this.cred2Next5(this.players[this.activePlayer].cred)}));
						tmp.msgs.push("CRED4REKNOWN".concat(":", this.substackEnd()));
					}
					if (this.substackEnd(1) != GAMESTATE.NFT_BUY || this.playerHasDisplayed().length < 3 || this.playerHasMasterpiece() || (nftist.reknown > 18)) {
						// only allow if not buying nft OR
						//   if space available for nft (<3) OR
						//   player has masterpiece or is now acquiring one
						// NOTE: no need to check if <4 spaces as that is done before nft can be bought
						tmp.clickables.push(CLICKITEM.CONTINUE);
						tmp.msgs.push("#".concat(CLICKITEM.CONTINUE, "#", "CONT2NOREKNOWN"));
					}
				}
				break;
			case GAMESTATE.THUMBARTIST:
				// let user choose an nftist to increase reknown
				// i.e. any discovered with thumb level one less than thumb level chosen
				{
					let nftistList = this.nftists.filter((a) => a.discovered && a.thumb === this.substackEnd()-1);
					for (let nftist of nftistList) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, nftType:nftist.type, color:nftist.color}))
					}
					tmp.msgs.push("PROMOARTIST"); 
				}
				break;
			case GAMESTATE.REKNOWNARTIST:
				// let user choose an nftist to increase reknown
				// i.e. any discovered, non-magnate nftist
				{
					let nftistList = this.nftists.filter((a) => a.discovered && a.reknown < 19);
					for (let nftist of nftistList) {
						tmp.clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, nftType:nftist.type, color:nftist.color}))
					}
					if (tmp.clickables.length) {
						tmp.msgs.push("REKNOWNARTIST");
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

			case GAMESTATE.LEAVEHELPER:
				// get all players helpers in action locs
				let tmpHelpers = this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.ACTION);
				for (let a of tmpHelpers) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.HELPER, plNum:this.activePlayer, num:a.num}));
				}
				tmp.msgs.push("HELPERLEAVE");
				tmp.clickables.push(CLICKITEM.DONOTHING);
				tmp.msgs.push("#".concat(CLICKITEM.DONOTHING,"#","DONTHELPER"));
				break;

			case GAMESTATE.FINALAUCTION:
				// auction off the auction works
				let auctionWorks = this.nft.filter((a) => a.location.type === NFTLOC.AUCTION);
				// show player choice
				for (let nft of auctionWorks) {
					tmp.clickables.push(this.obj2Str({type:CLICKITEM.NFT, nftType:nft.type, num:nft.num}));
					
					let value = this.auctionValue(nft).value;
					tmp.msgs.push("WORKWORTH".concat(":", nft.type, ":", value));
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
	
						case "nft":
							{	// {"test":1, "type":"nft", "nftType":"NFTTYPE.PHAKELAND", "byArtist":0, "location":{"type":"NFTLOC.SOLD", "plNum":0}}
								let nft = this.nft.find((a) => a.type === moves[i].nftType && a.location.type === NFTLOC.PILE);
								nft.moveArtTo(moves[i].location);
								nft.byArtist = moves[i].byArtist;
							}
							break;
	
						case "nftist":
							{	// {"test":1, "type":"nftist", "color":"NFTISTCOLOR.RED", "nftType":"NFTTYPE.PHAKELAND", "reknown":14}
								let nftist = this.nftists.find((a) => a.type === moves[i].nftType && a.color === moves[i].color);
								nftist.discover();
								nftist.reknown = moves[i].reknown;
							}
							break;
	
						case "helper":
							{	// {"test":1, "type":"helper", "player":0, "helperNum":2, "location":{"type":HELPERLOC.INTLMARKET, "nftType":NFTTYPE.DEJACAT, "col":0}}
								this.players[moves[i].player].helpers[moves[i].helperNum].moveHelperTo(moves[i].location)
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
	
						case "cred":	// {"test":1, "type":"cred", "player":0, "cred":13}
							this.players[moves[i].player].cred = moves[i].cred;
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
					if (i==721) {
						let xx = 3;
					}

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
				// reduce cred 
				this.players[this.activePlayer].cred = this.getUsableCred();
				// this.logMsg("PLKONONE", this.activePlayer);
				// TODO log use of cred?				
				return false;
		}

	}

	processClick(move, speculation = false) {
		let pl = this.activePlayer;
		this.moves.push(move);
		let loc = move.location.split("-");
		let clicked = loc[0];
		let useHelper;
		let contractNum;
		let extraReknown = 0;

		switch (this.state) {
			case GAMESTATE.KOSALES:
				//  is it an EA?
				//  is it DONOTHING?
				// this.setplayerDidKO(1);
				// clickedEaOrNothing will alter state for EATIX EABONUS and NOTHING
				// clickedEaOrNothing reduces cred (ensure it only does this once)
				//  as will happen when we show 4 more contracts
				if (!this.getFlag(FLAG.DID_KO) && this.clickedEaOrNothing(clicked)) return;
				//  must be sales action
			case GAMESTATE.SALES_MAIN:
				this.setFlag(FLAG.DID_ACTION);
			case GAMESTATE.KO_GETCONTRACT:
			case GAMESTATE.EABONUS_CONTRACT:
				if (clicked === CLICKITEM.NFT) {
					// selling nft, next get contract to use
					this.state = GAMESTATE.SALES_SELLART;
					// remember nft clicked
					this.substack.push(this.nft.findIndex((a) => a.type === loc[1] && a.num === Number(loc[2])));
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
					if (this.state === GAMESTATE.KOSALES) {
						this.state = GAMESTATE.KO_GETCONTRACT;
					} // otherwise this.state unchanged
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					this.playerDidNothing();

					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else if (clicked === CLICKITEM.DONOTHING) {
					this.logMsg("DOESNOTHING", this.activePlayer);

					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else {
					// error
				}
				break;
			case GAMESTATE.SALES_SELLART:
				if (clicked === CLICKITEM.CONTRACT) {
					// let nft = this.nft[this.remember.nftIndex];
					let nftIdx = this.substack.pop();
					let nft = this.nft[nftIdx];
					// this.remember.contractIndex = loc[1];
					let contractIndex = Number(loc[1]);
					this.substack.push(contractIndex);
					let salePrice = this.nftists[nft.byArtist].getValue();
					this.logMsg("SELLSART", this.activePlayer, nft.byArtist, salePrice);
					this.players[pl].money += salePrice;
					// return signature
					let nftist =  this.nftists[nft.byArtist];
					let sig = nftist.sigTokens.find((s) => s.location === SIGLOC.NFT && s.nftNum === nftIdx);
					sig.location = SIGLOC.NFTIST;
					// move nft to "sold"
					nft.moveArtTo({type:NFTLOC.SOLD, plNum:pl});
					// if helper on contract, send home
					this.returnContractHelper(this.contracts[contractIndex]);
					// flip contract
					this.contracts[contractIndex].faceUp = false;
					// default contract to moneyUp (for better animation)
					this.contracts[contractIndex].moneyUp = true;

					// if player has visitor in gallery, player must choose a visitor to leave with nft
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
						// send helper home, if any
						this.returnContractHelper(this.contracts[loc[1]]);
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
						if (!speculation) this.setFlag(FLAG.UPDATE_CONTRACTS);
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
				// must be nft action
			case GAMESTATE.NFT_MAIN:
				// this.setPlayerDidAction(1);
				this.setFlag(FLAG.DID_ACTION);

				// all clicks are nftists
				// determine if it was to buy or to discover
				let clickedArtistIdx = this.nftists.findIndex((a) => (a.type === loc[2] && a.color === loc[1]));
				let clickedArtist = this.nftists[clickedArtistIdx];
				if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					this.playerDidNothing();
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else if (clickedArtist.discovered) {
					// buy nft
					let nftworkIdx = this.nft.findIndex((a) => a.type === loc[2] && a.location.type === NFTLOC.PILETOP);
					// get cost (different for commission)
					let price = clickedArtist.reknown;
					let commArtist = this.playerHasCommission();
					if (commArtist === clickedArtist) {
						price = commArtist.initReknown;
					}
					this.logMsg("BUYSART", this.activePlayer, clickedArtistIdx, price);
					this.substack.push(nftworkIdx);			// needed for moving nft
					this.substack.push(GAMESTATE.NFT_BUY);	// state after both decrease price and incr reknown
					this.substack.push(clickedArtistIdx);	// needed for incr reknown using cred
					this.substack.push(GAMESTATE.INCRREKNOWN);
					this.substack.push(price);				// needed for dec price using cred
					// get discounts from cred
					this.state = GAMESTATE.DECRPRICE;
					// pay for nft (done after DECRPRICE)
					// increase nftist reknown (done at end of DECRPRICE)
					// addl reknown from cred (done during INCRREKNOWN)
					// visitors to plaza (done during INCRREKNOWN)
					// get tix from nft (done during INCRREKNOWN)
					// move to gallery (possible reptile) (done during INCRREKNOWN)
					// get sig (done during INCRREKNOWN)
					// new nft gets visitors (done during EAOREND)
				} else {
					// discover nftist
					this.logMsg("DISCOVERS", this.activePlayer,clickedArtistIdx);
					// if red nftist, move white visitor to plaza
					if (clickedArtist.color === NFTISTCOLOR.RED) {
						let nftVisitor = this.visitors.find((v) => v.location.type === VISITORLOC.NFTIST && v.location.nftType === clickedArtist.type);
						if (nftVisitor) {
							nftVisitor.moveVisitorTo({type:VISITORLOC.PLAZA});
						} else {
							// TODO error
						}
					}
					// flip nftist and initialize
					clickedArtist.discover();
					// move sig to player
					clickedArtist.moveSigToken({location:SIGLOC.COMMISSION, plNum:this.activePlayer}, 0);
					// gain bonus
					this.state = GAMESTATE.EAOREND;
					switch (clickedArtist.bonus) {
						case BONUSTYPE.CRED:
							// get cred bonus
							{
								let bonus = this.bonusCred();
								this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addCred(bonus);	
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
						case BONUSTYPE.REKNOWN:
							// have player choose an nftist for reknown increase
							this.substack.push(this.state);
							this.logMsg("RCVSREKNOWN",this.activePlayer);
							this.state = GAMESTATE.REKNOWNARTIST;
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
					// pay cred
					let thumbLevel = Number(loc[1]) + 1;
					this.logMsg("DOESTHUMB", this.activePlayer, thumbLevel);
					this.players[this.activePlayer].addCred( -thumbLevel);
					// next state will be to select an nftist (unless a player choice comes before)
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
							// cred
							{
								let bonus = this.bonusCred();
								this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORPROMO");
								this.players[this.activePlayer].addCred(bonus);	
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

				// } else if (clicked === CLICKITEM.HELPER) {
				} else if (clicked === CLICKITEM.HIREHELPER) {
					{
						// hiring helper(s)
						const hireCost = [0,0,1,2,2,3,3,4,5,6];
						let totalCost = 0;
						let helperNum = this.getUnemployed().num;
						for (let i=0; i < Number(loc[1]); i++) {
							totalCost += hireCost[helperNum];
							helperNum++;
						}
						// after paying, player will get helpers/bonuses using hireHelper
						// note: we never go into MEDIA_HELPERS state. It is used to determine where to go after DECRPRICE
						this.substack.push(Number(loc[1]));
						this.substack.push(GAMESTATE.MEDIA_HELPERS);
						// go to DECRRICE state
						this.substack.push(totalCost);
						this.state = GAMESTATE.DECRPRICE;
					}
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					this.playerDidNothing();
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
					// gain cred for col
					let column = repTile.location.col;
					this.logMsg("RCVSCRED", this.activePlayer, MARKETCOL2CRED[column], "FORCOL");
					this.logMsg("GETSTILE", this.activePlayer, repTile.tNum);
					this.players[this.activePlayer].addCred(MARKETCOL2CRED[column]);

					// move visitor from lobby to plaza (requires player choice)
					// note: player must have visitor in lobby to do MARKET action 
					this.substack.push(GAMESTATE.VISITOR2PLAZA);

					// place repTile, gain bonus (requires player choice)
					this.substack.push(Number(loc[1]));
					this.substack.push(GAMESTATE.PLACEREPTILE);

					// choose helper and move to space
					let nftType = repTile.location.nftType;
					this.substack.push({type:HELPERLOC.INTLMARKET, nftType:nftType, col:(3 - MARKETCOL2CRED[column])});
					this.state = GAMESTATE.MARKET_HELPER;
					
				} else if (clicked === CLICKSPACE.AUCTION) {
					let row = Number(loc[1]);
					let column = Number(loc[2]);
					this.logMsg("RCVSCRED", this.activePlayer, 3-column, "FORCOL");
					// gain cred for col
					this.players[this.activePlayer].addCred(3-column);

					this.substack.push(GAMESTATE.EAOREND);
					// gain bonus (do this last)
					const bonuses = [
						[BONUSTYPE.ONETIX, BONUSTYPE.HELPER, BONUSTYPE.TWOTIX],
						[BONUSTYPE.HELPER, BONUSTYPE.CRED, BONUSTYPE.MONEY],
						[BONUSTYPE.PLAZAVISITOR, BONUSTYPE.MONEY, BONUSTYPE.CRED]];
					this.substack.push(bonuses[row][column]);
					this.substack.push(GAMESTATE.AUCTION_BONUS);

					// move helper to space
					this.substack.push({type:HELPERLOC.AUCTION, row:row, col:column});
					this.substack.push(GAMESTATE.MARKET_HELPER);

					// pay cost (may use cred)
					let cost = row===0 ? 1 : row*3;
					this.logMsg("PLACEAUCTION",this.activePlayer, cost);
					this.substack.push(cost); 
					this.state = GAMESTATE.DECRPRICE;
					
				} else if (clicked === CLICKITEM.ENDBUTTON) {
					this.logMsg("DOESNOTHING", this.activePlayer);
					this.playerDidNothing();
					// change state to do EA or ENDTURN
					this.EAorEndTurn();
				} else {
					// TODO error
				}
				break;
			case GAMESTATE.MARKET_HELPER:
				// helper chosen, move to correct location
				useHelper = this.players[this.activePlayer].helpers[loc[2]];
				useHelper.moveHelperTo(this.substack.pop()); // note: helper moveTo clones "to location"

				// goto state on stack
				this.state = this.substack.pop();

				if (this.state != GAMESTATE.AUCTION_BONUS) break;
			// case GAMESTATE.AUCTION_BONUS:	// NOTE: this state is only used temporarily
				switch (this.substack.pop()) {
					case BONUSTYPE.CRED:
						// get cred bonus
						{
							let bonus = this.bonusCred();
							this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORBONUS");
							this.players[this.activePlayer].addCred(bonus);	
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
					case BONUSTYPE.HELPER:
						this.state = this.substack.pop();				
						this.hireHelper(); // may change state
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
								this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.GALLERY, plNum:this.activePlayer});

							} else {
								// other player's lobby, move to plaza
								this.logMsg("USESTIX", this.activePlayer, vColor, "PLAZA");
								let fromPlayer = this.visitors[Number(loc[1])].location.plNum;
								this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.PLAZA});
							}
						} else {
							// move to player's lobby from plaza
							this.logMsg("USESTIX", this.activePlayer, vColor, "PLLOBBY");
							this.visitors[Number(loc[1])].moveVisitorTo({type:VISITORLOC.LOBBY, plNum:this.activePlayer});
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
			case GAMESTATE.EABONUS_HELPER:
			case GAMESTATE.EABONUS_MAIN:
				// this.setPlayerDidEA(1);
				this.setFlag(FLAG.DID_EA);
	
				// contract selected (for bonus)
				// did player select helper already (EABONUS_HELPER) OR
				// helper at desk OR
				// helper in KO space OR
				// only one helper on board use one automatically
				// if none of the above, it must be multiple on board
				// give player choice of them
				if (clicked === CLICKITEM.CONTRACT) {
					// not coming from state===EABONUS_HELPER
					// check for helpers at desk
					// useHelper = this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.DESK);
					// contractNum = loc[1];
	
					// if (!useHelper) {
					// 	// no helper at desk, check KO locations
					// 	useHelper = this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.KO);
					// 	if (!useHelper) {
					// 		// no helper in KO position, check action locations
					// 		let plHelpers = this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.ACTION);					
					// 		if (plHelpers.length === 1) {
					// 			// only one helper avail and on an action loc
					// 			useHelper = plHelpers[0];
					// 		} else {
								// need to remember contract that was selected
								this.substack.push(Number(loc[1]));
								// get helper choice from player
								this.state = GAMESTATE.EABONUS_HELPER;
								return;
					// 		}
					// 	} 
					// }
				} else {
					// must be helper
					useHelper = this.players[this.activePlayer].helpers[loc[2]];
					contractNum = this.substack.pop();
				}

				// move helper to contract
				this.logMsg("HELPER2", this.activePlayer, "SENTCONT");
				useHelper.moveHelperTo({type:HELPERLOC.CONTRACTBONUS, num:contractNum});

				// do bonus (or change to state that will)
				// NOTE: bonuses are optional meaning you don't have to use them
				// the only case I can think of where it MIGHT make sense is you place
				// and helper on a CONTRACT bonus, even though you can't or don't want contract OR
				// use get HELPER but you don't want it OR
				// use one of the get visitor bonuses even though there is none to get because
				// you would otherwise not have desk space for all helpers
				let vList;
				if (this.contracts[contractNum].faceUp) {
					switch (this.contracts[contractNum].bonusType) {
						case CONTRACTBONUS.CONTRACT:
							// since this is an EA, we already have return state info on stack (PICKACTION/EAOREND/KOEA)
							// get a new contract, if possible
							this.logMsg("RCVSCONT",this.activePlayer)
							this.state = GAMESTATE.EABONUS_CONTRACT; 
							break;
						case CONTRACTBONUS.HELPER:
							// get next helper (might trigger other tix sel sub)
							this.state = this.substack.pop();
							this.hireHelper(); // may change state
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
						case CONTRACTBONUS.CRED:
							// get cred bonus
							{
								let bonus = this.bonusCred();
								this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addCred(bonus);	
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
					// back of contract bonus
					if (this.contracts[contractNum].moneyUp) {
						let bonus = this.bonusMoney();
						this.logMsg("RCVSMONEY",this.activePlayer,bonus,"FORBONUS");
						this.players[this.activePlayer].addMoney(bonus);

					} else {
						let bonus = this.bonusCred();
						this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORBONUS");
						this.players[this.activePlayer].addCred(bonus);	

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
					visitor.moveVisitorTo({type:VISITORLOC.GALLERY, plNum:this.activePlayer});
					// check if bag empty
					if (!this.getFlag(FLAG.BAG_EMPTY)) {
						if (this.bagEmpty()) {
							this.setFlag(FLAG.BAG_EMPTY);
							// TODO add msg?
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
							// gain cred
							{
								let bonus = this.bonusCred();
								this.logMsg("RCVSCRED",this.activePlayer,bonus,"FORBONUS");
								this.players[this.activePlayer].addCred(bonus);	
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
							// any nftist gains reknown
							this.state = GAMESTATE.REKNOWNARTIST;
							this.logMsg("RCVSREKNOWN",this.activePlayer);
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
							// get free helper
							this.state = this.substack.pop();
							this.hireHelper(); // may change state							
							break;
					
						default:
							break;
					}
				} else if (clicked === CLICKITEM.DONOTHING) {
					let repTileNum = this.substack.pop();

					this.logMsg("TILEDISC");
					this.repTiles[repTileNum].moveRepTileTo({type:REPTILELOC.DISCARD});
					this.state = this.substack.pop();

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
				// either used cred to reduce price or done
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
						if (this.state === GAMESTATE.INCRREKNOWN) {
							// only get here by buying nft
							// we just paid for nft, now incr reknown based on nft/white visitors
							let nftist = this.nftists[this.substackEnd()];
							if (nftist.reknown < 19) {
								// note: can buy from magnate but only as commission but reknown already maxed
								let nft = this.nft[this.substack[this.substack.length-3]];
								let playerNumWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
								nftist.reknown += nft.reknownBonus.fixed + nft.reknownBonus.perWhite * playerNumWhite;
								if (nftist.reknown >= 19) {
									nftist.reknown = 19;
									this.playerMadeMagnate(this.substackEnd());
								}
							}
						} else if (this.state === GAMESTATE.MEDIA_HELPERS) {
							// came from hire helpers
							this.state = GAMESTATE.EAOREND; // next state unless subroutine for onetix
							let num2hire = this.substack.pop();
							for (let i=0; i < num2hire; i++) {
								this.hireHelper();	// move next helper to desk and get bonus
							}
						}
					}
				} else if (clicked === CLICKSPACE.CRED) {
					// reduce cred to next mark
					let cred = this.players[this.activePlayer].cred;
					this.logMsg("USESCRED4M",this.activePlayer);
					this.players[this.activePlayer].addCred(this.credNextMark(cred) - cred);
					// reduce price by 1 (note: we only send CRED space if price>0 and we check incoming msgs vs sent)
					this.substack[this.substack.length-1]--;
				} else {
					// error TODO
				}
				break;
			case GAMESTATE.INCRREKNOWN:
				// either used cred to increase reknown or done
				if (clicked === CLICKITEM.CONTINUE) {
					// pop nftist idx
					let nftistIdx = this.substack.pop();
					let nftist = this.nftists[nftistIdx];
					// we could be here from player buying nft, disc nftist bonus, reptile bonus
					let fromState = this.substack.pop();
					if (fromState === GAMESTATE.NFT_BUY) {
						// nft is paid and nftist reknown is increased
						// this.setArtWasBought(1);
						this.setFlag(FLAG.NFT_BOUGHT);
						let nftworkIdx = this.substack.pop();
						let nft = this.nft[nftworkIdx];
						// move visitors to plaza
						let visitorsOnArt = this.visitors.filter((v) => v.location.type === VISITORLOC.NFT && v.location.nftType === nft.type);
						for (let v of visitorsOnArt) {
							v.moveVisitorTo({type:VISITORLOC.PLAZA});
						}
						// if player will get reptile (from 3rd nft), go to that state next (maybe, see tix bonus)
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
						// move nft to gallery
						nft.moveArtTo({type:NFTLOC.WALLET, plNum:this.activePlayer});
						// set which nftist produced nft
						nft.byArtist = nftistIdx;
						// this.logMsg("GETSART", this.activePlayer, nft.type, nftistIdx);
						// move sig to nft
						// if player has commission, use that token
						let sigIdx = nftist.sigTokens.findIndex((st) => st.location === SIGLOC.COMMISSION && st.plNum === this.activePlayer);
						// if player did not have commsission, get nftist token
						if (sigIdx != -1) this.logMsg("USEDCOMM", this.activePlayer);
						if (sigIdx === -1) sigIdx = nftist.sigTokens.findIndex((st) => st.location === SIGLOC.NFTIST);
						if (sigIdx != -1) {
							nftist.moveSigToken({location:SIGLOC.NFT, nftNum:nftworkIdx}, sigIdx);
						} else {
							// TODO error
						}
						// get tix due to nft (may need player interaction)
						for (let tBonus of nft.tixBonus) {
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
						// (after done) show new nft and add visitors
					} else {
						// go to state on stack
						this.state = fromState;
					}
				} else if (clicked === CLICKSPACE.CRED) {
					// reduce cred to next mod 5 space
					let cred = this.players[this.activePlayer].cred;
					this.logMsg("USESCRED4F",this.activePlayer);
					this.players[this.activePlayer].addCred(-this.cred2Next5(cred));
					// incr nftist reknown
					if (this.nftists[this.substackEnd()].increaseReknown()) {
						// if nftist reknown now 19 then magnate, player gets 5
						this.playerMadeMagnate(this.substackEnd());
					}
				} else {
					// error TODO
				}
				break;
			case GAMESTATE.THUMBARTIST:
				extraReknown = 1;
				{
					let thumbLevel = this.substack.pop(); // get new thumblevel from stack (1-5)
					let thumbLevelIdx = thumbLevel - 1; (0-4)
					let nftistIdx = this.nftists.findIndex((nftist) => nftist.color === loc[1] && nftist.type === loc[2]); // clicked nftist index
					let nftist = this.nftists[nftistIdx]; // clicked nftist
					// see if there's a thumb on nftist already
					let thumbIndex = -1;
					// don't check for previous level unless new thumb is 2 or more (there is no physical 0 thumb)
					if (thumbLevelIdx) thumbIndex = this.thumbs[thumbLevelIdx-1].findIndex((thumb) => thumb.color && thumb.color === nftist.color && thumb.nftType === nftist.type);
					if (thumbIndex != -1) {
						// remove old thumb
						this.thumbs[thumbLevelIdx-1][thumbIndex] = {};
					}
					// add new thumb to nftist
					thumbIndex = this.thumbs[thumbLevelIdx].findIndex((t) => !t.color); // unused thumb of correct level
					this.thumbs[thumbLevelIdx][thumbIndex] = {color:nftist.color, nftType:nftist.type};
					// update nftist thumb level
					nftist.thumb = thumbLevel;
					this.logMsg("THUMBSUP", this.activePlayer, nftistIdx, thumbLevel);
				}

			case GAMESTATE.REKNOWNARTIST:
				if (clicked === CLICKITEM.NFTIST) {
					// increase this nftist's reknown
					let nftistIdx = this.nftists.findIndex((a) => a.color === loc[1] && a.type === loc[2]);
					let nftist = this.nftists[nftistIdx];
					// note following is slightly different from buying nft as there is no nft bonus reknown
					if (nftist.reknown < 19) {
						// note: can buy from magnate but only as commission but reknown already maxed
						let playerNumWhite = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
						nftist.reknown += extraReknown + playerNumWhite;	// extraReknown only set by THUMBARTIST state
						this.logMsg("INCRREKNOWN", this.activePlayer, nftistIdx, Math.min(nftist.reknown, 19));
						if (nftist.reknown >= 19) {
							nftist.reknown = 19;
							this.playerMadeMagnate(nftistIdx);
						}
					}
					this.state = GAMESTATE.INCRREKNOWN;
					this.substack.push(nftistIdx);
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
					if (!speculation) this.endTurnRefill();
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
						
					// this case only if nftWasBought or needContractsDealt
					case CLICKITEM.CONTINUE:
						if (!speculation) {
							this.endTurnRefill();
						} else {
							// if speculation, just clear flags
							this.clearFlag(FLAG.NFT_BOUGHT);
							this.clearFlag(FLAG.UPDATE_CONTRACTS);
						}
						break;

					// this case only occurs in EAOREND
					case CLICKITEM.ENDBUTTON:
						// finalize turn and go to next player
						if (!speculation) this.endTurnRefill();
						this.nextPlayer();
						break;

					default:
						break;
				}
				break;
			case GAMESTATE.PICKACTION:
				{
					if (clicked == CLICKITEM.CONTINUE) {
						if (!speculation) {
							this.endTurnRefill();
						} else {
							// if speculation, just clear flags
							this.clearFlag(FLAG.NFT_BOUGHT);
							this.clearFlag(FLAG.UPDATE_CONTRACTS);
						}
						return;
					} else if (clicked === CLICKITEM.EATIX) {
						this.substack.push(GAMESTATE.PICKACTION);
						this.logMsg("PLEATIX", this.activePlayer);
						this.state = GAMESTATE.EATIX_MAIN;
						return;
					} else if (clicked === CLICKITEM.EABONUS) {
						this.substack.push(GAMESTATE.PICKACTION);
						this.logMsg("PLEACBON", this.activePlayer);
						this.state = GAMESTATE.EABONUS_MAIN;
						return;
					}
					this.logMsg("PLTO", this.activePlayer, loc[1]);
					let helperMoved = false;
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
						// check if any helpers on location and move them to ko
						for (let plNum = 0; plNum < this.numPlayers; plNum++) {
							locPiece = this.players[plNum].helpers.find((a) => a.location.type === HELPERLOC.ACTION && a.location.loc === loc[1]);
							if (locPiece) {
								if (plNum === pl && this.players[pl].location.type != PLAYERLOC.HOME) {
									// player's own helper on move to location
									// player not coming from home
									// move helper to old location
									locPiece.moveHelperTo(this.players[pl].location);
									// locPiece.location = Object.assign({}, this.players[pl].location); 
									helperMoved = true;
								} else {
									// if FINAL_ROUND, send home
									if (this.getFlag(FLAG.FINAL_ROUND)) {
										this.sendHome(locPiece);
									} else {
										this.logMsg("PLKOED", plNum);
										locPiece.moveHelperTo({type:HELPERLOC.KO, loc:locPiece.location.loc}) ;
									}
								}
							}
						}
					}

					// next state to doAction
					this.state = LOC2STATE[loc[1]];

					// leave helper behind
					if (!helperMoved && (this.players[pl].location.type != PLAYERLOC.HOME) && !this.getFlag(FLAG.FINAL_ROUND)) {
						// helper priority
						// - if KO helper, use it (done above)
						// - else if helper at desk, use it
						// - else if any helper in action loc, allow player to choose 1 or none
						let tmpHelper = this.players[pl].helpers.find((a) => a.location.type === HELPERLOC.DESK);
						if (tmpHelper) {
							// helper at desk
							tmpHelper.moveHelperTo(this.players[pl].location);
						} else {
							tmpHelper = this.players[pl].helpers.find((a) => a.location.type === HELPERLOC.ACTION);
							if (tmpHelper) {
								// have at least one helper on an action spot
								// allow user to chose to move helper
								// this.remember = {state:this.state, location: Object.assign({}, this.players[pl].location)};
								this.substack.push(this.state);
								this.substack.push(this.players[pl].location);
								this.state = GAMESTATE.LEAVEHELPER;
							}
							// no helpers on action locs, state set above
						}
					}

					// move player to loc
					this.players[pl].movePlayerTo({type:loc[0], loc:loc[1]});
					// this.players[pl].location = {type:loc[0], loc:loc[1]};

				}
				break;
			case GAMESTATE.LEAVEHELPER:
				{
					let plLoc = this.substack.pop();
					if (clicked != CLICKITEM.DONOTHING) {
						// move selected helper to old player location
						this.players[loc[1]].helpers[loc[2]].moveHelperTo(plLoc);
					}
					// go to remebered state
					this.state = this.substack.pop();
				}
				break;
			case GAMESTATE.FINALAUCTION:
				{
					// player will have clicked nft from auction
					// move it temporarily to "TOPLAYER"
					let chosenArt = this.nft.find((nft) => nft.type === loc[1] && nft.num === Number(loc[2]));
					chosenArt.moveArtTo({type:NFTLOC.TOPLAYER, plNum:this.activePlayer});
					this.logMsg("AUCTIONPICK", this.activePlayer, chosenArt.type);

					// if more bidders and more nft available, go to next player
					let playerBids = this.substack.pop();
					let auctionWorks = this.nft.filter((a) => a.location.type === NFTLOC.AUCTION);
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
					// move it to player's wallet
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
		if (this.getFlag(FLAG.NFT_BOUGHT)) {
			// show new nft and visitors
			for (let nftType of Object.values(NFTTYPE)) {
				if (this.nft.find((nft) => nft.location.type === NFTLOC.PILETOP && nft.type === nftType)) {
					// pile has top, do nothing
				} else {
					// pile has no top, make one
					let nftTop = this.chooseArtPileTop(nftType);
					if (nftTop) {
						// a new piletop was selected, add visitors
						this.visitorsToArt(nftTop, nftType);
					}
				}
			}
			this.clearFlag(FLAG.NFT_BOUGHT);
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
			let koPiece = this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.KO);
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
			// if player's own helper in ko, return it home
			let koPiece = this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.KO);
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
		if (!this.getFlag(FLAG.TIX_EMPTY)) {
			this.playerGetsTix(-1, TIXCOLOR.BROWN);
			return;
		}

		// no tix left, any visitors in bag?
		let tmpVisitor = this.getRandomFromBag();	// null if bag empty
		if (tmpVisitor) {
			tmpVisitor.moveVisitorTo({type:VISITORLOC.PLAZA});
			this.logMsg("VISITOR2PLAZA", tmpVisitor.color);
		} else {
			this.setFlag(FLAG.BAG_EMPTY);
		}
		this.checkEndGame();
		
	}

	getActionClicks() {
		let clickables = [];
		let playerLoc = this.players[this.activePlayer].location;
		if (playerLoc.type != PLAYERLOC.HOME) playerLoc = this.players[this.activePlayer].location.loc;

		if (playerLoc !=  ACTIONLOC.SALES && this.getSalesClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.SALES}));
		}
		if (playerLoc !=  ACTIONLOC.NFT && this.getArtClicks()) {
			clickables.push(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.NFT}));
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
		if (this.players[this.activePlayer].cred > 0) {
			let hFlag = true;
			switch (koLoc) {
				case ACTIONLOC.SALES:
					tmp = this.getSalesClicks(true);
					break;
				case ACTIONLOC.NFT:
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
			let cred = this.getUsableCred();
			for (let m in tmp.msgs) {
				if (koLoc === ACTIONLOC.MEDIA && tmp.msgs[m].startsWith("#")) {
					// hire needs special updating
					// add a msg and don't mess with buttons
					if (hFlag) tmp.msgs.push("HIREKOMSG".concat(":", cred));
					hFlag = false;	// only do this once
				} else {
					tmp.msgs[m] = "REDUCCRED".concat(":", tmp.msgs[m], ":", cred);
				}
				
				// tmp.msgs[m] += ` (${PROMPT.EN.REDUCCRED} ${cred})`;
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
		// - can we sell nft?
		//		CLICKITEM.NFT-nftType-num
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
				// if already dealt contracts, choices are take one or do nothing
				// sell nft (only available if player has not dealt 4 contracts)
				// to sell:
				// player has contract
				// player has matching nft
				// note: highlight nft that can be sold, later, after nft selected, contract(s) will be highlighted
				if ((playerFaceUpContracts.length) && !this.getFlag(FLAG.DEALT_CONTRACTS)) {
					let playerContractTypes = [];
					for (let pc of playerFaceUpContracts) {
						// array of all players contract types (incl dupes)
						playerContractTypes.push(pc.nftType);
					}
					let playerArt = this.playerHasDisplayed();
					for (let pa of playerArt) {
						if (playerContractTypes.includes(pa.type)) {
							clickables.push(this.obj2Str({type:CLICKITEM.NFT, nftType:pa.type, num:pa.num}));
							cFlag = true;
						}
					}
					if (cFlag) msgs.push("SELLART");
					cFlag = false;
				}
			case GAMESTATE.KO_GETCONTRACT:
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
					if (cFlag) {
						msgs.push("GETCONTRACT");
						if (this.getFlag(FLAG.DEALT_CONTRACTS)) {
							msgs.push("#".concat(CLICKITEM.DONOTHING, "#", "DONOTHING"))
							clickables.push(this.obj2Str({type:CLICKITEM.DONOTHING}));								
						}
					}
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
				// player chose nft to sell, highlight contract(s) that can be used
				let usableContracts = playerFaceUpContracts.filter((c) => c.nftType === this.nft[this.substackEnd()].type);
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
					// nft/contract chosen
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
				// 	// nft/contract chosen
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
			case GAMESTATE.NFT_MAIN:
				// to buy nft need:
				// nftist is discovered
				// nftist is not magnate and has sig token available OR
				// 	 player has commission
				// there is nft left to buy
				// player has space
				// player can afford
				let availArtists = this.nftists.filter((a) => 
					a.discovered && 
					((a.reknown < 19 && (a.sigTokens[0].location === SIGLOC.NFTIST || a.sigTokens[1].location === SIGLOC.NFTIST)) || 
						(a.sigTokens[0].location === SIGLOC.COMMISSION &&  a.sigTokens[0].plNum === this.activePlayer))
					);
				let playerArt = this.playerHasDisplayed();
				let nftSpaceAvailable = false;
				let maybeArtSpace = false;
				if (playerArt.length < 3) {
					nftSpaceAvailable = true;
				} else if (playerArt.length < 4) {
					// check if player has a masterpiece OR
					// maybe could make one now
					if (this.playerHasMasterpiece()) {
						nftSpaceAvailable = true;
					} else {
						// can player create masterpiece ?
						maybeArtSpace = true;
					}
				}
				let playerCommission = this.playerHasCommission();
				for (let aa of availArtists) {
					let checkArt = this.topOfArtPile(aa.type);
					if (checkArt && this.playerCanAfford((playerCommission == aa) ? aa.initReknown : aa.reknown)) {
						if (nftSpaceAvailable) {
							clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, nftType:aa.type, color:aa.color}));
							cFlag = true;
						} else if (maybeArtSpace) {
							// check if player can both afford to buy nft AND
							// increase it to masterpiece
							// nftist current reknown
							let tmpReknown = aa.reknown;
							// add fixed amount based on nft
							tmpReknown += checkArt.reknownBonus.fixed;
							// add variable amount based on # of white meeples in player's gallery 
							tmpReknown += checkArt.reknownBonus.perWhite * this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, this.activePlayer);
							if (tmpReknown < 19) {
								// just buying nft doesn't bump to magnate, check if player can use cred
								let tmpCred = this.players[this.activePlayer].cred;
								let tmpMoney = this.players[this.activePlayer].money;
								while (tmpMoney < ((playerCommission == aa) ? aa.initReknown : aa.reknown)) {
									// player needs to use some cred for money
									tmpCred = this.credNextMark(tmpCred);
									tmpMoney++;
								}
								// player can use the rest of cred for reknown
								tmpReknown += Math.ceil(tmpCred / 5);
							}
							if (tmpReknown > 18) {
								// good luck testing this path!
								clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, nftType:aa.type, color:aa.color}));
								cFlag = true;
							} 
						}
					}

				}
				if (cFlag) msgs.push("BUYARTIST");
				cFlag = false;

				//  to discover need:
				// player doesn't have discovered sig token
				// nftist undiscovered
				if (!this.playerHasCommission()) {
					for (let aa of this.nftists) {
						if (!aa.discovered) {
							clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, nftType:aa.type, color:aa.color}));
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
		let availArtists = this.nftists.filter((a) => a.discovered && (a.thumb < 5) && (a.thumb+1  <= this.getUsableCred()));
		switch (this.state) {
			case GAMESTATE.PICKACTION:
			case GAMESTATE.KOMEDIA:
			case GAMESTATE.MEDIA_MAIN:
				// to promote need:
				// - discovered nftist with promotion level < 5 AND 
				// 		<= cred player - 1 (i.e. player can pay cred for thumb) AND
				//		thumb of correct level is available
				if (availArtists.length) {
					// for (let nftist of availArtists) {
					// 	let thumb = this.thumbs[nftist.thumb + 1].find((t) => !t.color);
					// 	if (!thumb) continue;	// no thumb available
					// 	clickables.push(this.obj2Str({type:CLICKITEM.NFTIST, color:nftist.color, nftType:nftist.type}));
					// }
					// msgs.push("nftist to promote");

					for (let promoLvl = 1; promoLvl <= 5; promoLvl++) {
						let thumbLevelIdx = promoLvl - 1;
						let thumbIdx = this.thumbs[thumbLevelIdx].map((t) => !t.color).lastIndexOf(true); //findIndex((t) => !t.color);
						if (thumbIdx === -1) continue;	// no thumb available
						if (availArtists.find((aa) => aa.thumb+1 === promoLvl)) {
							// there is an nftist that an be promoted to this level
							clickables.push(this.obj2Str({type:CLICKITEM.THUMB, level:thumbLevelIdx, num:thumbIdx}));
							cFlag = true;
						}
					}
					if (cFlag) msgs.push("PROMOLEVEL");
					cFlag = false;
				}

				// to hire:
				// need empty desks
				// need helpers unemployed
				// need money and/or cred to cover cost
				let numDesksAvailable = 4 - this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.DESK).length;
				let unemployed = this.players[this.activePlayer].helpers.filter((a) => a.location.type === HELPERLOC.UNEMPLOYED);
				if (numDesksAvailable && unemployed.length) {
					const hireCost = [0,0,1,2,2,3,3,4,5,6];
					let emps2Hire = 0;
					let totalCost = 0;
					for (let i=10-unemployed.length; i < 10; i++) {
						totalCost += hireCost[i];
						if ((emps2Hire >= numDesksAvailable) || !this.playerCanAfford(totalCost)) break;
						emps2Hire++;
						clickables.push(this.obj2Str({type:CLICKITEM.HIREHELPER, num:emps2Hire}));
						msgs.push( "#".concat(this.obj2Str({type:CLICKITEM.HIREHELPER, num:emps2Hire}), "#", "HIRE", ":", emps2Hire, ":", totalCost));
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
		// for all, player has correct visitors and 1+ avail. helper.
		// for top, space for tile, acquired right NFTTYPE
		// for bottom, space is empty, can pay
		
		// player has 1+ helper.
		let availableHelpers = this.getAvailableHelpers();
		if (availableHelpers.length) {

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

						for (let at of Object.values(NFTTYPE)) {
							if ((this.nft.findIndex((a) => ((a.location.type === NFTLOC.WALLET) || (a.location.type === NFTLOC.SOLD)) && a.type === at && a.location.plNum === this.activePlayer) != -1)) {
								// player has in wallet or has sold this type of nft AND
								for (let col in MARKETCOL) {
									if (visitorsForCol[col] ) {
										// col is usable
										let index = this.repTiles.findIndex((r) => r.location.type === REPTILELOC.INTLMARKET && r.location.nftType === at && r.location.col === col);
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
					// get an array of all the helpers in the auction
					let auctionHelpers = [];
					for (let pl=0; pl < this.numPlayers; pl++) {
						auctionHelpers = auctionHelpers.concat(this.players[pl].helpers.filter((a) => a.location.type === HELPERLOC.AUCTION));
					}
					for (let av of Object.values(AUCTIONVAL)) {
						let row = Math.floor((av - 1)/2); // 0/2/5
						for (let col in MARKETCOL) {
							let colNum = 3 - MARKETCOL2CRED[col];	// 0-2
							if (colNum == 1 && this.numPlayers < 3) continue;
							if (visitorsForCol[col] &&
								this.playerCanAfford(av, MARKETCOL2CRED[col]) &&
								(!auctionHelpers.find((a) => a.location.row === row && a.location.col === colNum))) {
								// col is usable AND
								// player can afford it AND
								// col has no helper on it
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
		return this.nftists.find((nftist) => nftist.sigTokens[0].location === SIGLOC.COMMISSION && nftist.sigTokens[0].plNum === this.activePlayer);
	}

	playerHasMasterpiece() {
		let playerArt = this.playerHasDisplayed();
		for (let pArt of playerArt) {
			if (this.nftists[pArt.byArtist].reknown > 18) return true;
		}
		return false;
	}

	playerRepTileDisplayIdx(plNum = this.activePlayer) {
		return this.repTiles.findIndex((t) => t.location.type === REPTILELOC.DISPLAY && t.location.plNum === plNum);
	}

	playerRepTiles(plNum = this.activePlayer) {
		return this.repTiles.filter((t) => t.location.type === REPTILELOC.PLAYER && t.location.plNum === plNum);
	}

	checkEndGame() {
		if (!this.getFlag(FLAG.END_TRIGGERED)) {
			let count = 0;
			if (this.getFlag(FLAG.BAG_EMPTY)) count++;
			if (this.getFlag(FLAG.TIX_EMPTY)) count++;
			if (this.getFlag(FLAG.TWO_MAGNATE)) count++;
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
				let playerBids = this.getPlayerBids();
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

	getPlayerBids(getInfo = false) {
		const bids = [[1,1.01,1.1],[3.002,3.02,3.2],[6.004,6.04,6.4]];
		let unused = [[1,1.01,1.1],[3.002,3.02,3.2],[6.004,6.04,6.4]];
		let playerBids = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			let bid = 0;
			let auctionHelpers = this.players[plNum].helpers.filter((helper) => helper.location.type === HELPERLOC.AUCTION);
			for (let helper of auctionHelpers) {
				let thisBid = bids[helper.location.row][helper.location.col];
				bid += thisBid;
				unused[helper.location.row][helper.location.col] = 0;
			}
			if (bid) playerBids.push({plNum:plNum, bid:bid});
		}
		playerBids.sort((a,b) => b.bid - a.bid);
		if (getInfo) return {bids:playerBids, unused:unused};
		return playerBids;
	}

	finalScore(forLiveScore = false) {
		// let money = [0,0,0,0];
		// let cred = [0,0,0,0];
		// for (let plNum=0; plNum < this.numPlayers; plNum++) {
		// 	money[plNum] = this.players[plNum].money;
		// 	cred[plNum] = this.players[plNum].cred;
		// }
		let money = {};
		let cred = {};

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
			let numHelperInCol = [0,0,0,0];
			for (let plNum=0; plNum < this.numPlayers; plNum++) {
				// get num helpers each player has in specific col of market/auction 
				numHelperInCol[plNum] = this.players[plNum].helpers.filter((a) => (a.location.type === HELPERLOC.INTLMARKET || a.location.type === HELPERLOC.AUCTION) && a.location.col === col).length;
			}
			let bonusIdx = 0;
			let maxHelpers = Math.max(...numHelperInCol);
			let colBonus = majorityBonus[col][bonusIdx];
			while (maxHelpers && bonusIdx < 3) {
				// maxCount = how many players are tied at this count
				let maxCount = numHelperInCol.filter((n) => n === maxHelpers).length;
				for (let i=1; i < maxCount; i++) {
					// if players are tied, add up bonues for tied positions
					bonusIdx++;
					if (bonusIdx < 3) colBonus +=  majorityBonus[col][bonusIdx];
				}
				// divide bonus by number of players to rcv
				colBonus = Math.floor(colBonus/maxCount);
				for (let plNum=0; plNum < this.numPlayers; plNum++) {
					if (numHelperInCol[plNum] === maxHelpers) {
						// this player gets bonus
						money.columns[plNum] += colBonus;
						if (!forLiveScore) this.logMsg("COLBONUS",plNum,colBonus,col+1);
						// remove this player from further consideration
						numHelperInCol[plNum] = 0;
					}
				}
				// move to next bonus
				bonusIdx++;
				maxHelpers = Math.max(...numHelperInCol);
				if (bonusIdx < 3) colBonus = majorityBonus[col][bonusIdx];
			}
		}

		// repTiles
		money.repTiles = [];
		cred.repTiles = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.repTiles[plNum] = 0;
			cred.repTiles[plNum] = 0;
		}
		// note: normally reptiles can be scored in any order BUT rep tile 0 MUST be scored before others for that plaayer
		// To simplify, loop all reptiles starting from 0 and score in that order
		for (let i=0; i < 20; i++) {
			// find repTile 'i' and see if it should be scored LOC=PLAYER
			let tile = this.repTiles.find((t) => t.tNum === i && t.location.type === REPTILELOC.PLAYER);
			if (tile) {
				let money2add = 0;
				let cred2add = 0;
				let tmpNum = 0;
				switch (i) {
					case 0:	// 1 money per 3 cred (score first)
						money2add = Math.floor(this.players[tile.location.plNum].cred / 3);
						break;
					case 1:	// 1 cred + 3 money per Celeb
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, tile.location.plNum);
						money2add = 3 * tmpNum;
						cred2add = tmpNum;
						break;
					case 2:	// 1 cred + 2 money per Influencer
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.PINK, tile.location.plNum);
						money2add = 2 * tmpNum;
						cred2add = tmpNum;
						break;
					case 3:	// 1 cred + 2 money per crypto bro
						tmpNum = this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.BROWN, tile.location.plNum);
						money2add = 2 * tmpNum;
						cred2add = tmpNum;
						break;
					case 4: // 1 money per visitor
						money2add = this.visitors.filter((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === tile.location.plNum).length;
						break;
					case 5: // 4 money per set of visitors
						money2add = 4 * Math.min(this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.WHITE, tile.location.plNum),
							this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.PINK, tile.location.plNum),
							this.numVisitorsIn(VISITORLOC.GALLERY, VISITORCOLOR.BROWN, tile.location.plNum));
						break;
					case 6: // 1 cred + 2 money per repTile
						tmpNum = this.repTiles.filter((t) => t.location.type === REPTILELOC.PLAYER && t.location.plNum === tile.location.plNum).length;
						money2add = 2 * tmpNum;
						cred2add = tmpNum;
						break;
					case 7: // 1 cred + 3 money per helper in auction
						tmpNum = this.players[tile.location.plNum].helpers.filter((a) => a.location.type === HELPERLOC.AUCTION).length;
						money2add = 3 * tmpNum;
						cred2add = tmpNum;
						break;
					case 8: // 1 cred + 1 money per helper not unemployed https://boardgamegeek.com/thread/1533273
						tmpNum = 10 - this.players[tile.location.plNum].helpers.filter((a) => a.location.type === HELPERLOC.DISCARD || a.location.type === HELPERLOC.UNEMPLOYED).length;
						money2add = tmpNum;
						cred2add = tmpNum;
						break;
					case 9: // 2 money per nftist with 4 thumb or higher
						tmpNum = this.nftists.filter((a) => a.thumb > 3).length;
						money2add = 2 * tmpNum;
						break;
					case 10: // 2 money per work of nft acquired
						tmpNum = this.nft.filter((a) => (a.location.type === NFTLOC.WALLET || a.location.type === NFTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 2 * tmpNum;
						break;
					case 11: // 1 cred + 3 money per nftwork sold
						tmpNum = this.nft.filter((a) => (a.location.type === NFTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						cred2add = tmpNum;
						break;
					case 12: // 1 cred + 3 money per nftwork on exhibit
						tmpNum = this.nft.filter((a) => (a.location.type === NFTLOC.WALLET) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						cred2add = tmpNum;
						break;
					case 13: // 1 cred + 2 money per nft type acquired
						for (let nftType of Object.values(NFTTYPE)) {
							if (this.nft.some((a) => a.type === nftType && (a.location.type === NFTLOC.WALLET || a.location.type === NFTLOC.SOLD) && a.location.plNum === tile.location.plNum)) tmpNum++;
						}
						money2add = 2 * tmpNum;
						cred2add = tmpNum;
						break;
					case 14: // 1 cred + 3 money per phakeland acquired
					case 15: // 1 cred + 3 money per galaxy acquired
					case 16: // 1 cred + 3 money per digital nft acquired
					case 17: // 1 cred + 3 money per dejacat acquired
						const conv = [NFTTYPE.PHAKELAND, NFTTYPE.GALAXY, NFTTYPE.ABSTRACT, NFTTYPE.DEJACAT];
						tmpNum = this.nft.filter((a) => a.type === conv[i-14] && (a.location.type === NFTLOC.WALLET || a.location.type === NFTLOC.SOLD) && a.location.plNum === tile.location.plNum).length;
						money2add = 3 * tmpNum;
						cred2add = tmpNum;
						break;
					case 18: // 1 cred + 2 money per nftist with 15+ reknown
						tmpNum = this.nftists.filter((a) => a.reknown > 14).length;
						money2add = 2 * tmpNum;
						cred2add = tmpNum;
						break;
					case 19: // 2 cred + 4 money per Masterpiece on exhibit
						{
							let playerArt = this.playerHasDisplayed(tile.location.plNum);
							for (let pArt of playerArt) {
								if (this.nftists[pArt.byArtist].reknown > 18) tmpNum++;
							}
						}
						money2add = 4 * tmpNum;
						cred2add = 2 * tmpNum;
						break;
				}
				if (money2add) {
					money.repTiles[tile.location.plNum] += money2add;
					if (!forLiveScore) this.logMsg("TILEMONEY",tile.location.plNum,money2add,i);
				}
				if (cred2add) {
					cred.repTiles[tile.location.plNum] += cred2add;
					if (!forLiveScore) this.logMsg("TILECRED",tile.location.plNum,cred2add,i);
				}
				
			}
		}

		// sale value of exhibitted nft
		money.exhibitted = [];

		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.exhibitted[plNum] = 0;
		}
			let exhibitArt = this.nft.filter((a) => a.location.type === NFTLOC.WALLET);
		for (let nft of exhibitArt) {
			let val = this.nftists[nft.byArtist].getValue();
			money.exhibitted[nft.location.plNum] += val;
			if (!forLiveScore) this.logMsg("EXART",nft.location.plNum,val,nft.byArtist);
		}


		// auction works
		money.auction = [];
		let plAuctionArt = [null,null,null,null];
		
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			money.auction[plNum] = 0;
		}
		let auctionWorks = this.nft.filter((a) => a.location.type === NFTLOC.TOPLAYER);
		for (let nft of auctionWorks) {
			// remember nft won for later
			plAuctionArt[nft.location.plNum] = nft;

			// player who won nft rcvs its value
			let av = this.auctionValue(nft);
			money.auction[nft.location.plNum] += av.value;
			if (!forLiveScore) this.logMsg("AUCTIONART",nft.location.plNum,av.value,av.nftistIdx);
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
						plAuctionArt[plNum].moveArtTo({type:NFTLOC.SOLD, plNum:plNum});
					}
				} else {
					cVal = cValWith;
					if (!forLiveScore) {
						this.logMsg("TOWALLET",plNum);
						plAuctionArt[plNum].moveArtTo({type:NFTLOC.WALLET, plNum:plNum});
					}
				}
			}
			money.secretCards[plNum] += cVal;
			if (!forLiveScore) this.logMsg("WALLETBONUS",plNum,cVal);

			money.secretCards[plNum] += dVal;
			if (!forLiveScore) this.logMsg("SOLDBONUS",plNum,dVal);
		}

		let gainedCred = [0,0,0,0];
		for (let stype in cred) {
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				gainedCred[plNum] += cred[stype][plNum];
			}
		}

		// cred track
		money.cred = [];
		for (let plNum = 0; plNum < this.numPlayers; plNum++) {
			let val = this.cred2money(gainedCred[plNum] + this.players[plNum].cred);
			money.cred[plNum] = val;
			if (!forLiveScore) this.logMsg("CREDBONUS",plNum,val);
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
			// actually add money/cred if it's not for live score
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				this.players[plNum].addMoney(ret[plNum]);
				this.players[plNum].addCred(gainedCred[plNum]);
			}
			// save money for as stats
			// remmeber money is object with each peice of final scoring
			this.stats.scoring = money;
		}
	}

	finalResults() {
		// most money wins
		// tie breaker 1 - most nft purchased
		// tie breaker 2 - most gallery visitors
		// tie breaker 3 - most helpers in play
		this.results = [];
		for (let plNum=0; plNum < this.numPlayers; plNum++) {
			let numArtBought = this.nft.filter((a) => (a.location.type === NFTLOC.WALLET || a.location.type === NFTLOC.SOLD) && a.location.plNum === plNum).length;
			let numVisitors = this.visitors.filter((v) => v.location.type === VISITORLOC.GALLERY && v.location.plNum === plNum).length;
			let helperInPlay = 10 - this.players[plNum].helpers.filter((a) => a.location.type === HELPERLOC.DISCARD || a.location.type === HELPERLOC.UNEMPLOYED).length;
			let score = ((this.players[plNum].money * 32 + numArtBought) * 32 + numVisitors) * 16 + helperInPlay;
			this.results.push({player:plNum, money:this.players[plNum].money, score:score});
		}
		this.results.sort((a,b) => b.score - a.score);



	}

	evalCards(numNeeded, locType, auctionArtType = null, plNum ) {
		const nftBonusTypes = Object.values(NFTTYPE);
		let getBonus = true;
		for (let i=0; i<4; i++) {
			if (!numNeeded[i]) continue;
			let numOfType = this.nft.filter((a) => a.location.type === locType && a.location.plNum === plNum && a.type === nftBonusTypes[i]).length;
			if (auctionArtType === nftBonusTypes[i]) numOfType++;
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
			let getBonus = this.evalCards(numNeeded[bNum], NFTLOC.WALLET, auctionArtType, plNum);
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
			let getBonus = this.evalCards(numNeeded[bNum], NFTLOC.SOLD, auctionArtType, plNum);
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

	visitorsToArt(nft, nftType) {
		for (let i = 0; i < nft.numTixBonus; i++) {
			let vFromBag = this.getRandomFromBag();
			if (vFromBag) {
				// if there was a visitor pulled from bag, move to nft
				vFromBag.moveVisitorTo({type:VISITORLOC.NFT, nftType:nftType});
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
			// player has available helper?
			if (this.players[this.activePlayer].helpers.find((a) => a.location.type === HELPERLOC.DESK ||  a.location.type === HELPERLOC.ACTION || a.location.type === HELPERLOC.KO)) {
				let playerContracts = this.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === this.activePlayer);
				for (let pc of playerContracts) {
					// player has contract without used bonus?
					if (!this.players[this.activePlayer].helpers.find((a) => (a.location.type === HELPERLOC.CONTRACTBONUS || a.location.type === HELPERLOC.SOLDBONUS) && a.location.num === pc.num)) {
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
		// for helper, return link to helper in .helper and helper# in helperIdx
		let ret = {player:null, helper:null, playerIdx:null, helperIdx:null};
		ret.playerIdx = this.players.findIndex((p) => p.location.type === PLAYERLOC.KO);
		if (ret.playerIdx == -1) {
			// no player piece kicked out, check helpers for each player
			for (let plNum = 0; plNum < this.numPlayers; plNum++) {
				ret.helperIdx = this.players[plNum].helpers.findIndex((a) => a.location.type === HELPERLOC.KO);
				if (ret.helperIdx != -1) {
					ret.playerIdx = plNum;
					ret.helper = this.players[plNum].helpers[ret.helperIdx];
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
		const mask = ~(FLAG.DID_EA | FLAG.DEALT_CONTRACTS | FLAG.NFT_BOUGHT | FLAG.UPDATE_CONTRACTS);
		this.flags &= mask;
	}

	resetRoundFlags() {
		const mask = ~(FLAG.DID_EA | FLAG.DID_ACTION | FLAG.DID_KO | FLAG.DEALT_CONTRACTS | FLAG.NFT_BOUGHT | FLAG.UPDATE_CONTRACTS);
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
			let auctionWorks = this.nft.filter((a) => a.location.type === NFTLOC.AUCTION);
			for (let nft of auctionWorks) {
				if (!obj.auction) obj.auction = {};
				let val = this.auctionValue(nft).value;
				obj.auction[nft.type] = val;
			}

			// obj.soldcard/hungcard will be array of objects like:
			// [{"galaxy":1},{"dejacat":2,"phakeland":1,"abstract":1}]
			// each array entry is the bonus reqs
			const nftBonusTypes = Object.values(NFTTYPE);
			obj.soldcard = [];
			let numNeeded = this.neededSold(this.players[playerIndex].dealer);
			for (let i of numNeeded) {
				tmp = {};
				for (let j=0; j < i.length; j++) {
					tmp[nftBonusTypes[j]] = i[j];
				}
				obj.soldcard.push(tmp);
			}

			obj.hungcard = [];
			numNeeded = this.neededHung(this.players[playerIndex].curator);
			for (let i of numNeeded) {
				tmp = {};
				for (let j=0; j < i.length; j++) {
					tmp[nftBonusTypes[j]] = i[j];
				}
				obj.hungcard.push(tmp);
			}

		}
		for(let k of Object.keys(this)) {
			// TODO the 'straighforward' stuff that is arrays (like moves, logs, etc) will NOT make copies
			// but will copy reference to array instead.
			// can either return a structuredClone or let caller do this.
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
				case "turnNum":
				case "state":
				case "tickets":
				case "thumbs":
				case "results":
				case "stats":
				case "log":
					// these are straightforward to stringify
					obj[k] = this[k];
					break;
				// following are complicated to stringify
				case "nftists":
				case "nft":
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
}


export {
	NftistServer,
	NftServer,
	ContractServer,
	PlayerServer,
	GameServer,
	VisitorServer }


