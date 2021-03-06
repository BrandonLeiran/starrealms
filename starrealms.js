var Shuffle = require('shuffle');
var Readline = require('readline-sync');

Array.prototype.add = function (n, card) { for (var i=0; i<n; i++) { this.push(card); }};

function initPlayer(name)
{
	return {name:name, discard:[], bases:[], combat:0, trade:0, deck:initPlayerDeck(), authority:50};
}

function initPlayerDeck() {
	var deck = [];
	deck.add(8, {name:'Scout', trade:1});
	deck.add(2, {name:'Viper', combat:1});
	return Shuffle.shuffle({deck: deck});
}

function drawCards(p, n)
{
	var cards = [].concat(p.deck.draw(Math.min(n, p.deck.cards.length)) || []);
	if (cards.length < n)
	{
		//console.log("Reshuffling ", p.name);
		p.deck.putOnTopOfDeck(p.discard);
		p.discard = [];
		p.deck.shuffle();
		cards = cards.concat(p.deck.draw(n-cards.length));
	}
	return cards;
}

function getFactionsInPlay(p) {
	var cardsInPlay = p.hand.concat(p.bases);
	var factions = cardsInPlay.map(function(c){return c.faction}).filter(function(c){ return c; });
	return factions.filter(function(faction,index,self) { return self.indexOf(faction) === index;});
}

function playCommon(card, p) {
	if (card.hasOwnProperty('trade')) { p.trade += card.trade; }
	if (card.hasOwnProperty('authority')) { p.authority += card.authority; }
	if (card.hasOwnProperty('combat')) {p.combat += card.combat; }
	if (card.hasOwnProperty('drawCard')) { p.hand = p.hand.concat(drawCards(p, card.drawCard)); }	
	if (getFactionsInPlay(p).indexOf(card.faction) > 0 && card.hasOwnProperty('allyAbilities')) { console.log(card.name, " gets ally bonus of ", card.allyAbilities); playCommon(card.allyAbilities, p); }
}

function playBase(card, p) {
	playCommon(card, p);
}

function playCard(card, p) {
	playCommon(card, p);
	if (card.hasOwnProperty('base') || card.hasOwnProperty('outpost')) { moveCard(card, p.hand, p.bases); }
}

function moveCard(card, src, dst) {
	dst.push(card);
	src.splice(src.indexOf(card), 1);
}

function play(p, notp, trade) {
	//console.log(p.name, "'s turn!");

	//Main
	//console.log("HAND: ", p.hand.map(function(card) { return card.name; }));
	//console.log("BASES: ", p.bases.map(function(card) { return card.name; }));

	p.bases.forEach(function(card) {
		playBase(card, p);
	})
	p.hand.forEach(function(card) {
		playCard(card, p);
	});

	//console.log("T:", p.trade, "A:", p.authority, "C:", p.combat);
	
	//console.log("TRADE: ", trade.row.map(function(card) { return card.name; }));
	
	//Main Combat
	while (p.combat > 0) {
		if (notp.bases[0]) {
			var outposts = notp.bases.filter(function(b) { return b.hasOwnProperty('outpost'); }).sort(function(a, b) { return a.outpost-b.outpost; });
			if (outposts[0])
			{
				if (outposts[0].outpost <= p.combat) {
					moveCard(outposts[0], notp.bases, notp.discard);
					p.combat -= outposts[0].outpost;
					console.log(p.name, " destroys outpost ", outposts[0].name);
					continue;
				}
				else {
					p.combat = 0;
					break;
				}
			}
		}

		//console.log(p.name, " attacks ", notp.name, " for ", p.combat, " authority.");
		notp.authority -= p.combat;
		p.combat = 0;
	}


	//Main Trade
	var toBuy = trade.row.filter(function(card) { return (card.cost <= p.trade)});
	while(toBuy.length > 0 && trade.deck.length > 0)
	{
		//console.log(toBuy.map(function(card) { return card.name; }));
		//console.log(p.name, " trades ", toBuy[0].cost, " for ", toBuy[0].name);
		moveCard(toBuy[0], trade.row, p.discard);
		trade.row.push(trade.deck.draw(1));
		p.trade -= toBuy[0].cost;
		toBuy = trade.row.filter(function(card) { return (card.cost <= p.trade)});
	}
	p.trade = 0;
	//Discard
	p.discard = p.discard.concat(p.hand);
	//Draw
	p.hand = drawCards(p,5);
}



module.exports.runGame = function () 
{
	//Initializations
	var p1 = initPlayer("P1");
	var p2 = initPlayer("P2");
	var trade = {deck:Shuffle.shuffle({deck: require('./tradeCards.js').getTradeCards()})};

	//Begin Game
	p1.hand = p1.deck.draw(3);
	p2.hand = p2.deck.draw(5);
	trade.row = trade.deck.draw(5);

	while(p1.authority > 0 && p2.authority > 0)
	{
		play(p1, p2, trade);
		if (p2.authority <=0) {
			console.log("P1 wins!");
			break;
		}
		//Readline.question('Continue:');
		play(p2, p1, trade);
		if (p1.authority <= 0) {
			console.log("P2 wins!");
			break;
		}
		//Readline.question('Continue:');
	}

	console.log("Final score - P1:", p1.authority, " P2:", p2.authority);
	return [p1.authority, p2.authority];
}