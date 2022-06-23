import {
	PLAYERCOLOR} from './egalconstants.mjs' ;
var socket = io();

var gameId;

// function randomizeColors() {
//     let allColors = ["orange","purple","blue","yellow"];
//     for (let p=1; p <= 4; p++) {
//         let dom = document.getElementById("selectcolorp" + p);
//         let randomColor = allColors.splice(Math.floor(Math.random() * allColors.length),1)[0];
//         dom.value = randomColor;
//     }
//     changeNumPlayers();

// }

function setColorDisabled(nodes, color, setTo) {
    for (let i=0; i < nodes.length; i++) {
        if (nodes[i].value === color) nodes[i].disabled = setTo;
    }
    return;
}

function changeNumPlayers() {
    let numPlayers = Number(document.getElementById("selectplayers").value);
    let startOptions = document.getElementById("selectstarter").children;
    for (let col of Object.values(PLAYERCOLOR)) {
        setColorDisabled(startOptions, col, true);
    }

    for (let p=1; p <= 4; p++) {
        let plColor = document.getElementById("selectcolorp" + p).value;
        if (p <= numPlayers) {
            document.getElementById("pl" + p).classList.remove('invis');
            if (plColor != "random") setColorDisabled(startOptions, plColor, false);
        } else {
            document.getElementById("pl" + p).classList.add('invis');
        }
    }
}

function changePlayerColor(el) {
    if (el.target.value != "random") {
        let usedColors = [];
        for (let p=1; p <= 4; p++) {
            let dom = document.getElementById("selectcolorp" + p);
            usedColors.push(dom.value);
        }
        let unusedColor = Object.values(PLAYERCOLOR).find((c) => !usedColors.includes(c));

        for (let p=1; p <= 4; p++) {
            let dom = document.getElementById("selectcolorp" + p);
            // skip element changed
            if (dom === el.target) continue;
            if (dom.value === el.target.value)  {
                // if element that wasn't changed has color that was changed
                // then switch it to unused color
                dom.value = unusedColor;
            }
        }
    }
    changeNumPlayers();
}

function startGame() {
    let players = [];
    for (let p=1; p <= 4; p++) {
        let dom = document.getElementById("pl" + p);
        if (dom.classList.contains('invis')) continue;
        players.push({name:document.getElementById("tname" + p).value, color:document.getElementById("selectcolorp" + p).value});
    }
    let startColor = document.getElementById("selectstarter").value;
    let startPlayer = players.findIndex((p) => p.color === startColor && p.color != "random");
    if (startPlayer === -1) startPlayer = 'x';
    socket.emit('create game', {
        players: players,
        options: {
            startPlayer: startPlayer,
            numContractPiles: Number(document.getElementById("numcontracts").value)
        }
    });

}

window.onload = function() {
    for (let p=1; p <= 4; p++) {
        let dom = document.getElementById("selectcolorp" + p);
        dom.addEventListener("change", function(el) {
            changePlayerColor(el);
        })
    }
    document.getElementById("selectplayers").addEventListener("change", changeNumPlayers);
    
    document.getElementById("startgame").addEventListener("click", startGame);
}

socket.on('game page', (msg) => {
    if (msg.gameId) {
        window.location.assign("./game.html?".concat("gid=",msg.gameId));
    }
})
    

