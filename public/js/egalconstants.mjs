// FILE constants

const DEBUG = false;

const ACTIONLOC = {
    SALES: "sales",	//"",
    NFT: "nft",		//"",
    MEDIA: "media",	//"",
    MARKET: "market" //""
};

const KOLOC = {
    KOSALES:  "ko_sales",
    KOART:    "ko_nft",
    KOMEDIA:  "ko_media",
    KOMARKET: "ko_market"
};

const PLAYERLOC = {
	HOME:"home",
	ACTION:"sp_action",
	KO:"ko"
};

const HELPERLOC = {
	INTLMARKET:"intlMarket",
	AUCTION: "auction",
	CONTRACTBONUS: "contractbonus",
	SOLDBONUS:"soldbonus",
	DESK:"desks",
	DISCARD:"discard",
	UNEMPLOYED:"unemployed",
	ACTION:"sp_action",
	KO:"ko"
};

const AVAILHELPERLOCS = {
	DESK:"desks",
	ACTION:"sp_action",
	KO:"ko"
};

const NFTISTCOLOR = {
	BLUE:"blue",
	RED:"red"
}

const NFTLOC = {
	PILE: "pile",
	PILETOP: "piletop",
	AUCTION: "auction",
	TOPLAYER: "toplayer",	// at game end, auction -> toplayer -> sold/wallet
	WALLET: "wallet",
	SOLD: "sold",
	DISCARD: "discard"
}

const NFTTYPE = {
	ABSTRACT:"abstract",
	GALAXY:"galaxy",
	DEJACAT:"dejacat",
	PHAKELAND:"phakeland"
}

const AUCTIONVAL = {
	ONE:1,
	THREE:3,
	SIX:6
}

const NFTBONUSTYPE = {
	CRED: "incrCred",
	MONEY: "incrMoney",
	TWOTIX: "2tixbonus",
	PLAZAVISITOR: "visitor_any",
	REKNOWN: "incrReknown"
}

const BONUSTYPE = Object.assign(
	{
		CONTRACT: "contract",
		HELPER: "helper",
		PLAZAPINKBROWN: "plaza pink or brown",
		BAG: "visitor from bag"
	},
	NFTBONUSTYPE,
	{
		ONETIX: "any ticket",
		PINKTIX: "pink ticket",
		BROWNTIX: "brown ticket",
		PINKWHITE: "pink or white ticket",
		BROWNWHITE: "brown or white ticket"
	}
);

const CLICKITEM = {
	NFT:"i_nft",
	NFTIST:"i_nftist",
	HELPER:"i_helper",
	CONTRACT:"i_contract",
	ORIENTATION:"b_orient",
	REPTILE:"i_reptile",
	THUMB:"i_thumb",
	TIX:"i_tix",
	VISITOR:"i_visitor",
	EABONUS:"b_eabonus",
	EATIX:"b_eatix",
	CONTINUE:"b_continue",
	DONOTHING:"b_nothing",
	ENDBUTTON:"b_end",
	REDOBUTTON:"b_redo",
	HIREHELPER:"b_hire"
}

const CLICKSPACE = {
	ACTION:"sp_action",
	AUCTION:"sp_auction",
	CONTRACT:"sp_contract",
	DEALCONTRACTS:"sp_deal",
	CRED:"sp_cred",
	REPTILE:"sp_reptile"
}

const CONTRACTBONUS = {
	CONTRACT: "contract",
	HELPER: "helper",
	PLAZAPINKBROWN: "visitor_brownpink",
	BAG: "fromBag",
	CRED: "incrCred",
	MONEY: "incrMoney"
}

const CONTRACTLOC = {
	DECK:"deck",
	DEALT:"dealt",
	PLAYER:"player",
	DISCARD:"discard"
}

const FLAG = {
	DID_EA:0x1,
	DID_ACTION:0x2,
	DID_KO:0x4,
	DEALT_CONTRACTS:0x8,
	NFT_BOUGHT:0x10,
	UPDATE_CONTRACTS:0x20,
	MID_TRIGGERED:0x40,
	MID_DONE:0x80,
	END_TRIGGERED:0x100,
	FINAL_ROUND:0x200,
	TIX_EMPTY:0x400,
	BAG_EMPTY:0x800,
	TWO_MAGNATE:0x1000,
	NOTHING_TURN:0x2000
}

const GAMESTATE = { 
	START: 0, 
	PICKACTION: 1, 
	EAONLY: 4, 
	ENDTURN: 7,
	LEAVEHELPER:8,
	EAOREND:9,
	KOSALES:24,
	KOART:25,
	KOMEDIA:26,
	KOMARKET:27,
	KOEATIX:28,
	KOEABONUS:29,
	FINALAUCTION:30,
	FINALSCORE:31,
	KO_GETCONTRACT:32,
	
	// sales states
	SALES_MAIN:128,
	SALES_DEALT:129,	// dealt 4 new contracts
	SALES_GETCONTRACT:130,	// picked contract to get
	SALES_SELLART:131,	// selected nft to sell
	SALES_VISITOR: 132,
	SALES_BONUSUP:133,
	SALES_GETTIX: 134,
	// NFT states
	NFT_MAIN:160,
	NFT_BTIX: 161,
	NFT_BVISITOR: 162,
	NFT_BREKNOWN: 163,
	NFT_BUY:164,	// picked nft to buy (use cred for $?)
	NFT_BUYREKNOWN:165,
	NFT_DISC:166,	// picked nftist to discover
	// MEDIA
	MEDIA_MAIN:192,
	MEDIA_HELPERS:193,
	// MARKET
	MARKET_MAIN:224,
	MARKET_HELPER:225,
	AUCTION_BONUS:226,
	// EATIX
	EATIX_MAIN:288,
	// eabonus states
	EABONUS_MAIN:256,
	EABONUS_HELPER:257,
	EABONUS_CONTRACT:258,
	// EADONE:263,
	// General bonuses
	VISITOR2GALLERY:512,
	TIXCHOICE:513,
	INCRREKNOWN:514,
	DECRPRICE:515,
	PLACEREPTILE:516,
	TWOCHOICE:517,
	REKNOWNARTIST:518,
	VISITOR2PLAZA:519,
	THUMBARTIST:520
}

const LOC2STATE = {
	"sales" :GAMESTATE.SALES_MAIN,
    "nft" :GAMESTATE.NFT_MAIN,
    "media" :GAMESTATE.MEDIA_MAIN,
    "market" :GAMESTATE.MARKET_MAIN
}

const PLAYERCOLOR = {
	YELLOW:"yellow",
	PURPLE:"purple",
	ORANGE:"orange",
	BLUE:"blue"
}

const REPTILELOC = {
	INTLMARKET:"intlMarket",
	PLAYER:"player",
	DISPLAY:"display",
	STARTTILE:"startTile",
	DISCARD:"discard"
}

const SIGLOC = {
	NFTIST: "nftist",
	COMMISSION: "comm",
	NFT: "nft"
}

const MARKETCOL = {
	ADD3COL:"ADD3COL",
	ADD2COL:"ADD2COL",
	ADD1COL:"ADD1COL"
}

const MARKETCOL2CRED = {
	ADD3COL:3,
	ADD2COL:2,
	ADD1COL:1
}

const MAXREPTILES = 16;
const MAXCRED = 35;

const MEDIALOC = {
	THUMB:"thumb",
	HELPER:"helper"
}

const VISITORCOLOR = {
	BROWN:"brown",
	PINK:"pink",
	WHITE:"white"
};

const TIXCOLOR = VISITORCOLOR;

const TIXLOC = {
	PLAYER0: 'player0',
	PLAYER1: 'player1',
	PLAYER2: 'player2',
	PLAYER3: 'player3',
	DISCARD: 'discard',
	BOARD: 'board'
}

const VISITORLOC = {
	PLAZA:"plaza",
	NFT:"nft",
	BAG:"bag",
	LOBBY:"lobby",
	GALLERY:"gallery",
	NFTIST:"nftist",
	DISCARD:"discard"
}

const PROMPT = {
	EN: {
		DOLLAR:"&dollar;",
		CHOOSE:"Choose:",
		TAKINGTURN:" is playing",
		WAITING:"Waiting for server",
		ACTION:"an action location",
		EACTION: "an Exec Action",
		EAORNONE: "an Exec Action (or nothing)",
		HELPERLEAVE:"a helper to leave behind",
		CONTART:"Continue to update NFTs",
		CONTCONTRACTS:"Continue to update Contracts",
		CONT2PAY:"CONTINUE to pay &dollar;$1", 
		CONT2NOREKNOWN:"DONE increasing reknown",
		CONTINUE:"Continue",
		DONOTHING:"Do nothing",
		SKIPKO:"Don't do KO",
		DONE:"Done",
		DONTHELPER:"Don't leave a helper behind",
		DEALMORE:"deal new contracts",
		GETCONTRACT:"contract to get",
		CONTRACTBONUS:"a contract bonus",
		SELLART:"nft to sell",
		PLACECONTRACT:"space to place contract",
		GETTIX:"ticket to get",
		GETFIRSTTIX:"first of two tickets",
		USECONTRACT:"contract to use for sale",
		LEAVINGVISITOR:"visitor to leave",
		GALVISITOR:"a visitor to move to your gallery",
		TIXVISITOR:"a visitor to move toward your gallery",
		BONUSUP:"bonus you want available",
		BUYARTIST:"nftist to buy from",
		DISCARTIST:"nftist to discover",
		PROMOARTIST:"an nftist to promote",
		PROMOLEVEL:"promotion level",
		REKNOWNARTIST:"an nftist to increase their reknown",
		HELPER:"a helper",
		AUCTIONSPACE:"an auction space",
		TILE2GET:"a reputation tile",
		TILEBONUS:"a location/bonus for tile",
		TILEDISC:"tile will be discarded",
		TURNEND:"END turn",
		TURNREDO:"REDO turn",
		// note: for replacements $n1 means replace nth $ with nftType[val]
		// also: for replacements $n2 means replace nth $ with nftist[val]
		CRED4COST:"use cred to reduce cost to &dollar;$1",
		CRED4REKNOWN:"use cred to increase $12 reknown by 1",
		REDUCCRED:"$14 (reduce cred to $2)",
		HIREKOMSG:"Hire (reduce cred to $1)",
		STARTLOC:"a starting location/tile",
		WORKWORTH:"$11 worth &dollar;$2",
		FINALAUCTION:"Auction participants to choose works",
		HIRE:"hire $1 for &dollar;$2",
		blue:"blue",
		red:"red",
		pink:"pink",
		brown:"brown",
		white:"white",
		sales:"contracts/sales",
		nft:"NFTs/NFTists",
		media:"promotion/hire",
		market:"market/auction",
		NFT2NFTIST: {
			"abstract":"abstract NFTist",
			"phakeland":"Phakeland Agent",
			"dejacat":"Bored Cat Club",
			"galaxy":"galaxy seller"
		},
		NFTTYPE: {
			"abstract":"abstract NFT",
			"galaxy":"galaxy",
			"dejacat":"deja cat",
			"phakeland":"phakeland"
		},
		// LOG stuff
		SHUFFLE:"Contract deck shuffled",
		CELEB:"$13 makes $22 a magnate and gains &dollar;$3", // :plnum, nftistIdx, amt
		ENDCOND:"end game condition reached",
		ENDTRIG:"End game triggered. Complete this round and then one final turn.",
		FINALTURN:"Final turn. (No KO actions)",
		FINALSCORE:"Show Final Scoring",
		// note: for replacements $n3 means replace nth $ with playerName
		PLNAME:"$13",
		// $n4 means replace with decoded msg
		COLBONUS:"$13 receives &dollar;$2 bonus for column $3", // : plNum : bonus amt : col num
		TILEMONEY:"$13 receives &dollar;$2 for tile $3", // : plnum : amt : tile#
		TILECRED:"$13 receives $2 cred for tile $3", // : plnum : amt : tile#
		EXART:"$13 receives &dollar;$2 for NFT by $32 in wallet", // : plnum : amt : nftist#
		AUCTIONART:"$13 receives &dollar;$2 for winning $32 NFT at auction", // : plnum : amt : nftist#
		TOWALLET:"$13 places auction NFT in wallet", // : plnum
		TOSOLD:"$13 places auction NFT with sold", // : plnum
		WALLETBONUS:"$13 receives &dollar;$2 from wallet bonus card", // : plnum : amt
		SOLDBONUS:"$13 receives &dollar;$2 from sold bonus card", // : plnum : amt
		CREDBONUS:"$13 receives &dollar;$2 from cred track", // : plnum : amt
		PLEATIX:"$13 is doing ticket executive action",
		PLEACBON:"$13 is doing contract bonus executive action",
		PLKOTIX:"$13 is doing ticket executive action for KO",
		PLKOCBON:"$13 is doing contract bonus executive action for KO",
		PLTO:"$13 moves to $24",
		PLKOED:"$13 is kicked out",
		PLKONONE:"$13 passes on their KO",
		PLEANONE:"$13 passes on their EA",
		DEALS4:"$13 deals 4 new contracts",
		DOESNOTHING:"$13 does nothing",
		SELLSART:"$13 sells $22 piece for &dollar;$3",
		VLEAVES:"$14 visitor is sent to the plaza",
		PLLOBBY:"their lobby",
		PLGALLERY:"their gallery",
		PLAZA:"the plaza",
		USESTIX:"$13 uses a ticket to move a $24 visitor to $34",
		USESCRED4M:"$13 uses cred to reduce cost by &dollar;1",
		USESCRED4F:"$13 uses cred to increase reknown by 1",
		GETSCONTRACT:"$13 gets contract",
		SENTHOME:"is sent home",
		SENTDISC:"is discarded",
		HIRED:"is hired",
		SENTCONT:"is placed on contract bonus",
		HELPER2:"$13 helper $24",
		GETSTIX:"$13 gets $24 ticket",
		BUYSART:"$13 buys $22 piece for &dollar;$3",
		DISCOVERS:"$13 discovers $22",
		FORBONUS:" for bonus",
		FORCOL:" for market column",
		FORHIREBONUS:" for hiring bonus",
		FORPROMO:" for promotion",
		FORMID:" for intermediate scoring",
		FORCELEB:" for making a magnate",
		RCVSCRED:"$13 receives $2 cred$34",
		RCVSMONEY:"$13 receives &dollar;$2$34",
		RCVSREKNOWN:"$13 gets reknown bonus",
		GETSTILE:"$13 gets reputation tile $2",
		// GETSART:"$13 gets $21 piece from $32",
		DOESTHUMB:"$13 uses $2 cred to promote NFTist",
		PLACESTILE:"$13 places reputation tile $2",
		PLACEAUCTION:"$13 pays &dollar;$2 for auction space",
		RCVSCONT:"$13 gets bonus contract action",
		GETVISITOR:"$13 moves a $24 vistor to their gallery",
		USEDCOMM:"$13 used a commission for this NFT",
		THUMBSUP:"$13 promotes $22 to level $3",
		INCRREKNOWN:"$13 increases $22's reknown to $3",
		DISCARDTIX:"ticket discarded (no action performed)",
		VISITOR2PLAZA:"$1 visitor moved from bag to plaza (no action performed)",
		AUCTIONPICK:"$13 selects $21 from auction",
		STARTPOS:"$13 starts in $24, taking reputation tile $3",
		TAKESTURN:"$13 turn #$2",
		DOESKO:"$13 to do KO action",
		MIDALERT:"Mid-game scoring upcoming",
		ENDALERT:"End game triggered",
		FINALROUND:"Final round. No KO actions",
		PLACE:["1st", "2nd", "3rd", "4th"],
	}
}

export {
	DEBUG,
	ACTIONLOC,
	NFTBONUSTYPE,
	NFTISTCOLOR,
	NFTLOC,
	NFTTYPE,
	HELPERLOC,
	AVAILHELPERLOCS,
	AUCTIONVAL,
	BONUSTYPE,
	CLICKITEM,
	CLICKSPACE,
	CONTRACTBONUS,
	CONTRACTLOC,
	FLAG,
	GAMESTATE,
	KOLOC,
	LOC2STATE,
	MARKETCOL,
	MARKETCOL2CRED,
	MAXCRED,
	MAXREPTILES,
	MEDIALOC,
	PLAYERCOLOR,
	PLAYERLOC,
	PROMPT,
	REPTILELOC,
	SIGLOC,
	TIXCOLOR,
	TIXLOC,
	VISITORCOLOR,
	VISITORLOC}