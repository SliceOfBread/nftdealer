import {
	ACTIONLOC,
	NFTBONUSTYPE,
	NFTISTCOLOR,
	NFTLOC,
	NFTTYPE,
	HELPERLOC,
	CLICKITEM,
	CLICKSPACE,
	CONTRACTBONUS,
	CONTRACTLOC,
	FLAG,
	GAMESTATE,
	MARKETCOL,
	PLAYERCOLOR,
	PLAYERLOC,
	PROMPT,
	REPTILELOC,
	SIGLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORCOLOR,
	VISITORLOC} from './egalconstants.mjs' ;

import {Nft,
	Nftist,
	Helper,
	Board,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} from './common.mjs';

var waitingForServer = false;
var lang = "EN";

function boardOffset(node) {
	let ret = {top:0, left:0};
	let currNode = node;
	while (currNode && currNode.id != "allboardsdiv") {
		ret.left += currNode.offsetLeft;
		ret.top += currNode.offsetTop;
		currNode = currNode.offsetParent;
	}
	ret.left = ret.left / window.innerWidth * 100;
	ret.top = ret.top / window.innerWidth * 100;
	return ret;
}


class NftClient extends Nft {
	constructor(type, num) {
		super(type, num);
		this.posNum = 0;
	}

	updateArtInfo(posNum = -1, playerBoardDom, saleValue) {
		this.posNum = posNum;
		if (!this.dom) {
			this.dom = document.getElementById(`nfttemplate`).cloneNode(true);
			this.dom.classList.remove('invis');
			this.dom.id = CLICKITEM.NFT.concat("-", this.type, "-", this.num);
			this.dom.getElementsByClassName("nfttype")[0].src = `res/${this.type}.png`;
			this.dom.getElementsByClassName("nftdisp")[0].src = `res/${this.type}${this.num}.jpg`;
			this.valueDom = this.dom.getElementsByClassName('nftvalue')[0];
			document.getElementById('allboardsdiv').appendChild(this.dom);

			this.dom.getElementsByClassName('nfttix')[0].classList.add(`nfttix${this.num}`); 
			// update display of reknown
			this.dom.getElementsByClassName("reknownx")[0].innerHTML = this.reknownBonus.fixed;


		}
		
		this.dom.classList.remove('auction', `top${this.type}`);
		let offset = {top:0, left:0};
		switch (this.location.type) {
			case NFTLOC.PILETOP:
				this.dom.classList.add(`top${this.type}`);
			case NFTLOC.PILE:
				offset = boardOffset(document.getElementById(`space${this.type}`));
				// this.dom.style.left = "53vw";
				// this.dom.style.top = 0 + (7 * Object.values(NFTTYPE).indexOf(this.type)) + "vw";
				if (this.location.type == NFTLOC.PILE) {
					this.dom.classList.add('invis');
				} else {
					this.dom.classList.remove('invis');
					this.valueDom.classList.add('invis');
				}
				this.dom.classList.add('showback');

				break;
			case NFTLOC.WALLET:
				if (this.posNum > 3) {
					// must be auction piece and wallet full
					// show it below other nft
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbnftspace")[1]);
					offset.left += 2.6;
					offset.top += 5.5;
					this.dom.style.zIndex = 4;
				} else {
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbnftspace")[this.posNum]);
					offset.top += .3;	
				}

				// this.dom.style.left = offset.left + 54 + 100 * this.posNum + "px";
				// this.dom.style.top = offset.top + 5 + "px";
				this.dom.classList.remove('invis', 'showback');
				this.valueDom.classList.remove('invis');
				this.valueDom.innerHTML = PROMPT[lang].DOLLAR.concat(saleValue);
				break;
				
			case NFTLOC.AUCTION:
				if (posNum != -1) {
					// auction is active
					offset.left = 15 + (6 * posNum);
					offset.top = 15;
					this.dom.classList.remove('invis', 'showback');
					this.dom.classList.add('auction');
					break;
				}
			case NFTLOC.TOPLAYER:
			case NFTLOC.SOLD:
			case NFTLOC.DISCARD:
				this.dom.classList.add('invis');
				break;
						
			default:
				break;
		}
		this.dom.style.left = offset.left + 'vw';
		this.dom.style.top = offset.top + 'vw';
	}
	
}


class HelperClient extends Helper {
	constructor(num) {
		super(num);
	}
	initDom(player, helperNum) {
		// create dom for each helper
		this.dom = document.createElement("IMG");
		this.dom.classList.add("movable");
		this.dom.classList.add("playerhelper");
		this.dom.src = "res/helper_" + player.color + ".png";
		this.dom.id = CLICKITEM.HELPER + "-" + player.num + "-" + helperNum;
		document.getElementById("allboardsdiv").appendChild(this.dom);

		this.playerBoardDom = document.getElementById("playerbrd" + player.num);
	}

	updateHelperInfo(game, deskNum) {
		let playerBoardOffset = boardOffset(this.playerBoardDom);
		let offset = {top:0, left:0};
		switch (this.location.type) {
			case HELPERLOC.DESK:
				// const desks = [	
				// 	{left:482, top:18},
				// 	{left:462, top:34},
				// 	{left:486, top:50},
				// 	{left:467, top:61}	];
					
				// this.dom.style.left = playerBoardOffset.left + desks[deskNum].left + "px";
				// this.dom.style.top = playerBoardOffset.top + desks[deskNum].top + "px";
				offset = boardOffset(this.playerBoardDom.getElementsByClassName("pbdesk")[deskNum]);
				break;
			case HELPERLOC.UNEMPLOYED:
				offset = boardOffset(this.playerBoardDom.getElementsByClassName("pbhelperbox")[this.num - 2]);	
				offset.left += 1;
				// this.dom.style.left = playerBoardOffset.left + 8 + "px";
				// this.dom.style.top = playerBoardOffset.top - 18 + (this.num * 22.5) + "px";

				break;
			
			case HELPERLOC.INTLMARKET:
				{
					let col = this.location.col;
					let row = Object.values(NFTTYPE).indexOf(this.location.nftType);
					offset = boardOffset(document.getElementsByClassName("markettilespace")[row * 3 + col]);
					// this.dom.style.left = 53 + (col * 48.5) + "px";
					// this.dom.style.top = 232 + (row * 41) + "px";
				}
				break;
			case HELPERLOC.AUCTION:
				{
					let col = this.location.col;
					let row = this.location.row;
					offset = boardOffset(document.getElementById(`${CLICKSPACE.AUCTION}-${row}-${col}`));
					// this.dom.style.left = 63 + (col * 48.5) + "px";
					// this.dom.style.top = 414 + (row * 41) + "px";
				}
				break;
			case HELPERLOC.DISCARD:
				this.dom.classList.add("invis");
				break;
			case HELPERLOC.CONTRACTBONUS:
			case HELPERLOC.SOLDBONUS:
				offset = boardOffset(this.playerBoardDom.getElementsByClassName('pbcontractspace')[game.contracts[this.location.num].location.num]);
				if (game.contracts[this.location.num].faceUp) {
					// this.dom.style.top = playerBoardOffset.top + 165 + "px";
					offset.top += 3;
				} else {
					// this.dom.style.top = playerBoardOffset.top + 125 + "px";
					offset.top += 1;
				}
				offset.left += 1;
				
				// this.dom.style.left = playerBoardOffset.left + 212 + (88 * game.contracts[this.location.num].location.num) + "px";
				break;
				// this.dom.style.top = playerBoardOffset.top + 115 + "px";
				// this.dom.style.left = playerBoardOffset.left + 212 + (88 * game.contracts[this.location.num].location.num) + "px";
				// break;
		
			default:
				// for Action and KO locs
				PlayerClient.updatePlayerPiece(this.dom, this.location);
				return;
		}
		this.dom.style.left = offset.left + 'vw';
		this.dom.style.top = offset.top + 'vw';

	}
}


class NftistClient extends Nftist {
	constructor() {
		super();
		this.dom = null;
		this.bonusDom = null;
		this.reknownDom = null;
		this.sigDom = [];
	}
	updateArtistInfo(game) {
		if (!this.dom) {
			this.dom = document.getElementsByClassName(`nftist${this.color} nftist${this.type}`)[0];
			this.dom.id = CLICKITEM.NFTIST.concat( "-", this.color, "-", this.type);
			// invis all the unused levels
			let reknowndivs = this.dom.getElementsByClassName('nftistreknown');
			for (let f of reknowndivs) {
				for (let c of f.classList) {
					if (c.startsWith("reknown")) {
						let val = Number(c.slice("reknown".length));
						if (val < this.initReknown) {
							f.classList.add('hide');
							break;
						}
					}
				}
			}
			let iVal = this.getValue(this.initReknown);
			for (let f=this.initReknown; f < 19; f++) {
				let newVal = this.getValue(f);
				this.dom.getElementsByClassName(`reknown${f}`)[0].classList.add('nftistval'.concat(newVal));
			}

			// update promo level
			this.dom.getElementsByClassName("nftistpromo")[0].innerHTML = `<p>${this.thumb}&nbsp;&nbsp;&UpperRightArrow;</p>`;

			this.bonusDom = document.createElement("DIV");
			this.bonusDom.classList.add("nftbonustile");
			this.bonusDom.style.backgroundImage = `url('res/${this.bonus}.png')`;
			this.dom.appendChild(this.bonusDom);
			this.reknownDom = document.createElement("DIV");
			this.reknownDom.classList.add("moveable", "reknownmarker", "invis");
			this.dom.appendChild(this.reknownDom);

			// add sig tokens
			for (let i in this.sigTokens) {
				let tmpDom = document.createElement("DIV");
				this.sigDom[i] = tmpDom;
				tmpDom.classList.add("moveable","sigtoken",`nftist${this.color}`);
				tmpDom.style.backgroundImage = `url('res/${this.type}.png')`;
				tmpDom.innerHTML = '~~';
				document.getElementById("allboardsdiv").appendChild(tmpDom);
				
			}
		}
		if (this.discovered) {
			this.dom.classList.remove("unknown");
			this.bonusDom.classList.add("invis");

			// update reknownmarker
			this.reknownDom.classList.remove("invis");
			let currentReknownDom = this.dom.getElementsByClassName(`reknown${this.reknown}`)[0];
			let top = currentReknownDom.offsetTop + currentReknownDom.parentNode.offsetTop; // Math.floor((this.reknown - 1) / 6);
			let left = currentReknownDom.offsetLeft; //((this.reknown - 1) % 6);
			// if (top % 2 != 0) {
			// 	// reknown move right to left
			// 	left = 5 - left;
			// }
			// top = (5 - top) * 5/6;
			// left = left * 5 / 6
			this.reknownDom.style.left = left - 2 + "px"; // leave these as px as they are computed above
			this.reknownDom.style.top = top - 2 + "px"; // leave these as px as they are computed above
		} else {
			// for UNDO
			this.dom.classList.add("unknown");
			this.bonusDom.classList.remove("invis");
			this.reknownDom.classList.add("invis");
		}

		// update sale value
		this.dom.getElementsByClassName("nftistvalue")[0].innerHTML = ''; // PROMPT[lang].DOLLAR.concat(this.getValue());
		
		// update sigTokens
		for (let i in this.sigTokens) {
			let s = this.sigTokens[i];
			let sDom = this.sigDom[i];
			let offset = {top:0, left:0};

			if (s.location == SIGLOC.NFTIST) {
				offset = boardOffset(this.dom);
				offset.top +=  5.1;
				offset.left += Number(i) * 1.1;

			} else {
				if (s.location == SIGLOC.NFT) {
					// if use nft for offset it causes a problem with UNDO
					let nftIdx = s.nftNum;
					let nft = game.nft[nftIdx];
					let playerBoardDom = game.players[nft.location.plNum].boardDom;
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbnftspace")[nft.posNum]);
					offset.top += 3.9;
					offset.left += 2.5;
	
				} else {
					// SIGLOC.COMMISSION
					let playerBoardDom = game.players[s.plNum].boardDom;
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbcomm")[0]);

				}
			
			}
			sDom.style.left = offset.left + "vw";
			sDom.style.top = offset.top + "vw";
	}


	}
	discover() {
		super.discover();
	}
}


// function twoSided(id, frontImage, rearImage, altText) {
// 	let dom = document.createElement("DIV");
// 	dom.id = id;
// 	dom.classList.add("flippable", "movable", "showback");
// 	let innerDom = document.createElement("DIV");
// 	innerDom.classList.add("flip-inner");
// 	dom.appendChild(innerDom);
// 	let front = document.createElement("DIV");
// 	front.classList.add("flip-front", "flip-side");
// 	innerDom.appendChild(front);
// 	let frontImg = document.createElement("IMG");
// 	frontImg.src = frontImage;
// 	frontImg.alt = altText;
// 	front.appendChild(frontImg);
// 	let back = document.createElement("DIV");
// 	back.classList.add("flip-back", "flip-side");
// 	let backImg = document.createElement("IMG");
// 	backImg.src = rearImage;
// 	backImg.alt = altText;
// 	back.appendChild(backImg);
// 	innerDom.appendChild(back);
// 	document.getElementById("boarddiv").appendChild(dom);
// 	return dom;
	
// }

// function twoSidedDiv(id, frontDiv, rearDiv, altText) {
// 	let dom = document.createElement("DIV");
// 	dom.id = id;
// 	dom.classList.add("flippable", "movable", "showback");
// 	let innerDom = document.createElement("DIV");
// 	innerDom.classList.add("flip-inner");
// 	dom.appendChild(innerDom);
// 	let front = document.createElement("DIV");
// 	front.classList.add("flip-front", "flip-side");
// 	innerDom.appendChild(front);
// 	let frontDom = frontDiv;
// 	front.appendChild(frontDom);
// 	let back = document.createElement("DIV");
// 	back.classList.add("flip-back", "flip-side");
// 	let backDom = rearDiv;
// 	back.appendChild(backDom);
// 	innerDom.appendChild(back);
	
// 	return dom;
	
// }

class BoardClient extends Board {
    constructor() {
		super();
		// {
		// 	// create clickable auction locations
		// 	let theseLocs = document.getElementsByClassName("auctionloc");
		// 	for (let i=0; i < theseLocs.length; i++) {
		// 		let rc = theseLocs[i].id.split("-");
		// 		let col = rc[2];
		// 		let row = rc[1];
		// 		theseLocs[i].style.left = 51 + (col * 48.5) + "px";
		// 		theseLocs[i].style.top = 402 + (row * 41) + "px";
		// 	}
		// }

		// {
		// 	// create clickable cred locations
		// 	let theseLocs = document.getElementsByClassName("credloc");
		// 	for (let i=0; i < theseLocs.length; i++) {
		// 		let col = theseLocs[i].id.split("-")[1];
		// 		theseLocs[i].style.left = 13 + (col * 31.7) + "px";
		// 	}
		// }
	

    }
	

}

class ContractClient extends Contract {
	constructor(NFTTYPE, BONUSTYPE, num) {
		super(NFTTYPE, BONUSTYPE, num);
		this.dom = null;
	}
	updateContractInfo(game) {
		//this.dom = document.getElementById(CLICKITEM.CONTRACT + "-" + this.num);
		if (!this.dom) {
			// create dom object
			// let t = this.nftType;
			// let bt = this.bonusType.slice(0,4);
			this.dom = document.getElementById(`contracttemplate`).cloneNode(true);
			this.dom.id = CLICKITEM.CONTRACT.concat('-', this.num);
			this.dom.classList.remove('invis');
			this.dom.getElementsByClassName('contracttype')[0].src = `res/${this.nftType}.png`;
			this.dom.getElementsByClassName('contractfrontbonus')[0].src = `res/${this.bonusType}.png`;
			// this.dom = twoSided(CLICKITEM.CONTRACT + "-" + this.num,
			// 	"res/contracttop" + t + ".png",
			// 	"res/contractBack.jpg",
			// 	"contract");

			// this.dom.classList.add("contract");
			document.getElementById("allboardsdiv").appendChild(this.dom);

		}
		this.dom.classList.remove("pinkup");
		// move/flip contracts as needed
		let offset = {top:0, left:0};
		switch (this.location.type) {
			case CONTRACTLOC.DISCARD:
				this.dom.classList.add("showback");
				this.dom.style.zIndex = 2;
				offset.left = -5;
				offset.top = 1;

			
				break;
			case CONTRACTLOC.DECK:
				this.dom.classList.add("showback");
				// this.dom.style.visibility = "visible";
				this.dom.style.zIndex = 2;
				offset = boardOffset(document.getElementsByClassName('contractspace')[0]);
				if (game.options.numContractPiles != 4) {
					// >4 piles, don't show deck
					offset.left = -5;
				}
				break;
			case CONTRACTLOC.DEALT:
				// TODO deal with zIndex

				// this.dom.style.visibility = "visible";
				this.dom.classList.remove("showback");
				// offset.top = "20px";
					offset = boardOffset(document.getElementsByClassName('contractspace')[this.location.num + 1]);
				if (game.options.numContractPiles == 4) {
					// offset.left = 102 + (this.location.num) * 80 + "px";
					this.dom.style.zIndex = 2 + (this.location.num) * 5 + (4 - this.location.pos);
				} else {
					// offset = boardOffset(document.getElementsByClassName('contractspace')[this.location.num]);
					// offset.left = 5 + (this.location.num) * 50 + "px";
					this.dom.style.zIndex = 2 + (this.location.num);
				}
				
				break;
			case CONTRACTLOC.PLAYER:
				// this.dom.style.visibility = "visible";
				if (this.faceUp) {
					this.dom.classList.remove("showback");
				} else {
					this.dom.classList.add("showback");
					if (!this.moneyUp) {
						// only time we do this is in player display of card back
						this.dom.classList.add("pinkup");
					}
				}
				this.dom.style.zIndex = 2;
				// let offset = boardOffset(document.getElementById("playerbrd" + this.location.plNum));
				// offset.top = offset.top + 108 + "px";
				// offset.left = offset.left + 188 + (this.location.num * 88) + "px";
				offset = boardOffset(document.getElementById("playerbrd" + this.location.plNum).getElementsByClassName('pbcontractspace')[this.location.num]);
				break;
		
			default:
				break;
		}		
		this.dom.style.top = offset.top + "vw";
		this.dom.style.left = offset.left + "vw";
	}
}
	
class PlayerClient extends Player {
	constructor() {
		super();
		this.score = 0;
		this.board = new PlayerBoardClient(this);
		for (let i=0; i < 10; i++) {
				this.helpers.push(new HelperClient(i));
		}
		this.boardDom = null;
		this.infoDom = null;
		this.playerpiece = null;
		this.playerdisc = null;
		this.discAdj = 0;

	}

	updatePlayerInfo(plNum, game, score) {

		if (!this.playerpiece) {
			let boardDom = document.getElementById("boarddiv");

			this.playerpiece = document.createElement("IMG");
			this.playerpiece.id = "playerpiece".concat(plNum);
			this.playerpiece.src = "res/player_".concat(this.color,".png");
			this.playerpiece.classList.add('playerpiece', 'movable');
			boardDom.appendChild(this.playerpiece);

			this.playerdisc = document.createElement("IMG");
			this.playerdisc.id = "playerdisc".concat(plNum);
			this.playerdisc.src = "res/disc_".concat(this.color,".png");
			this.playerdisc.classList.add('playerdisc', 'movable');
			boardDom.appendChild(this.playerdisc);
			this.playerdisc.style.top = "33.1vw";
			// disc positions
			// 0 2
			// 3 1
			switch (plNum) {
				case 2:
					this.discAdj = .5;				
					break;
				case 1:
					this.discAdj = .5;
				case 3:
					this.playerdisc.style.top = "34.4vw";
					break;
			
				default:
					break;
			}
			this.boardDom = document.getElementById("playerbrd" + plNum);
			this.boardDom.classList.add("player" + this.color);
			this.infoDom = document.getElementById("playerinfo" + plNum);
			this.infoDom.style.display = "grid";
			for (let a of this.helpers) {
				a.initDom(this, a.num);
			}
		}

		if (game.state === GAMESTATE.FINALSCORE) {
			// TODO ???
		}
	
		PlayerClient.updatePlayerPiece(this.playerpiece, this.location);

		// update helpers
		
		let	helpers = this.helpers.filter((helper) => helper.location.type == HELPERLOC.DESK);
		helpers.forEach((helper, idx) => helper.updateHelperInfo(game, idx));
		
		helpers = this.helpers.filter((helper) => helper.location.type != HELPERLOC.DESK);
		helpers.forEach((helper) => helper.updateHelperInfo(game));

		// update cred marker
		this.playerdisc.style.left =  .1 + (this.cred * 1.65) + this.discAdj + "vw";
		

		for (let e of this.infoDom.children) {
			let classes = e.classList;
			if (!classes.length) continue;
			if (classes[0] == "icon") continue;
			switch (classes[0]) {
				case "playername":
					e.innerText = this.name;
					e.classList.add("color".concat(this.color));
					break;
				case "playertime":
					e.innerText = '#'.concat(plNum+1);
					break;
				case "playermoney":
					e.innerText = "$" + this.money;
					break;
				case "playerscore":
					if (score) {
						e.innerText = score;
					} else {
						e.innerText = '';
					}
					break;
				case "auctionbid":
					{
						const bids = [[1,1,1],[3,3,3],[6,6,6]];
						let bid = 0;
						let auctionHelpers = this.helpers.filter((helper) => helper.location.type == HELPERLOC.AUCTION);
						for (let helper of auctionHelpers) {
							bid += bids[helper.location.row][helper.location.col];
						}
						e.innerText = "$" + bid;
					}
					break;
				case "soldabstract":
					e.innerText = game.playerHasSold(plNum).filter((nft) => nft.type == NFTTYPE.ABSTRACT).length; 
					break;
				case "soldgalaxy":
					e.innerText = game.playerHasSold(plNum).filter((nft) => nft.type == NFTTYPE.GALAXY).length;
					break;
				case "solddejacat":
					e.innerText = game.playerHasSold(plNum).filter((nft) => nft.type == NFTTYPE.DEJACAT).length;
					break;
				case "soldphakeland":
					e.innerText = game.playerHasSold(plNum).filter((nft) => nft.type == NFTTYPE.PHAKELAND).length;
					break;
			
				default:
					break;
			}
		}
		document.getElementById("limit".concat(plNum)).innerHTML = game.playerHasSold(plNum).length + 1;
	}
	static updatePlayerPiece(pieceDom, location) {
		let offset = {top:0, left:0};
		switch (location.type) {
			case PLAYERLOC.HOME:
				offset = boardOffset(document.getElementsByClassName('gallery'.concat(pieceDom.id.slice(pieceDom.id.length-1)))[0]);
				break;
			case PLAYERLOC.ACTION:
				offset = boardOffset(document.getElementById(CLICKSPACE.ACTION.concat('-',location.loc)).getElementsByClassName("mainaction")[0]);
				offset.top += .4;
				offset.left += .4;
				break;
			case PLAYERLOC.KO:
				offset = boardOffset(document.getElementById(CLICKSPACE.ACTION.concat('-',location.loc)).getElementsByClassName("sideaction")[0]);
				offset.top += .3;
				offset.left += .3;
				break;
			default:
				break;
		}
		pieceDom.style.top = offset.top + "vw";
		pieceDom.style.left = offset.left + "vw";
	}
}



class PlayerBoardClient extends PlayerBoard {
	constructor(player) {
		super(player);
		this.dom = null;
	}
}

// FILE reptile
class RepTileClient extends RepTile {
	constructor() {
		super();
		this.dom = null;
	}

	updateRepTileInfo(idx) {

		if (!this.dom) {
			this.dom = document.createElement("IMG");
			this.dom = document.getElementsByClassName("tile")[this.tNum];
			this.dom.id = CLICKITEM.REPTILE + "-" + idx;
			// this.dom.title = this.tNum;
			this.dom.classList.add("movable"); //, "reptile");
			// this.dom.src = "res/reptile".concat(this.tNum,".png");
			// this.dom.style.backgroundImage = "url(res/reptile".concat(this.tNum,".png)");
			// document.getElementById("allboardsdiv").appendChild(this.dom);
		}
		let thisOffset = {};
		if (!isNaN(this.location.plNum)) {
			thisOffset = boardOffset(document.getElementById("playerbrd" + this.location.plNum));
		}
		this.dom.classList.remove('invis');
		switch (this.location.type) {
			case REPTILELOC.STARTTILE:
				thisOffset = boardOffset(document.getElementById(CLICKSPACE.ACTION.concat('-',this.location.actionSpace)).getElementsByClassName("mainaction")[0]);
				thisOffset.left += 2;
				break;
			case REPTILELOC.INTLMARKET:
				let idx = Object.keys(MARKETCOL).indexOf(this.location.col) + (3 * Object.values(NFTTYPE).indexOf(this.location.nftType));
				thisOffset = boardOffset(document.getElementsByClassName("markettilespace")[idx]);
				break;
			case REPTILELOC.DISPLAY:
				// this.dom.style.left = 280 + thisOffset.left + "px";
				// this.dom.style.top = 38 + thisOffset.top + "px";
				thisOffset = boardOffset(document.getElementById("playerbrd" + this.location.plNum).getElementsByClassName("pbnftspace")[2]);
				thisOffset.left += 2;
				thisOffset.top += 2;
				break;
			case REPTILELOC.PLAYER:
				// let bonusNum = Object.values(BONUSTYPE).indexOf(this.location.bonus);
				// let conv = {4:0,5:1,8:2,7:3,6:4,1:5}[bonusNum];
				thisOffset = boardOffset(document.getElementById("playerbrd" + this.location.plNum).getElementsByClassName("pbtilebonus")[this.location.bonusLoc]);
				
				// this.dom.style.left = 58 + thisOffset.left + (this.location.bonusLoc % 3 * 44) + "px";
				// this.dom.style.top = 107 + thisOffset.top + (Math.floor(this.location.bonusLoc/3) * 64) + "px";
				break;
		
			default:
				this.dom.classList.add('invis');
				break;
		}
		this.dom.style.left = thisOffset.left + "vw";
		this.dom.style.top = thisOffset.top + "vw";
		

	}
}


class VisitorClient extends Visitor {
	constructor(color, vNum) {
		super(color);
		this.num = vNum;
	}
	updateVisitorInfo(posNum) {
		if (!this.dom) {
			this.dom = document.createElement("IMG");
			this.dom.src = "res/visitor_" + this.color + ".png";
			this.dom.classList.add("movable", "visitor");
			this.dom.id = CLICKITEM.VISITOR + "-" + this.num;
			document.getElementById("boarddiv").appendChild(this.dom);
		}
		let offset = {top:0, left:0};
		this.dom.classList.remove("invis");
		switch (this.location.type) {
			case VISITORLOC.NFT:
				offset = boardOffset(document.getElementById(`space${this.location.nftType}`));
				offset.top += posNum;
				break;
			case VISITORLOC.NFTIST:
				offset = boardOffset(document.getElementById(CLICKITEM.NFTIST.concat('-', NFTISTCOLOR.RED, '-', this.location.nftType) ));
				break;
			case VISITORLOC.PLAZA:
				offset = boardOffset(document.getElementsByClassName("plaza")[0]);
				offset.left += (posNum % 7) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 7) * 1.2 + 1;
				break;
			case VISITORLOC.LOBBY:
				offset = boardOffset(document.getElementsByClassName(`lobby${this.location.plNum}`)[0]);
				offset.left += (posNum % 4) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 4) * 1.2 + 0.1;
				break;
			case VISITORLOC.GALLERY:
				offset = boardOffset(document.getElementsByClassName(`gallery${this.location.plNum}`)[0]);
				offset.left += (posNum % 7) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 7) * 1.2 + 2;
				break;
			case VISITORLOC.BAG:
				offset = boardOffset(document.getElementById("boarddiv"));
				offset.top += 3;
				offset.left += 34;
				if (this.color == VISITORCOLOR.BROWN) {
					offset.left += 2.5;
				} else if (this.color == VISITORCOLOR.PINK) {
					offset.left += 5;
				}
			default:
				this.dom.classList.add("invis");
				break;
		}
		this.dom.style.top = offset.top + "vw";
		this.dom.style.left = offset.left + "vw";
	
	}

}

class GameClient extends Game {
	constructor(numPlayers) {
		super();
		this.localFlags = 0;
		this.iAmPlNum = -1;
		for (let n=0; n<8; n++) {
			let a = new NftistClient();
			this.nftists.push(a);
		}
		for (let t of Object.values(NFTTYPE)) {
			for (let i=0; i < 8; i++) {
				this.nft.push(new NftClient(t, i));
			}
		}
		this.board = new BoardClient();
		for (let p=0; p < numPlayers; p++) {
			this.players.push(new PlayerClient());
		}
		{
			let numRepTiles = 16;
			if (numPlayers < 3) numRepTiles = 12;
			for (let i=0; i < numRepTiles; i++) {
				this.repTiles.push(new RepTileClient());
			}
		}
		// 
		for (let t of Object.values(NFTTYPE)) {
			for (let b of Object.values(CONTRACTBONUS)) {
				if (b == CONTRACTBONUS.CRED && (t == NFTTYPE.GALAXY || t == NFTTYPE.PHAKELAND)) continue;
				if (b == CONTRACTBONUS.MONEY && (t == NFTTYPE.DEJACAT || t == NFTTYPE.ABSTRACT)) continue;
				this.contracts.push(new ContractClient(t, b, this.contracts.length));
			}
		}	
		{
			for (let c of Object.values(VISITORCOLOR)) {
				let numVisitors = 14;
				if (c === VISITORCOLOR.WHITE) numVisitors = 12;
				for (let i=0; i < numVisitors; i++) {
					this.visitors.push(new VisitorClient(c, this.visitors.length));
				}
			}
		}
		for (let c of Object.values(TIXCOLOR)) {
			let cDom = document.getElementById(CLICKITEM.TIX + "-" + c);
			let pDom = document.getElementById("allboardsdiv");
			let tdom = document.createElement("DIV");
			tdom.id = "tix-" + c + "-0";
			tdom.classList.add("movable", "tix".concat(c), "tixdiscard");
			tdom.style.backgroundImage = "url(res/ticket_" + c + ".png)";
			pDom.appendChild(tdom);
			// pDom.insertBefore(tdom, cDom);
			for (let i = 1; i < 20; i++) {
				let clone = tdom.cloneNode(true);
				clone.id = "tix-" + c + "-" + i;
				pDom.appendChild(clone);
				// pDom.insertBefore(clone, cDom);
			}
		}
		for (let e of document.getElementsByClassName("playerpiece")) {
			e.style.visibility = "hidden";
		}
	}
	
	
	drawTickets() {
		let totalLeft = 0;
		let lowestLeft = 99;
		let lowestColor = null;
		let tixOffset = {
			"pink":	 boardOffset(document.getElementById(CLICKITEM.TIX.concat('-', TIXCOLOR.PINK))),					  
			"brown": boardOffset(document.getElementById(CLICKITEM.TIX.concat('-', TIXCOLOR.BROWN))),						  
			"white":boardOffset(document.getElementById(CLICKITEM.TIX.concat('-', TIXCOLOR.WHITE)))			
		};
	for (let tcol in this.tickets) {
			// show tix info on side panel
			let dom = document.getElementById("tix" + tcol);
			let aTix = this.tickets[tcol];
			let numtix = aTix.filter((t) => t == TIXLOC.BOARD).length;
			// show ticket and update number left
			totalLeft += numtix;
			dom.innerText = numtix;
			if (numtix < lowestLeft) {
				lowestLeft = numtix;
				lowestColor = tcol;
			}

			let numPlTix = [0,0,0,0];
			for (let pl=0; pl < this.numPlayers; pl++) {
				numPlTix[pl] = aTix.filter((t) => t == TIXLOC["PLAYER".concat(pl)]).length;
			}
			
			// draw/move each ticket
			for (let i in aTix) {	// for each tix of a color
				let tloc = aTix[i];
				let offset;
				let tixDom = document.getElementById("tix-" + tcol + "-" + i);
				switch (tloc) {
					case TIXLOC.BOARD:
						// offset = boardOffset(document.getElementById("allboardsdiv"));
						tixDom.style.top = tixOffset[tcol].top  + "vw";
						tixDom.style.left =  tixOffset[tcol].left + "vw";
						tixDom.classList.remove("tixdiscard", "tixplayer");
						
						break;
					case TIXLOC.DISCARD:
						offset = boardOffset(document.getElementById("allboardsdiv"));
						// tixDom.style.top = "400px";
						// tixDom.style.left = (offset.left - 200) + "px";
						tixDom.classList.add("tixdiscard");
						break;
				
					default:
						// TIXLOC.PLAYERn
						let plNum = tloc.slice(-1);
						// offset = boardOffset(document.getElementById("playerbrd" + plNum));
						// tixDom.style.top = (offset.top + tixPlOffset[tcol]) + "px";
						// tixDom.style.left = (offset.left + 433) + "px";
						offset = boardOffset(document.getElementById("playerbrd" + plNum).getElementsByClassName(tcol)[0]);
						tixDom.style.top = offset.top + "vw";
						tixDom.style.left = offset.left + "vw";
						tixDom.classList.remove("tixdiscard");
						tixDom.classList.add("tixplayer");
						if (numPlTix[plNum]) {
							tixDom.innerHTML = numPlTix[plNum];
							tixDom.classList.add("tixtop");
							numPlTix[plNum] = 0;
						} else {
							tixDom.classList.remove("tixtop");
							tixDom.innerHTML = null;
						}
						break;
				}
			}
		}
		
		let tixPrevDom = document.getElementById("tixany").previousElementSibling;
		if (this.getFlag(FLAG.TIX_EMPTY)) {
			tixPrevDom.classList.add('completed');
		} else {
			tixPrevDom.classList.remove('completed');
		}
		document.getElementById("tixany").innerText = totalLeft;
		let intScoreDom = document.getElementsByClassName("intscore");
		if (lowestLeft) {
			// all tix piles have > 0, show the lowest
			document.getElementById("tixlowest").innerText = lowestLeft;
			document.getElementById("tixlowestimg").src = "res/ticket_" + lowestColor + ".png";
		}
		for (let e of intScoreDom) {
			e.style.visibility = lowestLeft ? "visible" : "hidden";
		}
	}
	nextPlayer() {
		// only used by server
		return;
	}
	actionMsg(msg) {
		// update 'action' section with message
		document.getElementById("actionmsg").innerHTML = msg;
		if (msg == PROMPT[lang].FINALSCORE) {
			document.getElementById("actionmsg").style.cursor = 'pointer';
			document.getElementById("actionmsg").onclick = function() {
				document.getElementById("finalstats").style.visibility = "visible";
			};
		}
	}
	clearClickables() {
		// remove all clickables
		this.removeDomClass("clickable");
		let inv = document.getElementsByClassName("invis_able");
		for (let i=0; i < inv.length; i++) {
			inv[i].classList.add("invis");
		}
		//document.getElementById("orientationdiv").style.display = "none";
	}
	gotClicked(el) {
		while (el) {
			// this while loop checks if what was clicked was clickable and, if not,
			// checks the parent (ad infinitum) because sometimes the clickable element
			// is partially hidden (ex: nftist partially hidden) by bonus tile)
			// (another example might be all the elements that make up a flippable card)
			// (this only works for when element is child of clickable element)
			if ((el.classList && el.classList.contains("clickable")) || el.nodeName == "BUTTON") {
				let loc = el.id.split("-");
				if (loc[0] == CLICKSPACE.DEALCONTRACTS && this.options.numContractPiles == 4) {
					// in normal mode, deal is un-undoable
					if (!this.confirmNoUndo("Dealing Contracts cannot be undone. click 'OK' to deal")) break;
				}
				if (this.state == GAMESTATE.START) {
					// confirm all starting loc picks
					if (!this.confirmNoUndo("This cannot be undone. click 'OK' to confirm")) break;
				}
				this.sendMove({
					playerId:playerId,
					gameId:gameId,
					moveNum: this.moveNum,
					// moveNum: to ensure client has current state when making move
					move:{
						plNum: this.activePlayer,	// this allows server to just add move to list for easy debug
						location:el.id,
					}	
				});

				break;
			}
			el = el.parentNode;
		}	
		return;
	}
	confirmNoUndo(txt) {
		// TODO add setting/option for skipping this and just return true;
		if (this.state == GAMESTATE.START) return true; // temporary
		return confirm(txt);
	}

	waitingMsg(game) {
		if (waitingForServer) game.actionMsg(PROMPT[lang].WAITING);
		waitingForServer = false;
	}

	waitForServer() {
		this.clearClickables();
		waitingForServer = true;
		setTimeout(this.waitingMsg, 800, this);

		// this.actionMsg("Waiting for server");
	}

	sendMove(moveObj) {
		this.waitForServer();

		socket.emit("player move", moveObj);
	}

	updateInfo(msg) {
		// let boardDom = document.getElementById("boarddiv");
		// update player stuff

		for (let pnum = 0; pnum < this.numPlayers; pnum++) {
			this.players[pnum].updatePlayerInfo(pnum, this, msg.score[pnum]);
		}

		// update tickets
		this.drawTickets();
		

		let magnatePrevDom = document.getElementById("nummagnate").previousElementSibling;
		document.getElementById("nummagnate").innerText = this.numMagnate(); 
		if (this.getFlag(FLAG.TWO_MAGNATE)) {
			magnatePrevDom.classList.add('completed');
		} else {
			magnatePrevDom.classList.remove('completed');
		}

		// update nft not on player boards
		let auctionCount = 0;
		for (let i in this.nft) {
			if (this.nft[i].location.type != NFTLOC.WALLET) {
				if (this.state == GAMESTATE.FINALAUCTION && this.nft[i].location.type == NFTLOC.AUCTION) {
					this.nft[i].updateArtInfo(auctionCount);
					auctionCount++;
				} else {
					this.nft[i].updateArtInfo();
				}
			}
		}
		for (let pl=0; pl < this.numPlayers; pl++) {
			let nftDisplay = this.playerHasDisplayed(pl);
			nftDisplay.forEach((a) => a.value = a.byArtist != null ? this.nftists[a.byArtist].getValue() : this.auctionValue(a).value + 64);
			if (nftDisplay.length > 1) {
				nftDisplay.sort((a,b) => a.value - b.value);
			}
			for (let i=0; i < nftDisplay.length; i++) {
				// let val = nftDisplay[i].byArtist ? this.nftists[nftDisplay[i].byArtist].getValue() : this.auctionValue(nftDisplay[i]);
				nftDisplay[i].updateArtInfo(i, this.players[pl].boardDom, nftDisplay[i].value % 64);
			}
		}

		// update nftists
		for (let a of this.nftists) {
			a.updateArtistInfo(this);
		}
		
		// update thumbs
		for (let n=0; n < this.thumbs.length; n++) {
			for (let i=0; i < this.thumbs[n].length; i++) {
				let thumbDom = document.getElementById("i_thumb-" + n + "-" + i);
				if (!thumbDom) {
					// thumbDom = document.createElement("IMG");
					// thumbDom.src = "res/thumb" + n + ".png";
					thumbDom = document.createElement("DIV");
					thumbDom.id = "i_thumb-" + n + "-" + i;
					thumbDom.classList.add("movable", "nftistpromo", "thumb");
					thumbDom.style.background = `linear-gradient(90deg, #FFFFFF 40%, #${['f3eddc','ffeb98','fad399','ef9dbb','ccab13'][n]} 40%)`;
					document.getElementById("boarddiv").appendChild(thumbDom);
					let tmpDom = document.createElement("P");
					tmpDom.innerHTML = String(n+1) + "&nbsp;&nbsp;&UpperRightArrow;";
					thumbDom.appendChild(tmpDom);
				}
				if (!this.thumbs[n][i].color) {
					// unused pile
					thumbDom.style.top = "32vw";
					thumbDom.style.left = 16.2 + (n * 3) + "vw";
				} else {
					// on nftist
					let offset = boardOffset(document.getElementById(CLICKITEM.NFTIST.concat('-', this.thumbs[n][i].color, '-', this.thumbs[n][i].nftType)).getElementsByClassName("nftistpromo")[0]);
					thumbDom.style.top = offset.top + "vw";
					thumbDom.style.left = offset.left + "vw";
				}
					
			}
		}

	
		// update reptiles
		this.repTiles.forEach((r, idx) => r.updateRepTileInfo(idx));

		// update nft Pile #'s
		for (let t of Object.values(NFTTYPE)) {
			document.getElementById("remain" + t).innerText = this.nft.filter((a) => (a.type == t) && (a.location.type == NFTLOC.PILE || a.location.type == NFTLOC.PILETOP)).length;
		}		
		
		// update visitors
		for (let locType of Object.values(VISITORLOC)) {
			let vHere;
			switch (locType) {
				case VISITORLOC.NFT:
					for (let nftType of Object.values(NFTTYPE)) {
						vHere = this.visitors.filter((v) => v.location.type == locType && v.location.nftType == nftType);
						vHere.forEach((visitor, idx) => visitor.updateVisitorInfo(idx));
					}
					break;

				// case VISITORLOC.PLAZA:
				// 	break;

				case VISITORLOC.LOBBY:
				case VISITORLOC.GALLERY:
					for (let plNum = 0; plNum < 4; plNum++) {
						vHere = this.visitors.filter((v) => v.location.type == locType && v.location.plNum == plNum);
						vHere.forEach((visitor, idx) => visitor.updateVisitorInfo(idx));	
					}
					break;
			
				default:
					vHere = this.visitors.filter((v) => v.location.type == locType);
					vHere.forEach((visitor, idx) => visitor.updateVisitorInfo(idx));
					break;
			}
		}
		// this.visitors.forEach((v) => v.updateVisitorInfo());

		// contractspaces
		let cSpaceNodes = document.getElementsByClassName('contractspace');
		for (let i=this.options.numContractPiles+1; i < cSpaceNodes.length; i++) {
			cSpaceNodes[i].classList.add('invis');
		}
		
		// update contracts 
		this.contracts.forEach((c) => c.updateContractInfo(this));
		
		for (let c of Object.values(VISITORCOLOR)) {
			document.getElementById("bag" + c).innerText = this.visitors.filter((v) => v.color == c && v.location.type == VISITORLOC.BAG).length;
		}
		document.getElementById("bagany").innerText = this.visitors.filter( (v) => v.location.type == VISITORLOC.BAG).length;
		
		let bagPrevDom = document.getElementById("bagany").previousElementSibling;
		if (this.getFlag(FLAG.BAG_EMPTY)) {
			bagPrevDom.classList.add('completed');
		} else {
			bagPrevDom.classList.remove('completed');
		}

		// update hung/sold cards
		// msg.soldcard/hungcard will be array of objects like:
		// [{"galaxy":1},{"dejacat":2,"phakeland":1,"abstract":1}]
		// each array entry is the bonus reqs
		if (msg.soldcard) {
			for (let i=0; i < msg.soldcard.length; i++) {	// normally 0-2
				let ii = 0;
				for (let j in msg.soldcard[i]) {	// j will be the types of nft needed
					let myArtOfType = this.nft.filter((a) => a.location.type === NFTLOC.SOLD && a.location.plNum === this.iAmPlNum && a.type === j);
					let numOfType = myArtOfType.length;
					let haveFromAuction = myArtOfType.filter((a) => a.location.fromAuction).length;
					for (let k=0; k < msg.soldcard[i][j]; k++) {	// k will be how many of type j needed
						let el = document.getElementById(`sold-${i}-${ii}`);
						let elsib = el.nextSibling;
						el.src = `res/${j}.png`;
						if (k >= numOfType) {
							// mark this req as not yet met
							elsib.classList.remove('done');
							elsib.classList.add('missing');
						} else {
							// mark this req as met
							elsib.classList.remove('missing');
							if (haveFromAuction) {
								elsib.classList.remove('done');
								elsib.classList.add('doneauction');
								haveFromAuction = 0;
							} else {
								elsib.classList.add('done');
							}
						}
						ii++;
					}
				}
			}
		}
		if (msg.hungcard) {
			for (let i=0; i < msg.hungcard.length; i++) {	// normally 0-1
				let ii = 0;
				for (let j in msg.hungcard[i]) {
					let myArtOfType = this.nft.filter((a) => a.location.type === NFTLOC.WALLET && a.location.plNum === this.iAmPlNum && a.type === j);
					let numOfType = myArtOfType.length;
					let haveFromAuction = myArtOfType.filter((a) => a.location.fromAuction).length;
					for (let k=0; k < msg.hungcard[i][j]; k++) {
						let el = document.getElementById(`hung-${i}-${ii}`);
						let elsib = el.nextSibling;
						el.src = `res/${j}.png`;
						if (k >= numOfType) {
							// mark this req as not yet met
							elsib.classList.remove('done');
							elsib.classList.add('missing');
						} else {
							// mark this req as met
							elsib.classList.remove('missing');
							if (haveFromAuction) {
								elsib.classList.add('doneauction');
								haveFromAuction = 0;
							} else {
								elsib.classList.add('done');
							}
						}
						ii++;
					}
				}
			}
		}

		// update auction works and values
		let auctionTypes = [];
		for (let a of this.nft.filter((a) => a.location.type == NFTLOC.AUCTION)) {
			auctionTypes.push(a.type);
		}
		for (let t of Object.values(NFTTYPE)) {
			let valDom = document.getElementById("auction" + t);
			if (auctionTypes.includes(t)) {
				// this type is in the auction
				let val = msg.auction[t];
				valDom.innerText = val;
			} else {
				valDom.previousElementSibling.style.display = "none";
				valDom.style.display = "none";
			}
		}

		// update log
		let logLines = document.getElementsByClassName("logline");
		while (logLines.length > this.log.length) {
			// this is for UNDO
			logLines[logLines.length-1].remove();
		}
		let logDom = document.getElementById("loglist");
		for (let i=logLines.length; i < this.log.length; i++) {
			let line = document.createElement("LI");
			line.innerHTML = this.decodeMsg(this.log[i]);
			line.classList.add("logline");
			if (this.log[i].startsWith("TAKESTURN".concat(':'))) {
				line.classList.add("logturn");
			} else if (i % 2) {
				line.classList.add("logodd");
			}
			logDom.appendChild(line);
			logDom.scrollIntoView(false);
		}

		// update clickable spaces
		this.clearClickables();
		// this.removeDomClass("clickable");
		if (this.state == GAMESTATE.FINALSCORE) {
			let txt = PROMPT[lang].FINALSCORE;
			let place = 0;
			let playerPlace = [0,0,0,0];
			for (let i = 0; i < this.results.length; i++) {
				if (i) {
					if (this.results[i].score != this.results[i-1].score) place = i;
				}
				playerPlace[this.results[i].player] = place;
				// txt += `<br>${PROMPT[lang].PLACE[place]}-${this.decodeMsg("PLNAME".concat(':',this.results[i].player))}-${this.results[i].money}`;
			}
			this.actionMsg(txt);
			// show final stats
			document.getElementById("finalstats").classList.remove('invis');
			let rowDoms = document.getElementById("statsplayers").getElementsByClassName("stats");
			// show player names
			for (let plNum=0; plNum < this.numPlayers; plNum++) {
				rowDoms[plNum].classList.remove('invis');
				rowDoms[plNum].classList.add('color'.concat(this.players[plNum].color));
				rowDoms[plNum].innerHTML = this.players[plNum].name;
				//rowDoms[plNum].innerHTML = this.decodeMsg("PLNAME".concat(':',plNum)); //this.players[plNum].name;
			}
			rowDoms = document.getElementById("statsplace").getElementsByClassName("stats");
			// show players' finish place
			for (let plNum=0; plNum < this.numPlayers; plNum++) {
				rowDoms[plNum].classList.remove('invis');
				rowDoms[plNum].innerHTML = PROMPT[lang].PLACE[playerPlace[plNum]];
			}
			rowDoms = document.getElementById("statsfinalscore").getElementsByClassName("stats");
			// show players final score
			for (let plNum=0; plNum < this.numPlayers; plNum++) {
				rowDoms[plNum].classList.remove('invis');
				rowDoms[plNum].innerHTML = this.players[plNum].money;
			}
			// show stats for score
			for (let statcat in this.stats) {
				for (let stat in this.stats[statcat]) {
					rowDoms = document.getElementById("stats".concat(statcat,stat)).getElementsByClassName("stats");
					if (!rowDoms.length) continue;
					for (let plNum=0; plNum < this.numPlayers; plNum++) {
						rowDoms[plNum].classList.remove('invis');
						rowDoms[plNum].innerHTML = this.stats[statcat][stat][plNum];
					}
				}
			}
		} else if (this.activePlayer == this.iAmPlNum) {
			if (msg) {
				// TODO won't ding if same player plays next (i.e player has KO, then turn or player plays then chooses in Auction)
				if (!alertSoundPlayed && !Number(document.getElementById("autoplay").value)) {
					document.getElementById("playsound").play();
					alertSoundPlayed = true;
				}
				for (let cl of msg.clickables) {
					try {
						document.getElementById(cl).classList.remove("invis");
						if (!cl.startsWith("b_")) {
							document.getElementById(cl).classList.add("clickable");
						}
						if (cl.startsWith(CLICKITEM.ORIENTATION) ) document.getElementById("orientdiv").classList.remove("invis");
					} catch (error) {
						console.log(`Didn't find element id: ${cl}`);
					}
				}
				// do messages
				if (msg.msgs.length) {
					let txt = PROMPT[lang].CHOOSE;
					for (let m of msg.msgs) {
						if (m.startsWith('#')) {
							let mParts =  m.split("#");
							let mId = mParts[1];
							let buttDom = document.getElementById(mId);
							buttDom.classList.remove("invis");
							buttDom.innerHTML = this.decodeMsg(mParts[2]);
							if (mId == CLICKITEM.HIREHELPER + "-1") document.getElementById("hirediv").classList.remove("invis");
						// } else if (m.startsWith(CLICKITEM.HIREHELPER)) {
						// 	document.getElementById("hirediv").classList.remove("invis");
						// 	let [tmp, num2hire, cost] = m.split(":");
						// 	let buttDom = document.getElementById(tmp + "-" + num2hire);
						// 	buttDom.classList.remove("invis");
						// 	buttDom.innerHTML = "Hire " + num2hire + " for &dollar;" + cost;
						} else {
							txt += "<br>- " + this.decodeMsg(m);
						}
					}
					this.actionMsg(txt);
				} else {
					this.actionMsg('');
				} 
			}
		} else {
			alertSoundPlayed = false;
			this.actionMsg(this.players[this.activePlayer].name + PROMPT[lang].TAKINGTURN);
		}

		if (Number(document.getElementById("autoplay").value) && this.state != GAMESTATE.FINALSCORE) {
			if (msg.playerNum == this.activePlayer) {
				// this is a robot player
				// choose an action and send it
				let action = this.lessRandomBot(msg);
				this.sendMove({
					playerId:playerId,
					gameId:gameId,
					moveNum: this.moveNum,
					// moveNum: to ensure client has current state when making move
					move:{
						plNum: this.activePlayer,	// this allows server to just add move to list for easy debug
						location:action,
					}	
				});

			}
			return;
		}

		if (this.state != GAMESTATE.FINALSCORE) {
			if (this.getFlag(FLAG.MID_TRIGGERED) && !(this.localFlags & FLAG.MID_TRIGGERED) ) {
				// server set midtrigger and locally not yet set, maybe need alert, maybe user reloaded browser
				this.localFlags |= FLAG.MID_TRIGGERED;
				if (!this.getFlag(FLAG.MID_DONE) ) {
					// haven't done mid scoring yet (if already done, do not alert)
					alert(PROMPT[lang].MIDALERT);
				}
			}
			if (this.getFlag(FLAG.END_TRIGGERED) && !this.getFlag(FLAG.FINAL_ROUND) && !(this.localFlags & FLAG.END_TRIGGERED) ) {
				// server set endtrigger and locally not yet set, maybe need alert, maybe user reloaded browser
				this.localFlags |= FLAG.END_TRIGGERED;
				alert(PROMPT[lang].ENDALERT);
			}
			if (this.getFlag(FLAG.FINAL_ROUND) && !(this.localFlags & FLAG.FINAL_ROUND) ) {
				// server set endtrigger and locally not yet set, maybe need alert, maybe user reloaded browser
				this.localFlags |= FLAG.FINAL_ROUND;
				alert(PROMPT[lang].FINALROUND);
			}	
		}

	}

	randomBot(msg) {
		let action;
		do {
			action = msg.clickables[Math.floor(Math.random() * msg.clickables.length)];
		} while (action == CLICKITEM.REDOBUTTON);

		return action;
	}

	lessRandomBot(msg) {
		let action = this.randomBot(msg);
		// add more robot code here 
		////////////////////////////////////////////
		// if state if PICKACTION priority is nft if need nft to match contract, contract if needed to match nft
		//			helper if available and none free, market if turn > numplayers*2 && > 1 helper free && not in all cols && free tile space
		function neededArtTypes(game) {
			let playerFaceUpContracts = game.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === game.activePlayer && c.faceUp);
			let playerArt = game.playerHasDisplayed();
			let contractsInNeed = [];
			for (let c of playerFaceUpContracts) {
				let idx = playerArt.findIndex((a) => a.type === c.nftType);
				if (idx == -1) {
					// we have no nft for this contract
					contractsInNeed.push(c.nftType);
				}
			}
			return contractsInNeed;
		}
		function neededContractTypes(game) {
			let playerFaceUpContracts = game.contracts.filter((c) => c.location.type === CONTRACTLOC.PLAYER && c.location.plNum === game.activePlayer && c.faceUp);
			let playerArt = game.playerHasDisplayed();
			let nftInNeed = [];
			if (playerFaceUpContracts.length < 3) {
				for (let a of playerArt) {
					let idx = playerFaceUpContracts.findIndex((c) => c.nftType === a.type);
					if (idx == -1) {
						// no contract for this nft
						nftInNeed.push(a.type);
					}
				}
			}
			return nftInNeed;

		}
		if (this.state === GAMESTATE.PICKACTION) {
			if (msg.clickables.includes(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.NFT}))) {
				// get nft/discover is a possible action
				// what nft could we get that matches a contract we have
				// remove contracts that already match nft
				if (neededArtTypes(this).length) {
					// is any of this nft available and affordable?
					// above is getArtClicks in server
					// for now, do we have a space is enough
					if (this.playerHasDisplayed().length < 3) {
						return this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.NFT});
					}
				}
			}  
			if (msg.clickables.includes(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.SALES}))) {
				// sales action possible
				let nftInNeed = neededContractTypes(this);
				if (nftInNeed.length) {
					// got some nft in need of a contract
					if (this.contracts.filter((c) => c.location.type === CONTRACTLOC.DEALT && nftInNeed.includes(c.nftType))) {
						return this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.SALES});
					}
				}
				if (nftInNeed.length < this.playerHasDisplayed().length && this.players[this.iAmPlNum].money < 6) {
					// if have sellable nft and have less than $6 on hand, sell
					return this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.SALES});
				}
				
			}  
			if (msg.clickables.includes(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MEDIA}))) {
				// media action available
				if (this.getAvailableHelpers().length < 1 && this.getUnemployed().length) {
					return this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MEDIA});
				} 

			} 
			if (msg.clickables.includes(this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MARKET}))) {
				// if turn > numplayers*2 && > 1 helper free && not in all cols && free tile space
				if (this.turnNum > this.numPlayers*2 && 
					this.getAvailableHelpers().length > 1 && 
					this.repTiles.filter((t) => t.location.type == REPTILELOC.PLAYER && t.location.plNum == this.iAmPlNum).length < 6) {

					// let helperInLobby = this.visitors.filter((v) => v.location.type === VISITORLOC.LOBBY && v.location.plNum === this.iAmPlNum);
					// col free is essentially getMarketClicks. add later TODO
					return this.obj2Str({type:CLICKSPACE.ACTION,loc:ACTIONLOC.MARKET});
				}
				
			}
		} else if (this.state == GAMESTATE.SALES_MAIN || this.state == GAMESTATE.KOSALES) {
			// if state is SALES_MAIN priority is contract that matches unmatched wallet nft or sale that helps secret
			let typesNeeded = neededContractTypes(this);
			if (typesNeeded.length) {
				let contractNumsAvail = [];
				for (let c of msg.clickables) {
					if (c.startsWith(CLICKITEM.CONTRACT)) {
						contractNumsAvail.push(c.slice(c.search('-')+1));
					}
				}
				let usefulContracts = this.contracts.filter((c) => typesNeeded.includes(c.nftType) && contractNumsAvail.includes(c.num));
				if (usefulContracts.length && msg.clickables.includes()) {
					let tmpSearch = this.obj2Str({type:CLICKITEM.CONTRACT,num:usefulContracts[0].num});
					let tmpClick = msg.clickables.find((c) => c == tmpSearch);
					if (tmpClick) return tmpClick;
				}				
			}
		} else if (this.state == GAMESTATE.NFT_MAIN || this.state == GAMESTATE.KOART) {
			// if state is NFT_MAIN priority is nft/nftist that matches contract w/o nft
			let typesNeeded = neededArtTypes(this);
			if (typesNeeded.length) {
				for (let t of typesNeeded) {
					let firstArtist = msg.clickables.find((c) => c.endsWith(t));
					if (firstArtist) {
						return firstArtist;
					}
				}
			}
			
		} else if (this.state == GAMESTATE.MEDIA_MAIN || this.state == GAMESTATE.KOMEDIA) {
			// if state is MEDIA_MAIN priority is get helper if 0 free
			if (this.getAvailableHelpers().length < 1 && 
				this.getUnemployed().length) {
				if (msg.clickables.includes(this.obj2Str({type:CLICKITEM.HIREHELPER, num:2}))) {
					return this.obj2Str({type:CLICKITEM.HIREHELPER, num:2});
				}
				if (msg.clickables.includes(this.obj2Str({type:CLICKITEM.HIREHELPER, num:1}))) {
					return this.obj2Str({type:CLICKITEM.HIREHELPER, num:1});
				}
			} 
		} else if (this.state == GAMESTATE.MARKET_MAIN || this.state == GAMESTATE.KOMARKET) {
			// if state is MARKET_MAIN priority is col without helper ?
			// needs getMarketClicks TODO
		}

		////////////////////////////////////////////
		// if action is not changed, it will be random from above
		return action;
	}

	decodeMsg(msg) {
		let parts = msg.split(':');
		// parts[0] is PROMPT object key
		let ret = PROMPT[lang][parts[0]];
		if (parts.length == 1) {
			return ret;
		}
		for (let i=1; i < parts.length; i++) {
			// set sub to first $n[n] in 
			let sub = ret.match(/[$]\d+/)[0];

			// set c to ["$", digit [,digit]]
			let c = sub.split('');
			let val = parts[Number(c[1])];
			if (c.length == 2) {
				// regular substitution
				ret = ret.replace(sub, val);
			} else {
				// assume c length == 3
				switch (c[2]) {
					case '1':
					// replace with nftType
						ret = ret.replace(sub, PROMPT[lang].NFTTYPE[val]);
						break;

					case '2':
					// replace with nftist
						let nftist = this.nftists[Number(val)];
						ret = ret.replace(sub, `${PROMPT[lang][nftist.color]} ${PROMPT[lang].NFT2NFTIST[nftist.type]}`);
						break;
				
					case '3':
						ret = ret.replace(sub, `<span class="color${this.players[Number(val)].color}">${this.players[Number(val)].name}</span>`);
						break;

					case '4':
						// msg within a msg
						ret = ret.replace(sub, this.decodeMsg(val));
						break;

					default:
						// TODO error
						break;
				}
			}
		}
		return ret;
	}

	setAsClient(plNum) {
		this.iAmPlNum = plNum;

		// move dom nodes so this player board/info is shown first
		for(let pd = 0; pd < 4; pd++) {
			let newNum = (plNum + pd) % 4;
			let dom = document.getElementById("playerbrdx" + pd);
			dom.id = "playerbrd".concat(newNum);
			
			dom = document.getElementById("playerinfox" + pd);
			dom.id = "playerinfo".concat(newNum);
			
			// put this player in upper right corner
			dom =  document.getElementById("limitx" + pd);
			dom.id = "limit".concat(newNum);
			dom = document.getElementsByClassName("galleryx" + pd)[0];
			dom.classList.add("gallery".concat(newNum));
			dom = document.getElementsByClassName("lobbyx" + pd)[0];
			dom.classList.add("lobby".concat(newNum));
		}
		// add colors on main board
		for (let pl = 0; pl < 4; pl++) {
			let colClass = "playergrey";
			if (pl < this.numPlayers) {
				colClass = "player".concat(this.players[pl].color);
			}
			document.getElementsByClassName("gallery" + pl)[0].classList.add(colClass);
			document.getElementsByClassName("lobby" + pl)[0].classList.add(colClass);
		}

		// show curator/dealer cards
		let cdom = document.getElementById("hungcard");
		cdom.classList.remove('invis');
		cdom.src = "res/endgame" + this.players[plNum].curator + ".png";
		let ddom = document.getElementById("soldcard");
		ddom.classList.remove('invis');
		ddom.src = "res/endgame" + (this.players[plNum].dealer + 4) + ".png";

		
	}


	removeDomClass(cls) {		
		let doms = document.getElementsByClassName(cls);
		while (doms.length) {
			doms[0].classList.remove(cls);
		}
	}

}

//var game = null;

function main() {
    // let width = window.innerWidth;
    // let height = window.innerHeight;
	// let serverData = JSON.parse(testStorage);

	let game = null;

	function docClick(e, game) {   //when the document is clicked

		let el = e.target;                   //assign the element clicked to el

		game.gotClicked(el);

	}

	document.getElementById("autoplay").onchange = function() {getServerUpdate()};

	socket.on('game update', function(msg) {
		waitingForServer = false;

		console.log('game update rcvd');
		let msgObj = msg;
		if (!game) {
			game = new GameClient(msgObj.numPlayers);
			game.deserialize(msgObj);
			game.setAsClient(msgObj.playerNum);
			window.addEventListener('resize', getServerUpdate); //function() {game.updateInfo.call(game, msgObj)});

			document.getElementById("allboardsdiv").onclick = function(e) {docClick(e, game)};

			let buttons = document.getElementsByTagName("button");
			for (let i=0; i < buttons.length; i++) {
				buttons[i].onclick = function(e) {
					game.gotClicked(this);
				};
			}
		
			// invis unused player boards/info
			for (let i=game.numPlayers; i < 4; i++) {
				document.getElementById("playerbrd" + i).classList.add('invis');
				document.getElementById("playerinfo" + i).classList.add('invis');
			}
			document.title += " - " + game.players[msgObj.playerNum].name;
			// document.getElementById("playerbrd" + msgObj.playerNum).style.display = "inline-block";
		} else {
			game.deserialize(msgObj);
		}
		game.updateInfo(msgObj);
				
	});

	socket.on('server error', () => {
		alert('Server error');
	});

}

var playerId = null;
var gameId = null;
var alertSoundPlayed = true;

function soundAdj() {
	let  audioDom = document.getElementById("playsound");
	audioDom.volume = Number(document.getElementById("soundrange").value) / 10;
	audioDom.play();
	storeData();
}

function storeData() {
	sessionStorage.setItem("nftdealer", JSON.stringify({soundrange:document.getElementById("soundrange").value, lang:lang}));
}

function changeLang() {
	lang = document.getElementById("lang").value;
	storeData();
	getServerUpdate();
}

window.onload = function() {
	main();
	getServerUpdate();
	document.getElementById("soundrange").addEventListener("change", soundAdj);
	document.getElementById("lang").addEventListener("change", changeLang);
	let tmp = sessionStorage.getItem("nftdealer");
	let oldInfo;
	if (tmp) oldInfo = JSON.parse(tmp);
	if (oldInfo && !isNaN(oldInfo.soundrange)) {
		document.getElementById("soundrange").value = oldInfo.soundrange;
		soundAdj();
	}
	if (oldInfo && oldInfo.lang) {
		lang = oldInfo.lang;
		document.getElementById("lang").value = lang;
	}
}

function getServerUpdate() {
	let url = window.location;

	if (url.search) {
		let params = new URLSearchParams(url.search);
		playerId = params.get("pid");
		gameId = params.get("gid");
		socket.emit('update request', {playerId:playerId, gameId:gameId});
	} else {
		// TODO error ?popup need gameId? redirect?
		//socket.emit('update request');
	}

}

var socket = io();
