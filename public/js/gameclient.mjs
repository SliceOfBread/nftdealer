import {
	ACTIONLOC,
	ARTBONUSTYPE,
	ARTISTCOLOR,
	ARTLOC,
	ARTTYPE,
	ASSTLOC,
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

import {Art,
	Artist,
	Assistant,
	Board,
	Contract,
	Game,
	Player,
	PlayerBoard,
	RepTile,
	Visitor} from './common.mjs';

const CLIENTSIDE = true;

var waitingForServer = false;

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


class ArtClient extends Art {
	constructor(type, num) {
		super(type, num);
		this.posNum = 0;
	}

	updateArtInfo(posNum = -1, playerBoardDom, saleValue) {
		this.posNum = posNum;
		if (!this.dom) {
			this.dom = document.getElementById(`arttemplate`).cloneNode(true);
			this.dom.classList.remove('invis');
			this.dom.id = CLICKITEM.ART.concat("-", this.type, "-", this.num);
			for (let i of this.dom.getElementsByClassName("arttype")) {
				i.src = `res/${this.type}.png`;
			}
			this.valueDom = this.dom.getElementsByClassName('artvalue')[0];
			document.getElementById('allboardsdiv').appendChild(this.dom);
			// TODO change following for different tix bonuses
			// EASIEST make .png for each OR foreach tixBonus
			// tixBonus.length 1 (center center) or 2 (top center, bottom center) etc

			this.dom.getElementsByClassName('arttix')[0].classList.add(`arttix${this.num}`); //style.backgroundImage = `url(res/2tixbonus.png)`;
			// update display of reknown
			this.dom.getElementsByClassName("reknownx")[0].innerHTML = this.fameBonus.fixed;


			// this.dom = twoSidedDiv(CLICKITEM.ART + "-" + this.type + "-" + this.num, 
			// 	frontDiv, //fn + "front.png", 
			// 	backDiv, // fn + "back.png", 
			// 	this.type + "art");
			// document.getElementById("allboardsdiv").appendChild(this.dom);
			// this.dom.classList.add("artstuff");
			// this.valueDom = document.createElement("DIV");
			// this.valueDom.classList.add("artvalue");
			// this.dom.appendChild(this.valueDom);
		}
		
		this.dom.classList.remove('auction', `top${this.type}`);
		let offset = {top:0, left:0};
		switch (this.location.type) {
			case ARTLOC.PILETOP:
				this.dom.classList.add(`top${this.type}`);
			case ARTLOC.PILE:
				offset = boardOffset(document.getElementById(`space${this.type}`));
				// this.dom.style.left = "53vw";
				// this.dom.style.top = 0 + (7 * Object.values(ARTTYPE).indexOf(this.type)) + "vw";
				if (this.location.type == ARTLOC.PILE) {
					this.dom.classList.add('invis');
				} else {
					this.dom.classList.remove('invis');
					this.valueDom.classList.add('invis');
				}
				this.dom.classList.add('showback');

				break;
			case ARTLOC.DISPLAY:
				offset = boardOffset(playerBoardDom.getElementsByClassName("pbartspace")[this.posNum]);
				offset.top += .3;

				// this.dom.style.left = offset.left + 54 + 100 * this.posNum + "px";
				// this.dom.style.top = offset.top + 5 + "px";
				this.dom.classList.remove('invis', 'showback');
				this.valueDom.classList.remove('invis');
				this.valueDom.innerHTML = PROMPT.EN.DOLLAR.concat(saleValue);
				break;
				
			case ARTLOC.AUCTION:
				if (posNum != -1) {
					// auction is active
					offset.left = 15 + (6 * posNum);
					offset.top = 15;
					this.dom.classList.remove('invis', 'showback');
					this.dom.classList.add('auction');
					break;
				}
			case ARTLOC.TOPLAYER:
			case ARTLOC.SOLD:
			case ARTLOC.DISCARD:
				this.dom.classList.add('invis');
				break;
						
			default:
				break;
		}
		this.dom.style.left = offset.left + 'vw';
		this.dom.style.top = offset.top + 'vw';
	}
	
}


class AssistantClient extends Assistant {
	constructor(num) {
		super(num);
	}
	initDom(player, asstNum) {
		// create dom for each asst
		this.dom = document.createElement("IMG");
		this.dom.classList.add("movable");
		this.dom.classList.add("playerasst");
		this.dom.src = "res/asst_" + player.color + ".png";
		this.dom.id = CLICKITEM.ASSISTANT + "-" + player.num + "-" + asstNum;
		document.getElementById("allboardsdiv").appendChild(this.dom);

		this.playerBoardDom = document.getElementById("playerbrd" + player.num);
	}

	updateAsstInfo(game, deskNum) {
		let playerBoardOffset = boardOffset(this.playerBoardDom);
		let offset = {top:0, left:0};
		switch (this.location.type) {
			case ASSTLOC.DESK:
				// const desks = [	
				// 	{left:482, top:18},
				// 	{left:462, top:34},
				// 	{left:486, top:50},
				// 	{left:467, top:61}	];
					
				// this.dom.style.left = playerBoardOffset.left + desks[deskNum].left + "px";
				// this.dom.style.top = playerBoardOffset.top + desks[deskNum].top + "px";
				offset = boardOffset(this.playerBoardDom.getElementsByClassName("pbdesk")[deskNum]);
				break;
			case ASSTLOC.UNEMPLOYED:
				offset = boardOffset(this.playerBoardDom.getElementsByClassName("pbasstbox")[this.num - 2]);	
				offset.left += 1;
				// this.dom.style.left = playerBoardOffset.left + 8 + "px";
				// this.dom.style.top = playerBoardOffset.top - 18 + (this.num * 22.5) + "px";

				break;
			
			case ASSTLOC.INTLMARKET:
				{
					let col = this.location.col;
					let row = Object.values(ARTTYPE).indexOf(this.location.artType);
					offset = boardOffset(document.getElementsByClassName("markettilespace")[row * 3 + col]);
					// this.dom.style.left = 53 + (col * 48.5) + "px";
					// this.dom.style.top = 232 + (row * 41) + "px";
				}
				break;
			case ASSTLOC.AUCTION:
				{
					let col = this.location.col;
					let row = this.location.row;
					offset = boardOffset(document.getElementById(`${CLICKSPACE.AUCTION}-${row}-${col}`));
					// this.dom.style.left = 63 + (col * 48.5) + "px";
					// this.dom.style.top = 414 + (row * 41) + "px";
				}
				break;
			case ASSTLOC.DISCARD:
				this.dom.classList.add("invis");
				break;
			case ASSTLOC.CONTRACTBONUS:
			case ASSTLOC.SOLDBONUS:
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


class ArtistClient extends Artist {
	constructor() {
		super();
		this.dom = null;
		this.bonusDom = null;
		this.fameDom = null;
		this.sigDom = [];
	}
	updateArtistInfo(game) {
		if (!this.dom) {
			// let fn = "res/artist" + this.color + this.type + this.num;
			// this.dom = twoSided(CLICKITEM.ARTIST + "-" + this.color + "-" + this.type, 
			// 	fn + "front.png", 
			// 	fn + "back.png", 
			// 	this.color + " " + this.type);
			// this.dom.classList.add("artstuff");
			// this.dom.style.left = ((this.color == ARTISTCOLOR.RED) ? 935 : 825) + "px";
			// this.dom.style.top = 23 + (134 * Object.values(ARTTYPE).indexOf(this.type)) + "px";
			this.dom = document.getElementsByClassName(`artist${this.color} artist${this.type}`)[0];
			this.dom.id = CLICKITEM.ARTIST.concat( "-", this.color, "-", this.type);
			// invis all the unused levels
			let famedivs = this.dom.getElementsByClassName('artistfame');
			for (let f of famedivs) {
				for (let c of f.classList) {
					if (c.startsWith("fame")) {
						let val = Number(c.slice(4));
						if (val < this.initFame) {
							f.classList.add('hide');
							break;
						}
					}
				}
			}
			let iVal = this.getValue(this.initFame);
			for (let f=this.initFame; f < 15; f++) {
				let newVal = this.getValue(f);
				if (newVal != iVal) {
					this.dom.getElementsByClassName(`fame${f}`)[0].classList.add('artistvaluebump');
					iVal = newVal;
				} else {
					this.dom.getElementsByClassName(`fame${f}`)[0].classList.remove('artistvaluebump');
				}
			}

			// update promo level
			this.dom.getElementsByClassName("artistpromo")[0].innerHTML = `<p>${this.thumb}&nbsp;&nbsp;&UpperRightArrow;</p>`

			// this.bonusDom = document.createElement("IMG");
			// this.bonusDom.src = "res/artistBonus" + Object.values(ARTBONUSTYPE).indexOf(this.bonus) + ".png";
			// this.bonusDom.classList.add("movable");
			// this.bonusDom.style.left = "60px";
			// this.bonusDom.style.top = "45px";
			// <div class="artbonustile" style="background-image: url('../graphics/2tixbonus.png')"></div>
			this.bonusDom = document.createElement("DIV");
			this.bonusDom.classList.add("artbonustile");
			this.bonusDom.style.backgroundImage = `url('res/${this.bonus}.png')`;
			this.dom.appendChild(this.bonusDom);
			this.fameDom = document.createElement("DIV");
			this.fameDom.classList.add("moveable", "famemarker", "invis");
			this.dom.appendChild(this.fameDom);

			// add sig tokens
			for (let i in this.sigTokens) {
				// let tmpDom = document.createElement("IMG");
				// this.sigDom[i] = tmpDom;
				// tmpDom.src = "res/sig_" + this.color + this.type + ".png";
				// tmpDom.classList.add("movable", "sigtoken");
				// document.getElementById("allboardsdiv").appendChild(tmpDom);
				let tmpDom = document.createElement("DIV");
				this.sigDom[i] = tmpDom;
				tmpDom.classList.add("moveable","sigtoken",`artist${this.color}`);
				tmpDom.style.backgroundImage = `url('res/${this.type}.png')`;
				tmpDom.innerHTML = '~~';
				document.getElementById("allboardsdiv").appendChild(tmpDom);
				
			}
		}
		if (this.discovered) {
			this.dom.classList.remove("unknown");
			this.bonusDom.classList.add("invis");

			// update famemarker
			this.fameDom.classList.remove("invis");
			let currentFameDom = this.dom.getElementsByClassName(`fame${this.fame}`)[0];
			let top = currentFameDom.offsetTop + currentFameDom.parentNode.offsetTop; // Math.floor((this.fame - 1) / 6);
			let left = currentFameDom.offsetLeft; //((this.fame - 1) % 6);
			// if (top % 2 != 0) {
			// 	// fame move right to left
			// 	left = 5 - left;
			// }
			// top = (5 - top) * 5/6;
			// left = left * 5 / 6
			this.fameDom.style.left = left - 2 + "px"; // leave these as px as they are computed above
			this.fameDom.style.top = top - 2 + "px"; // leave these as px as they are computed above
		} else {
			// for UNDO
			this.dom.classList.add("unknown");
			this.bonusDom.classList.remove("invis");
			this.fameDom.classList.add("invis");
		}
		
		// update sigTokens
		for (let i in this.sigTokens) {
			let s = this.sigTokens[i];
			let sDom = this.sigDom[i];
			let offset = {top:0, left:0};

			if (s.location == SIGLOC.ARTIST) {
				offset = boardOffset(this.dom);
				offset.top +=  5.1;
				offset.left += Number(i) * 1.1;
				// let top = 129 + (134 * Object.values(ARTTYPE).indexOf(this.type));
				// let left = (i * 20) + ((this.color == ARTISTCOLOR.RED) ? 945 : 835);

			} else {
				if (s.location == SIGLOC.ART) {
					// if use art for offset it causes a problem with UNDO
					let artIdx = s.artNum;
					let art = game.art[artIdx];
					let playerBoardDom = game.players[art.location.plNum].boardDom;
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbartspace")[art.posNum]);
					offset.top += 3.9;
					offset.left += 2.5;
					// let playerBoardOffset = boardOffset(game.players[art.location.plNum].boardDom);
					// sDom.style.left = playerBoardOffset.left + 114 + 100 * posNum + "px";
					// sDom.style.top = playerBoardOffset.top + 88 + "px";
	
				} else {
					// SIGLOC.COMMISSION
					let playerBoardDom = game.players[s.plNum].boardDom;
					offset = boardOffset(playerBoardDom.getElementsByClassName("pbcomm")[0]);
					// let playerBoardOffset = boardOffset(game.players[s.plNum].boardDom);
					// sDom.style.left = playerBoardOffset.left + 454 + "px";
					// sDom.style.top = playerBoardOffset.top + 88 + "px";

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
		// 	// create clickable influence locations
		// 	let theseLocs = document.getElementsByClassName("influenceloc");
		// 	for (let i=0; i < theseLocs.length; i++) {
		// 		let col = theseLocs[i].id.split("-")[1];
		// 		theseLocs[i].style.left = 13 + (col * 31.7) + "px";
		// 	}
		// }
	

    }
	

}

class ContractClient extends Contract {
	constructor(ARTTYPE, BONUSTYPE, num) {
		super(ARTTYPE, BONUSTYPE, num);
		this.dom = null;
	}
	updateContractInfo(game) {
		//this.dom = document.getElementById(CLICKITEM.CONTRACT + "-" + this.num);
		if (!this.dom) {
			// create dom object
			// let t = this.artType;
			// let bt = this.bonusType.slice(0,4);
			this.dom = document.getElementById(`contracttemplate`).cloneNode(true);
			this.dom.id = CLICKITEM.CONTRACT.concat('-', this.num);
			this.dom.classList.remove('invis');
			this.dom.getElementsByClassName('contracttype')[0].src = `res/${this.artType}.png`;
			this.dom.getElementsByClassName('contractfrontbonus')[0].src = `res/${this.bonusType}.png`;
			// this.dom = twoSided(CLICKITEM.CONTRACT + "-" + this.num,
			// 	"res/contracttop" + t + ".png",
			// 	"res/contractBack.jpg",
			// 	"contract");

			// this.dom.classList.add("contract");
			document.getElementById("allboardsdiv").appendChild(this.dom);

			// let imgBottom = document.createElement("IMG");
			// imgBottom.src = "res/contractbottom" + bt + ".png";
			// imgBottom.style.position = "absolute";
			// imgBottom.style.left = "0px";
			// imgBottom.style.top = "60px";

			// let frontDiv = this.dom.children[0].children[0];
			// frontDiv.appendChild(imgBottom);

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
				if (game.options.numContractPiles == 4) {
					offset = boardOffset(document.getElementsByClassName('contractspace')[this.location.num + 1]);
					// offset.left = 102 + (this.location.num) * 80 + "px";
					this.dom.style.zIndex = 2 + (this.location.num) * 5 + (4 - this.location.pos);
				} else {
					offset = boardOffset(document.getElementsByClassName('contractspace')[this.location.num]);
					// offset.left = 5 + (this.location.num) * 50 + "px";
					this.dom.style.zIndex = 2 + (this.location.num);
				}
				
				break;
			case CONTRACTLOC.PLAYER:
				// this.removeContractClasses();
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
	removeContractClasses() {
		this.dom.classList.remove("showback");
		for (let i=this.dom.classList.length-1; i >= 0; i--) {
			let tmpClass = this.dom.classList[i];
			if (tmpClass.length > 8 && tmpClass.slice(0,8) == "contract") {
				this.dom.classList.remove(tmpClass);
			}
		}
	}
}
	
class PlayerClient extends Player {
	constructor() {
		super();
		this.score = 0;
		this.board = new PlayerBoardClient(this);
		for (let i=0; i < 10; i++) {
				this.assistants.push(new AssistantClient(i));
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
			this.playerpiece.id = "playerpiece".concat(this.color);
			this.playerpiece.src = "res/player_".concat(this.color,".png");
			this.playerpiece.classList.add('playerpiece', 'movable');
			boardDom.appendChild(this.playerpiece);

			// this.playerpiece = document.getElementById("playerpiece" + this.color);
			// this.playerpiece.style.visibility = "visible";

			this.playerdisc = document.createElement("IMG");
			this.playerdisc.id = "playerdisc".concat(this.color);
			this.playerdisc.src = "res/disc_".concat(this.color,".png");
			this.playerdisc.classList.add('playerdisc', 'movable');
			boardDom.appendChild(this.playerdisc);
			// this.playerdisc = document.getElementById("playerdisc" + this.color);
			// this.playerdisc.style.visibility = "visible";
			this.playerdisc.style.top = "33.1vw";
			switch (this.color) {
				case PLAYERCOLOR.PURPLE:
					this.discAdj = .5;				
					break;
				case PLAYERCOLOR.ORANGE:
					this.discAdj = .5;
				case PLAYERCOLOR.BLUE:
					this.playerdisc.style.top = "34.4vw";
					break;
			
				default:
					// this.playerdisc.style.zIndex = 14;
					break;
			}
			this.boardDom = document.getElementById("playerbrd" + plNum);
			// this.boardDom.style.display = "block";
			// this.boardDom.style.backgroundColor = this.color;
			this.boardDom.classList.add("player" + this.color);
			this.infoDom = document.getElementById("playerinfo" + plNum);
			this.infoDom.style.display = "grid";
			for (let a of this.assistants) {
				a.initDom(this, a.num);
			}
		}

		if (game.state === GAMESTATE.FINALSCORE) {
			// TODO ???
		}
	
		PlayerClient.updatePlayerPiece(this.playerpiece, this.location, this.color);

		// update assistants
		
		let	assts = this.assistants.filter((asst) => asst.location.type == ASSTLOC.DESK);
		assts.forEach((asst, idx) => asst.updateAsstInfo(game, idx));
		
		assts = this.assistants.filter((asst) => asst.location.type != ASSTLOC.DESK);
		assts.forEach((asst) => asst.updateAsstInfo(game));

		// update infl marker
		this.playerdisc.style.left =  .1 + (this.influence * 1.65) + this.discAdj + "vw";
		

		for (let e of this.infoDom.children) {
			let classes = e.classList;
			if (!classes.length) continue;
			if (classes[0] == "icon") continue;
			switch (classes[0]) {
				case "playername":
					e.innerText = this.name;
					e.classList.add("color".concat(this.color));
					// e.style.color = this.color;
					// if (this.color == "orange") {
					// 	e.style.color = "#b32d00";
					// }
					break;
				case "playertime":
					e.innerText = "-:--";
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
						let auctionAssts = this.assistants.filter((asst) => asst.location.type == ASSTLOC.AUCTION);
						for (let asst of auctionAssts) {
							bid += bids[asst.location.row][asst.location.col];
						}
						e.innerText = "$" + bid;
					}
					break;
				case "soldabstract":
					e.innerText = game.playerHasSold(plNum).filter((art) => art.type == ARTTYPE.ABSTRACT).length; 
					break;
				case "soldpaint":
					e.innerText = game.playerHasSold(plNum).filter((art) => art.type == ARTTYPE.PAINT).length;
					break;
				case "soldsketch":
					e.innerText = game.playerHasSold(plNum).filter((art) => art.type == ARTTYPE.SKETCH).length;
					break;
				case "soldphoto":
					e.innerText = game.playerHasSold(plNum).filter((art) => art.type == ARTTYPE.PHOTO).length;
					break;
			
				default:
					break;
			}
		}
		document.getElementById("limit".concat(this.color)).innerHTML = game.playerHasSold(plNum).length + 1;
	}
	static updatePlayerPiece(pieceDom, location, color = null) {
		let offset = {top:0, left:0};
		let top = 0;
		let left = 0;
		switch (location.type) {
			case PLAYERLOC.HOME:
				offset = boardOffset(document.getElementsByClassName('gallery player'.concat(color))[0]);
				// if (color == PLAYERCOLOR.YELLOW || color == PLAYERCOLOR.PURPLE) {
				// 	top = 151;
				// } else {
				// 	top = 466;
				// }				
				// if (color == PLAYERCOLOR.YELLOW || color == PLAYERCOLOR.BLUE) {
				// 	left = 243;
				// } else {
				// 	left = 710;
				// }
				
				break;
			case PLAYERLOC.ACTION:
				offset = boardOffset(document.getElementById(CLICKSPACE.ACTION.concat('-',location.loc)).getElementsByClassName("mainaction")[0]);
				offset.top += .4;
				offset.left += .4;
				// switch (location.loc) {
				// 	case ACTIONLOC.SALES:
				// 		left = 442;
				// 		top = 77;
				// 		break;
				// 	case ACTIONLOC.MARKET:
				// 		left = 219;
				// 		top = 297;
				// 		break;
				// 	case ACTIONLOC.ART:
				// 		left = 728;
				// 		top = 297;
				// 		break;
				// 	case ACTIONLOC.MEDIA:
				// 		left = 442;
				// 		top = 562;
				// 		break;
				
				// 	default:
				// 		break;
				// }
				break;
			case PLAYERLOC.KO:
				offset = boardOffset(document.getElementById(CLICKSPACE.ACTION.concat('-',location.loc)).getElementsByClassName("sideaction")[0]);
				offset.top += .3;
				offset.left += .3;
				// switch (location.loc) {
				// 	case ACTIONLOC.SALES:
				// 		left = 508;
				// 		top = 77;
				// 		break;
				// 	case ACTIONLOC.MARKET:
				// 		left = 219;
				// 		top = 363;
				// 		break;
				// 	case ACTIONLOC.ART:
				// 		left = 728;
				// 		top = 363;
				// 		break;
				// 	case ACTIONLOC.MEDIA:
				// 		left = 508;
				// 		top = 562;
				// 		break;
				
				// 	default:
				// 		break;
				// }
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
		// {
		// 	// adjust clickable reptile locations
		// 	let theseLocs = document.getElementsByClassName("reptileloc");
		// 	for (let i=0; i < theseLocs.length; i++) {
		// 		let spaceNum = Number(theseLocs[i].id.split('-')[1]);
		// 		let row = Math.floor(spaceNum / 3);
		// 		let col = spaceNum % 3;
		// 		theseLocs[i].style.left = 59 + (col * 42) + "px";
		// 		theseLocs[i].style.top = 108 + (row * 66) + "px";
		// 	}
		// }
		// {
		// 	// adjust clickable contract locations
		// 	let theseLocs = document.getElementsByClassName("plcontractloc");
		// 	for (let i=0; i < theseLocs.length; i++) {
		// 		let spaceNum = Number(theseLocs[i].id.split('-')[1]);
		// 		theseLocs[i].style.left = 190 + (spaceNum * 88) + "px";
		// 		theseLocs[i].style.top = "110px";
		// 	}
		// }

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
				let idx = Object.keys(MARKETCOL).indexOf(this.location.col) + (3 * Object.values(ARTTYPE).indexOf(this.location.artType));
				thisOffset = boardOffset(document.getElementsByClassName("markettilespace")[idx]);
				break;
			case REPTILELOC.DISPLAY:
				// this.dom.style.left = 280 + thisOffset.left + "px";
				// this.dom.style.top = 38 + thisOffset.top + "px";
				thisOffset = boardOffset(document.getElementById("playerbrd" + this.location.plNum).getElementsByClassName("pbartspace")[2]);
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
		let offsetColor = null;
		this.dom.classList.remove("invis");
		switch (this.location.type) {
			case VISITORLOC.ART:
				// offset = boardOffset(document.getElementById(CLICKITEM.ART.concat('-', this.location.artType, '-', this.location.artNum) ));
				offset = boardOffset(document.getElementById(`space${this.location.artType}`));
				// offset.left += posNum * 1.5;
				offset.top += posNum;
				// this.dom.style.left = 1045 + 10 + (posNum * 30) + "px";
				// this.dom.style.top = 23 + (134 * Object.values(ARTTYPE).indexOf(this.location.artType)) + 53 + "px";
				break;
			case VISITORLOC.ARTIST:
				offset = boardOffset(document.getElementById(CLICKITEM.ARTIST.concat('-', ARTISTCOLOR.RED, '-', this.location.artType) ));
				// this.dom.style.left = offset.left + 35 + "px";
				// this.dom.style.top = offset.top + 53 + "px";
				break;
			case VISITORLOC.PLAZA:
				offset = boardOffset(document.getElementsByClassName("plaza")[0]);
				offset.left += (posNum % 7) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 7) * 1.2 + 1;
				// this.dom.style.left = offset.left + 440 + ((posNum % 5) * 25) + "px";
				// this.dom.style.top = offset.top + 320 + (Math.floor(posNum/5) * 25) + "px";
				break;
			case VISITORLOC.LOBBY:
				offset = boardOffset(document.getElementsByClassName(`lobby player${this.location.playerColor}`)[0]);
				offset.left += (posNum % 7) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 7) * 1.2 + 0.1;
				// offsetColor =  this.location.playerColor; // player color
				// if (offsetColor == PLAYERCOLOR.YELLOW || offsetColor == PLAYERCOLOR.BLUE) {
				// 	offset.left -= 80;
				// } else {
				// 	offset.left += 130;
				// }
				// if (offsetColor == PLAYERCOLOR.YELLOW || offsetColor == PLAYERCOLOR.PURPLE) {
				// 	offset.top -= 90;
				// } else {
				// 	offset.top += 110;
				// }
				// this.dom.style.left = offset.left + 440 + ((posNum % 3) * 25) + "px";
				// this.dom.style.top = offset.top + 320 + (Math.floor(posNum/3) * 20) + "px";
				break;
			case VISITORLOC.GALLERY:
				offset = boardOffset(document.getElementsByClassName(`gallery player${this.location.playerColor}`)[0]);
				offset.left += (posNum % 7) * 1.2 + 0.5;
				offset.top += Math.floor(posNum / 7) * 1.2 + 2;
				// offset = boardOffset(document.getElementById("boarddiv"));
				// offsetColor =  this.location.playerColor; // player color
				// if (offsetColor == PLAYERCOLOR.YELLOW || offsetColor == PLAYERCOLOR.BLUE) {
				// 	offset.left -= 140;
				// } else {
				// 	offset.left += 190;
				// }
				// if (offsetColor == PLAYERCOLOR.YELLOW || offsetColor == PLAYERCOLOR.PURPLE) {
				// 	offset.top -= 160;
				// } else {
				// 	offset.top += 155;
				// }
				// this.dom.style.left = offset.left + 440 + ((posNum % 3) * 25) + "px";
				// this.dom.style.top = offset.top + 320 + (Math.floor(posNum/3) * 20) + "px";
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
				// this.dom.style.top = offset.top + 40 + "px";
				// this.dom.style.left = offset.left + 630 + "px";
				// break;
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
			let a = new ArtistClient();
			this.artists.push(a);
		}
		for (let t of Object.values(ARTTYPE)) {
			for (let i=0; i < 8; i++) {
				this.art.push(new ArtClient(t, i));
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
		for (let t of Object.values(ARTTYPE)) {
			for (let b of Object.values(CONTRACTBONUS)) {
				if (b == CONTRACTBONUS.INFLUENCE && (t == ARTTYPE.PAINT || t == ARTTYPE.PHOTO)) continue;
				if (b == CONTRACTBONUS.MONEY && (t == ARTTYPE.SKETCH || t == ARTTYPE.ABSTRACT)) continue;
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
	// clickButton(id) {
	// 	switch (id) {
	// 		case 'redobutton':
	// 			// cancel turn and redo
	// 			socket.emit('redo turn', {playerId:playerId});
	// 			game.waitForServer();
	// 			break;
	// 		case 'endbutton':
	// 			// confirm turn to server
	// 			socket.emit('end turn', {playerId:playerId});
	// 			game.waitForServer();
	// 			break;
	// 		case 'pinkupbutton':
	// 		case 'brownupbutton':
	// 			game.sendMove({
	// 				playerId:playerId,
	// 				moveNum:game.moveNum,
	// 				move:{
	// 					plNum: game.activePlayer,
	// 					location:CLICKITEM.ORIENTATION + '-' + (id.charAt(0) == 'p') ? VISITORCOLOR.PINK : VISITORCOLOR.BROWN
	// 				}
	// 			});
	// 			break;
	// 		default:
	// 			break;
	// 	}
	// }
	
	
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
			// is partially hidden (ex: artist partially hidden) by bonus tile)
			// (TODO check if bonus tile parent is artist!)
			// (another example might be all the elements that make up a flippable card)
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
		if (waitingForServer) game.actionMsg(PROMPT.EN.WAITING);
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
		

		let celebPrevDom = document.getElementById("numcelebrity").previousElementSibling;
		document.getElementById("numcelebrity").innerText = this.numCelebrity(); 
		if (this.getFlag(FLAG.TWO_CELEBRITY)) {
			celebPrevDom.classList.add('completed');
		} else {
			celebPrevDom.classList.remove('completed');
		}

		// update art not on player boards
		let auctionCount = 0;
		for (let i in this.art) {
			if (this.art[i].location.type != ARTLOC.DISPLAY) {
				if (this.state == GAMESTATE.FINALAUCTION && this.art[i].location.type == ARTLOC.AUCTION) {
					this.art[i].updateArtInfo(auctionCount);
					auctionCount++;
				} else {
					this.art[i].updateArtInfo();
				}
			}
		}
		for (let pl=0; pl < this.numPlayers; pl++) {
			let artDisplay = this.playerHasDisplayed(pl);
			if (artDisplay.length > 1) {
				artDisplay.sort((a,b) => this.artists[a.byArtist].fame - this.artists[b.byArtist].fame);
			}
			for (let i=0; i < artDisplay.length; i++) {
				artDisplay[i].updateArtInfo(i, this.players[pl].boardDom, this.artists[artDisplay[i].byArtist].getValue());
			}
		}

		// update artists
		for (let a of this.artists) {
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
					thumbDom.classList.add("movable", "artistpromo", "thumb");
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
					// on artist
					let offset = boardOffset(document.getElementById(CLICKITEM.ARTIST.concat('-', this.thumbs[n][i].color, '-', this.thumbs[n][i].artType)).getElementsByClassName("artistpromo")[0]);
					thumbDom.style.top = offset.top + "vw";
					thumbDom.style.left = offset.left + "vw";
				}
					
			}
		}

	
		// update reptiles
		this.repTiles.forEach((r, idx) => r.updateRepTileInfo(idx));

		// update art Pile #'s
		for (let t of Object.values(ARTTYPE)) {
			document.getElementById("remain" + t).innerText = this.art.filter((a) => (a.type == t) && (a.location.type == ARTLOC.PILE || a.location.type == ARTLOC.PILETOP)).length;
		}		
		
		// update visitors
		for (let locType of Object.values(VISITORLOC)) {
			let vHere;
			switch (locType) {
				case VISITORLOC.ART:
					for (let artType of Object.values(ARTTYPE)) {
						vHere = this.visitors.filter((v) => v.location.type == locType && v.location.artType == artType);
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
		if (msg.soldcard) {
			for (let i=0; i < msg.soldcard.length; i++) {	// normally 0-2
				let ii = 0;
				for (let j in msg.soldcard[i]) {	// j will be the types of art needed
					let numOfType = this.art.filter((a) => a.location.type === ARTLOC.SOLD && a.location.plNum === this.iAmPlNum && a.type === j).length;
					for (let k=0; k < msg.soldcard[i][j]; k++) {	// k will be how many of type j needed
						document.getElementById(`sold-${i}-${ii}`).src = `res/${j}.png`;
						if (k >= numOfType) {
							// TODO mark this req as not yet met
						} else {
							// mark this req as met
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
					for (let k=0; k < msg.hungcard[i][j]; k++) {
						document.getElementById(`hung-${i}-${ii}`).src = `res/${j}.png`;
						ii++;
					}
				}
			}
		}

		// update auction works and values
		let auctionTypes = [];
		for (let a of this.art.filter((a) => a.location.type == ARTLOC.AUCTION)) {
			auctionTypes.push(a.type);
		}
		for (let t of Object.values(ARTTYPE)) {
			let valDom = document.getElementById("auction" + t);
			if (auctionTypes.includes(t)) {
				// this type is in the auction
				valDom.innerText = msg.auction[t];
			} else {
				valDom.previousElementSibling.style.display = "none";
				valDom.style.display = "none";
			}
		}

		// update log
		let logLines = document.getElementsByClassName("logline");
		while (logLines.length > this.log.length) {
			// note: logLines is magical, as [0] is deleted things shift automatically
			// this is for UNDO
			logLines[0].remove();
		}
		let logDom = document.getElementById("loglist");
		for (let i=logLines.length; i < this.log.length; i++) {
			let line = document.createElement("LI");
			line.innerHTML = this.decodeMsg(this.log[i]);
			line.classList.add("logline");
			if (i % 2) line.classList.add("logodd");
			logDom.insertBefore(line, logDom.children[0]);
		}

		// update clickable spaces
		this.clearClickables();
		// this.removeDomClass("clickable");
		if (this.state == GAMESTATE.FINALSCORE) {
			let txt = PROMPT.EN.FINALSCORE;
			let place = 0;
			for (let i = 0; i < this.results.length; i++) {
				if (i) {
					if (this.results[i].score != this.results[i-1].score) place = i;
				}
				txt += `<br>${PROMPT.EN.PLACE[place]}-${this.decodeMsg("PLNAME".concat(':',this.results[i].player))}-${this.results[i].money}`;
			}
			this.actionMsg(txt);
		} else if (this.activePlayer == this.iAmPlNum) {
			if (msg) {
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
					let txt = PROMPT.EN.CHOOSE;
					for (let m of msg.msgs) {
						if (m.startsWith('#')) {
							let mParts =  m.split("#");
							let mId = mParts[1];
							let buttDom = document.getElementById(mId);
							buttDom.classList.remove("invis");
							buttDom.innerHTML = this.decodeMsg(mParts[2]);
							if (mId == CLICKITEM.HIREASST + "-1") document.getElementById("hirediv").classList.remove("invis");
						// } else if (m.startsWith(CLICKITEM.HIREASST)) {
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
			this.actionMsg(this.players[this.activePlayer].name + PROMPT.EN.TAKINGTURN);
		}

		if (this.players[msg.playerNum].name.startsWith("Robot") && this.state != GAMESTATE.FINALSCORE) {
			if (msg.playerNum == this.activePlayer) {
				// this is a robot player
				// randomly choose an action and send it
				let action;
				do {
					action = msg.clickables[Math.floor(Math.random() * msg.clickables.length)];
				} while (action == CLICKITEM.REDOBUTTON);
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
					alert(PROMPT.EN.MIDALERT);
				}
			}
			if (this.getFlag(FLAG.END_TRIGGERED) && !this.getFlag(FLAG.FINAL_ROUND) && !(this.localFlags & FLAG.END_TRIGGERED) ) {
				// server set endtrigger and locally not yet set, maybe need alert, maybe user reloaded browser
				this.localFlags |= FLAG.END_TRIGGERED;
				alert(PROMPT.EN.ENDALERT);
			}
			if (this.getFlag(FLAG.FINAL_ROUND) && !(this.localFlags & FLAG.FINAL_ROUND) ) {
				// server set endtrigger and locally not yet set, maybe need alert, maybe user reloaded browser
				this.localFlags |= FLAG.FINAL_ROUND;
				alert(PROMPT.EN.FINALROUND);
			}	
		}

	}

	decodeMsg(msg) {
		let parts = msg.split(':');
		// parts[0] is PROMPT object key
		let ret = PROMPT["EN"][parts[0]];
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
					// replace with artType
						ret = ret.replace(sub, PROMPT["EN"].ARTTYPE[val]);
						break;

					case '2':
					// replace with artist
						let artist = this.artists[Number(val)];
						ret = ret.replace(sub, `${PROMPT["EN"][artist.color]} ${PROMPT["EN"].ART2ARTIST[artist.type]}`);
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

		// move dom nodes so this player is shown first
		// let pbd = document.getElementById("playerbrddiv");
		// let pbi = document.getElementById("allplayerinfo");
		for(let pd = 0; pd < 4; pd++) {
			let dom = document.getElementById("playerbrdx" + pd);
			dom.id = "playerbrd" + ((plNum + pd) % 4);
			// pbd.insertBefore(dom, pbd.childNodes[0]);
			let idom = document.getElementById("playerinfox" + pd);
			idom.id = "playerinfo" + ((plNum + pd) % 4);
			// pbi.insertBefore(idom, pbi.childNodes[0]);
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
		
		//game.setActiveSpaces(msgObj);
		
	});

	socket.on('server error', () => {
		alert('Server error');
	});

}

var playerId = null;
var gameId = null;

window.onload = function() {
	main();
	getServerUpdate();
	
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

// credits
// paint icon
// https://thenounproject.com/nicklas.bruckner
// abstract
// https://thenounproject.com/everydaytemplate
// camera
// https://thenounproject.com/denimao
// sculture
// // https://thenounproject.com/vigorn