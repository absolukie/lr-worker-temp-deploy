var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// ../engine.js
var require_engine = __commonJS({
  "../engine.js"(exports, module) {
    (function(root, factory) {
      if (typeof module !== "undefined" && module.exports)
        module.exports = factory();
      else
        root.LivEngine = factory();
    })(typeof self !== "undefined" ? self : exports, function() {
      "use strict";
      var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      var SUITS = ["S", "H", "D", "C"];
      var SUIT_GLYPH = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
      function isJoker(id) {
        return id.indexOf("JOKER") === 0;
      }
      function isWild(id) {
        return isJoker(id) || rankOf(id) === "2";
      }
      function baseId(id) {
        var h = id.indexOf("#");
        return h < 0 ? id : id.slice(0, h);
      }
      function rankOf(id) {
        return isJoker(id) ? null : baseId(id).slice(0, -1);
      }
      function suitOf(id) {
        return isJoker(id) ? null : baseId(id).slice(-1);
      }
      function rankVal(rank, aceHigh) {
        if (rank === "A")
          return aceHigh ? 14 : 1;
        if (rank === "J")
          return 11;
        if (rank === "Q")
          return 12;
        if (rank === "K")
          return 13;
        return parseInt(rank, 10);
      }
      function cardPoints(id) {
        if (isWild(id))
          return 15;
        var r = rankOf(id);
        if (r === "A")
          return 15;
        if (r === "K" || r === "Q" || r === "J" || r === "10")
          return 10;
        return 5;
      }
      function cardName(id) {
        if (isJoker(id))
          return "Joker";
        return rankOf(id) + SUIT_GLYPH[suitOf(id)];
      }
      function isRed(id) {
        var s = suitOf(id);
        return s === "H" || s === "D";
      }
      function deckSpec(numPlayers) {
        if (numPlayers >= 5)
          return { decks: 3, jokers: 6 };
        return { decks: 2, jokers: 4 };
      }
      function buildDeck(numPlayers) {
        var spec = deckSpec(numPlayers), cards = [], d, s, r, j;
        for (d = 0; d < spec.decks; d++)
          for (s = 0; s < SUITS.length; s++)
            for (r = 0; r < RANKS.length; r++)
              cards.push(RANKS[r] + SUITS[s] + (spec.decks > 1 ? "#" + (d + 1) : ""));
        for (j = 1; j <= spec.jokers; j++)
          cards.push("JOKER" + j);
        return cards;
      }
      function shuffle(arr, rng) {
        var r = rng || Math.random, i, j, t;
        for (i = arr.length - 1; i > 0; i--) {
          j = Math.floor(r() * (i + 1));
          t = arr[i];
          arr[i] = arr[j];
          arr[j] = t;
        }
        return arr;
      }
      var CONTRACTS = [
        null,
        { sets: 2, runs: 0 },
        // 1: two sets
        { sets: 1, runs: 1 },
        // 2: one set + one run
        { sets: 0, runs: 2 },
        // 3: two runs
        { sets: 3, runs: 0 },
        // 4: three sets
        { sets: 2, runs: 1 },
        // 5: two sets + one run
        { sets: 1, runs: 2 },
        // 6: one set + two runs
        { sets: 0, runs: 3 }
        // 7: three runs
      ];
      function contractFor(dealNum) {
        return CONTRACTS[dealNum];
      }
      function buyLimit(nPlayers) {
        return nPlayers <= 2 ? 3 : nPlayers <= 4 ? 2 : 1;
      }
      function buyCandidates(state) {
        var T = state.table;
        if (T.phase !== "play" || T.turnStep !== "draw" || !T.lastDiscarderPid)
          return [];
        var n = state.players.length, out = [], k;
        var start = (seatOf(state, T.turnPid) + 1) % n;
        for (k = 0; k < n; k++) {
          var p = state.players[(start + k) % n];
          if (p.pid === T.lastDiscarderPid)
            continue;
          if (p.pid === T.turnPid)
            continue;
          if (T.down[p.pid])
            continue;
          if (((T.buysLeft || {})[p.pid] || 0) <= 0)
            continue;
          out.push(p.pid);
        }
        return out;
      }
      function contractText(dealNum) {
        var c = contractFor(dealNum), parts = [];
        if (c.sets)
          parts.push(c.sets + (c.sets === 1 ? " set" : " sets"));
        if (c.runs)
          parts.push(c.runs + (c.runs === 1 ? " run" : " runs"));
        return parts.join(" + ");
      }
      function dealSize(dealNum) {
        return dealNum <= 4 ? 10 : 12;
      }
      function contractSatisfied(melds, contract) {
        var s = 0, r = 0, i;
        for (i = 0; i < melds.length; i++) {
          if (melds[i].type === "set")
            s++;
          else if (melds[i].type === "run")
            r++;
        }
        return s >= contract.sets && r >= contract.runs;
      }
      function analyzeMeld(cards) {
        if (!cards || cards.length < 3)
          return { valid: false };
        var set = validSet(cards);
        if (set.valid)
          return set;
        return validRun(cards);
      }
      function validSet(cards) {
        if (cards.length < 3)
          return { valid: false };
        var nat = [], jok = [], i;
        for (i = 0; i < cards.length; i++) {
          if (isWild(cards[i]))
            jok.push(cards[i]);
          else
            nat.push(cards[i]);
        }
        if (nat.length < 2)
          return { valid: false };
        var r0 = rankOf(nat[0]);
        for (i = 1; i < nat.length; i++)
          if (rankOf(nat[i]) !== r0)
            return { valid: false };
        var jm = {};
        jok.forEach(function(j) {
          jm[j] = { rank: r0, suit: null };
        });
        return { valid: true, type: "set", jokers: jm };
      }
      function validRunPlacements(cards) {
        var out = [], seenKey = {};
        if (!cards || cards.length < 4)
          return out;
        var nat = [], jok = [], i;
        for (i = 0; i < cards.length; i++) {
          if (isWild(cards[i]))
            jok.push(cards[i]);
          else
            nat.push(cards[i]);
        }
        if (!nat.length)
          return out;
        var s0 = suitOf(nat[0]);
        for (i = 1; i < nat.length; i++)
          if (suitOf(nat[i]) !== s0)
            return out;
        var ranks = nat.map(rankOf);
        var seen = {};
        for (i = 0; i < ranks.length; i++) {
          if (seen[ranks[i]])
            return out;
          seen[ranks[i]] = true;
        }
        var w = jok.length;
        for (var ah = 0; ah <= 1; ah++) {
          var aceHigh = !!ah;
          var vals = ranks.map(function(r) {
            return rankVal(r, aceHigh);
          });
          var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
          var natSet = {};
          vals.forEach(function(v2) {
            natSet[v2] = true;
          });
          var valToRank = {};
          RANKS.forEach(function(r) {
            valToRank[rankVal(r, aceHigh)] = r;
          });
          for (var lo = Math.max(1, mn - w); lo <= mn; lo++) {
            for (var hi = mx; hi <= Math.min(14, mx + w); hi++) {
              if (hi - lo + 1 - nat.length !== w)
                continue;
              var ok = true, prevWild = false, v;
              for (v = lo; v <= hi; v++) {
                var isW = !natSet[v];
                if (isW && prevWild) {
                  ok = false;
                  break;
                }
                prevWild = isW;
              }
              if (!ok)
                continue;
              var jm = {}, wi = 0;
              for (v = lo; v <= hi; v++) {
                if (!natSet[v])
                  jm[jok[wi++]] = { rank: valToRank[v], suit: s0 };
              }
              var ids = Object.keys(jm).sort();
              var key = ids.map(function(id) {
                return jm[id].rank + (jm[id].suit || "");
              }).join("|");
              if (seenKey[key])
                continue;
              seenKey[key] = true;
              out.push({ jokers: jm, aceHigh });
            }
          }
        }
        return out;
      }
      function validRun(cards) {
        var ps = validRunPlacements(cards);
        if (!ps.length)
          return { valid: false };
        return { valid: true, type: "run", jokers: ps[0].jokers, aceHigh: ps[0].aceHigh };
      }
      function orderRunCards(cards, jokers, aceHigh) {
        var ah = !!aceHigh;
        return cards.slice().sort(function(a, b) {
          var ra = ((jokers || {})[a] || {}).rank || rankOf(a);
          var rb = ((jokers || {})[b] || {}).rank || rankOf(b);
          return rankVal(ra, ah) - rankVal(rb, ah);
        });
      }
      function meldDisplayOrder(meld) {
        if (meld.order && meld.order.length === meld.cards.length)
          return meld.order.slice();
        if (meld.type !== "run")
          return meld.cards.slice();
        var ah = true, hasA = false, has2 = false;
        meld.cards.forEach(function(c) {
          var r = ((meld.jokers || {})[c] || {}).rank || rankOf(c);
          if (r === "A")
            hasA = true;
          if (r === "2")
            has2 = true;
        });
        if (hasA && has2)
          ah = false;
        return orderRunCards(meld.cards, meld.jokers, ah);
      }
      function jokersEqual(a, b) {
        a = a || {};
        b = b || {};
        var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
        if (ka.length !== kb.length)
          return false;
        for (var i = 0; i < ka.length; i++) {
          if (ka[i] !== kb[i])
            return false;
          if ((a[ka[i]].rank || null) !== (b[ka[i]].rank || null))
            return false;
          if ((a[ka[i]].suit || null) !== (b[ka[i]].suit || null))
            return false;
        }
        return true;
      }
      function layOffWildOptions(meld, cardId) {
        if (!meld || meld.type !== "run" || !isWild(cardId))
          return [];
        return validRunPlacements(meld.cards.concat([cardId]));
      }
      function canLayOff(meld, cardId) {
        var res = analyzeMeld(meld.cards.concat([cardId]));
        return res.valid ? res : null;
      }
      function combos(arr, k) {
        var out = [];
        (function rec(start, cur) {
          if (cur.length === k) {
            out.push(cur.slice());
            return;
          }
          for (var i = start; i < arr.length; i++) {
            cur.push(arr[i]);
            rec(i + 1, cur);
            cur.pop();
          }
        })(0, []);
        return out;
      }
      function genCandidates(cards) {
        var cands = [], seen = {};
        var naturals = cards.filter(function(c) {
          return !isWild(c);
        });
        var jokers = cards.filter(isWild);
        function add(type, list) {
          var key = type + ":" + list.slice().sort().join(",");
          if (seen[key])
            return;
          seen[key] = true;
          var a = analyzeMeld(list);
          if (a.valid && a.type === type)
            cands.push({ type, cards: list.slice(), jokers: a.jokers });
        }
        var byRank = {};
        naturals.forEach(function(c) {
          (byRank[rankOf(c)] = byRank[rankOf(c)] || []).push(c);
        });
        Object.keys(byRank).forEach(function(r) {
          var rs = byRank[r], n = rs.length, combo, ci;
          if (n >= 3) {
            var subs = combos(rs, 3);
            for (ci = 0; ci < subs.length; ci++)
              add("set", subs[ci]);
          }
          if (n >= 2 && jokers.length) {
            var pairs = combos(rs, 2);
            for (var j = 0; j < jokers.length; j++)
              for (ci = 0; ci < pairs.length; ci++)
                add("set", pairs[ci].concat([jokers[j]]));
          }
        });
        var bySuit = {};
        naturals.forEach(function(c) {
          (bySuit[suitOf(c)] = bySuit[suitOf(c)] || []).push(c);
        });
        Object.keys(bySuit).forEach(function(s) {
          var sc = bySuit[s].slice().sort(function(a, b) {
            return rankVal(rankOf(a), true) - rankVal(rankOf(b), true);
          });
          var uniq = [], seenR = {};
          sc.forEach(function(c) {
            var r = rankOf(c);
            if (!seenR[r]) {
              seenR[r] = true;
              uniq.push(c);
            }
          });
          var n = uniq.length, i, j, k, ci;
          var J = jokers.length;
          for (i = 0; i < n; i++) {
            for (j = i + 1; j < n; j++) {
              var win = uniq.slice(i, j + 1), winLen = win.length;
              var kmax = Math.min(J, winLen + 1);
              for (k = 0; k <= kmax; k++) {
                if (winLen + k < 4)
                  continue;
                var jcs = k === 0 ? [[]] : combos(jokers, k);
                for (ci = 0; ci < jcs.length; ci++)
                  add("run", win.concat(jcs[ci]));
              }
            }
          }
        });
        return cands;
      }
      function findMeldCombos(cards, needSets, needRuns, maxResults) {
        var cands = genCandidates(cards);
        cands.sort(function(a, b) {
          return b.cards.length - a.cards.length;
        });
        var results = [];
        var used = {};
        function score(combo) {
          var n = 0, j = 0, s = 0, r = 0, i, k;
          for (i = 0; i < combo.length; i++) {
            n += combo[i].cards.length;
            s += combo[i].type === "set" ? 1 : 0;
            r += combo[i].type === "run" ? 1 : 0;
            for (k = 0; k < combo[i].cards.length; k++)
              if (isWild(combo[i].cards[k]))
                j++;
          }
          return { n, j, s, r };
        }
        function better(a, b) {
          if (!b)
            return true;
          var sa = score(a), sb = score(b);
          if (sa.n !== sb.n)
            return sa.n > sb.n;
          return sa.j < sb.j;
        }
        (function rec(idx, cur) {
          var sc = score(cur);
          if (sc.s >= needSets && sc.r >= needRuns) {
            if (better(cur, results[0]))
              results[0] = cur.slice();
          }
          for (var i = idx; i < cands.length; i++) {
            var m = cands[i], clash = false, k;
            for (k = 0; k < m.cards.length; k++)
              if (used[m.cards[k]]) {
                clash = true;
                break;
              }
            if (clash)
              continue;
            var ns = sc.s + (m.type === "set" ? 1 : 0), nr = sc.r + (m.type === "run" ? 1 : 0);
            if (ns > needSets + 1 || nr > needRuns + 1)
              continue;
            for (k = 0; k < m.cards.length; k++)
              used[m.cards[k]] = true;
            cur.push(m);
            rec(i + 1, cur);
            cur.pop();
            for (k = 0; k < m.cards.length; k++)
              delete used[m.cards[k]];
          }
        })(0, []);
        return results[0] ? [results[0]] : [];
      }
      var _meldSeq = 1;
      function newMeldId() {
        return "m" + _meldSeq++ + "_" + Math.floor(Math.random() * 1e6);
      }
      function createDeal(players, dealNum, dealsTotal, prevScores, rng) {
        var deck = shuffle(buildDeck(players.length), rng);
        var size = dealSize(dealNum), hands = {}, i, p;
        players.forEach(function(pl, idx) {
          hands[pl.pid] = [];
          for (i = 0; i < size; i++)
            hands[pl.pid].push(deck.pop());
        });
        var stock = deck;
        var discard = [stock.pop()];
        var firstSeat = dealNum % players.length;
        var scores = {}, buysLeft = {};
        players.forEach(function(pl) {
          scores[pl.pid] = prevScores && prevScores[pl.pid] || 0;
          buysLeft[pl.pid] = buyLimit(players.length);
        });
        return {
          players,
          hands,
          table: {
            dealNum,
            dealsTotal,
            stock,
            discard,
            melds: [],
            turnPid: players[firstSeat].pid,
            turnStep: "draw",
            turnNo: 1,
            down: {},
            downTurn: {},
            scores,
            dealPoints: {},
            buysLeft,
            lastDiscarderPid: null,
            events: [],
            phase: "play",
            goerPid: null
          }
        };
      }
      function seatOf(state, pid) {
        for (var i = 0; i < state.players.length; i++)
          if (state.players[i].pid === pid)
            return i;
        return -1;
      }
      function nextPid(state, pid) {
        var s = seatOf(state, pid);
        return state.players[(s + 1) % state.players.length].pid;
      }
      function meldsOf(state, pid) {
        return state.table.melds.filter(function(m) {
          return m.owner === pid;
        });
      }
      function needsLeft(state, pid) {
        var c = contractFor(state.table.dealNum), mine = meldsOf(state, pid), s = 0, r = 0;
        mine.forEach(function(m) {
          if (m.type === "set")
            s++;
          else
            r++;
        });
        return { sets: Math.max(0, c.sets - s), runs: Math.max(0, c.runs - r) };
      }
      function reshuffleIfNeeded(table) {
        if (table.stock.length === 0 && table.discard.length > 1) {
          var top = table.discard.pop();
          table.stock = shuffle(table.discard, Math.random);
          table.discard = [top];
        }
      }
      function logEvent(T, ev) {
        T.events = T.events || [];
        T.events.push(ev);
        while (T.events.length > 30)
          T.events.shift();
      }
      function applyMove(state, pid, move) {
        var T = state.table, hand = state.hands[pid];
        if (!hand)
          return { ok: false, error: "unknown player" };
        if (T.phase !== "play")
          return { ok: false, error: "deal over" };
        if (move.t === "buy")
          return applyBuy(state, pid, move);
        if (move.t === "liverpool")
          return applyLiverpool(state, pid, move);
        if (T.turnPid !== pid)
          return { ok: false, error: "not your turn" };
        function takeFromHand(card) {
          var i2 = hand.indexOf(card);
          if (i2 < 0)
            return false;
          hand.splice(i2, 1);
          return true;
        }
        if (move.t === "drawStock" || move.t === "drawDiscard") {
          if (T.turnStep !== "draw")
            return { ok: false, error: "already drew" };
          if (move.t === "drawStock") {
            reshuffleIfNeeded(T);
            if (!T.stock.length)
              return { ok: false, error: "stock empty" };
            hand.push(T.stock.pop());
          } else {
            if (!T.discard.length)
              return { ok: false, error: "discard empty" };
            hand.push(T.discard.pop());
          }
          T.turnStep = "play";
          T.lastDiscarderPid = null;
          return { ok: true };
        }
        function applyLiverpool(state2, pid2, move2) {
          var T2 = state2.table, hand2 = state2.hands[pid2];
          if (!hand2)
            return { ok: false, error: "unknown player" };
          if (T2.phase !== "play")
            return { ok: false, error: "deal over" };
          var top = T2.discard[T2.discard.length - 1];
          if (!top || top !== move2.card)
            return { ok: false, error: "card is gone" };
          if (pid2 === T2.lastDiscarderPid)
            return { ok: false, error: "can't call your own discard" };
          if (!move2.discard || hand2.indexOf(move2.discard) < 0)
            return { ok: false, error: "choose a card to shed" };
          if (hand2.length <= 1)
            return { ok: false, error: "must keep one card" };
          var fits = null;
          for (var i2 = 0; i2 < T2.melds.length; i2++) {
            if (canLayOff(T2.melds[i2], top)) {
              fits = T2.melds[i2];
              break;
            }
          }
          if (!fits) {
            logEvent(T2, { k: "liverpoolFail", who: pid2, card: top, ts: Date.now() });
            return { ok: false, error: "that card can't be melded" };
          }
          hand2.splice(hand2.indexOf(move2.discard), 1);
          T2.discard.push(move2.discard);
          logEvent(T2, { k: "liverpool", who: pid2, card: top, meldId: fits.id, shed: move2.discard, ts: Date.now() });
          return { ok: true, meldId: fits.id };
        }
        function applyBuy(state2, pid2, move2) {
          var T2 = state2.table, hand2 = state2.hands[pid2];
          if (T2.turnStep !== "draw")
            return { ok: false, error: "buy window closed" };
          if (!T2.lastDiscarderPid)
            return { ok: false, error: "nothing to buy" };
          if (pid2 === T2.turnPid)
            return { ok: false, error: "take it on your turn instead" };
          if (pid2 === T2.lastDiscarderPid)
            return { ok: false, error: "can't buy your own discard" };
          var left = T2.buysLeft && T2.buysLeft[pid2] || 0;
          if (left <= 0)
            return { ok: false, error: "no buys left" };
          var top = T2.discard[T2.discard.length - 1];
          if (!top || top !== move2.card)
            return { ok: false, error: "card is gone" };
          T2.discard.pop();
          hand2.push(top);
          reshuffleIfNeeded(T2);
          var penalty = null;
          if (T2.stock.length) {
            penalty = T2.stock.pop();
            hand2.push(penalty);
          }
          T2.buysLeft[pid2] = left - 1;
          T2.lastDiscarderPid = null;
          logEvent(T2, { k: "buy", who: pid2, card: top, penalty, left: T2.buysLeft[pid2] });
          return { ok: true, bought: top, penalty };
        }
        if (move.t === "goOut7") {
          if (T.dealNum !== 7 || T.turnStep !== "draw")
            return { ok: false, error: "not available" };
          var combos2 = findMeldCombos(hand, 0, 3);
          var good = combos2.some(function(cb) {
            var n = 0, allRuns = true, i2;
            for (i2 = 0; i2 < cb.length; i2++) {
              n += cb[i2].cards.length;
              if (cb[i2].type !== "run")
                allRuns = false;
            }
            return allRuns && n === hand.length && cb.length === 3;
          });
          if (!good)
            return { ok: false, error: "hand is not 3 runs" };
          T.phase = "dealEnd";
          T.goerPid = pid;
          return { ok: true };
        }
        if (move.t === "layDown") {
          if (T.turnStep !== "play")
            return { ok: false, error: "draw first" };
          if (T.down[pid])
            return { ok: false, error: "already down" };
          var need = needsLeft(state, pid);
          var melds = move.melds || [];
          if (!melds.length)
            return { ok: false, error: "no melds" };
          var usedCards = [], i, m, placements = [];
          for (i = 0; i < melds.length; i++) {
            m = melds[i];
            var a = analyzeMeld(m.cards);
            if (!a.valid || a.type !== m.type)
              return { ok: false, error: "invalid meld" };
            if (m.type === "set" && m.cards.length > 3)
              return { ok: false, error: "sets go down as 3 \u2014 lay the rest off next turn" };
            var pl = null;
            if (m.jokers) {
              if (m.type !== "run")
                return { ok: false, error: "invalid meld" };
              var opts = validRunPlacements(m.cards);
              for (var oi = 0; oi < opts.length; oi++)
                if (jokersEqual(opts[oi].jokers, m.jokers)) {
                  pl = opts[oi];
                  break;
                }
              if (!pl)
                return { ok: false, error: "invalid meld" };
            }
            placements.push(pl);
            for (var k = 0; k < m.cards.length; k++) {
              if (hand.indexOf(m.cards[k]) < 0 || usedCards.indexOf(m.cards[k]) >= 0)
                return { ok: false, error: "card not available" };
              usedCards.push(m.cards[k]);
            }
          }
          var asMelds = melds.map(function(mm, ix) {
            var a2 = analyzeMeld(mm.cards);
            var plc = placements[ix];
            var jk = plc ? plc.jokers : a2.jokers;
            var md = { id: newMeldId(), type: a2.type, owner: pid, cards: mm.cards.slice(), jokers: jk };
            md.order = md.type === "run" ? orderRunCards(md.cards, jk, plc ? plc.aceHigh : a2.aceHigh) : md.cards.slice();
            return md;
          });
          if (!contractSatisfied(asMelds, contractFor(T.dealNum)))
            return { ok: false, error: "does not meet contract" };
          if (hand.length - usedCards.length < 1)
            return { ok: false, error: "must keep one card to discard" };
          usedCards.forEach(takeFromHand);
          asMelds.forEach(function(mm) {
            T.melds.push(mm);
          });
          T.down[pid] = 1;
          T.downTurn[pid] = T.turnNo;
          return { ok: true };
        }
        if (move.t === "layOff") {
          if (T.turnStep !== "play")
            return { ok: false, error: "draw first" };
          if (!T.down[pid])
            return { ok: false, error: "go down first" };
          if (T.downTurn[pid] === T.turnNo)
            return { ok: false, error: "lay-offs open next turn" };
          var meld = null, mi;
          for (mi = 0; mi < T.melds.length; mi++)
            if (T.melds[mi].id === move.meldId)
              meld = T.melds[mi];
          if (!meld)
            return { ok: false, error: "no such meld" };
          if (hand.indexOf(move.card) < 0)
            return { ok: false, error: "card not in hand" };
          var res = canLayOff(meld, move.card);
          if (!res)
            return { ok: false, error: "does not fit" };
          if (move.jokers && meld.type === "run" && isWild(move.card)) {
            var lopts = layOffWildOptions(meld, move.card), lok = false;
            for (var li = 0; li < lopts.length; li++)
              if (jokersEqual(lopts[li].jokers, move.jokers)) {
                lok = true;
                res = lopts[li];
                break;
              }
            if (!lok)
              return { ok: false, error: "does not fit" };
          }
          if (hand.length <= 1)
            return { ok: false, error: "must keep one card to discard" };
          takeFromHand(move.card);
          meld.cards.push(move.card);
          meld.jokers = res.jokers;
          if (meld.type === "run")
            meld.order = orderRunCards(meld.cards, meld.jokers, res.aceHigh);
          return { ok: true };
        }
        if (move.t === "steal") {
          if (T.turnStep !== "play")
            return { ok: false, error: "draw first" };
          if (!T.down[pid])
            return { ok: false, error: "go down first" };
          if (T.downTurn[pid] === T.turnNo)
            return { ok: false, error: "stealing opens next turn" };
          if (!isWild(move.jokerId))
            return { ok: false, error: "only wilds can be stolen" };
          var tm = null, ti;
          for (ti = 0; ti < T.melds.length; ti++)
            if (T.melds[ti].id === move.meldId)
              tm = T.melds[ti];
          if (!tm || !tm.jokers[move.jokerId])
            return { ok: false, error: "no such joker" };
          if (hand.indexOf(move.card) < 0 || isWild(move.card))
            return { ok: false, error: "card not in hand" };
          var asg = tm.jokers[move.jokerId];
          if (asg.rank !== rankOf(move.card))
            return { ok: false, error: "wrong card" };
          if (asg.suit && asg.suit !== suitOf(move.card))
            return { ok: false, error: "wrong suit" };
          var ci = tm.cards.indexOf(move.jokerId);
          if (ci < 0)
            return { ok: false, error: "no such joker" };
          var newCards = tm.cards.slice();
          newCards[ci] = move.card;
          var chk = analyzeMeld(newCards);
          if (!chk.valid)
            return { ok: false, error: "meld broken" };
          takeFromHand(move.card);
          tm.cards[ci] = move.card;
          delete tm.jokers[move.jokerId];
          hand.push(move.jokerId);
          tm.jokers = chk.jokers;
          if (tm.type === "run")
            tm.order = orderRunCards(tm.cards, tm.jokers, chk.aceHigh);
          return { ok: true };
        }
        if (move.t === "discard") {
          if (T.turnStep !== "play")
            return { ok: false, error: "draw first" };
          if (!takeFromHand(move.card))
            return { ok: false, error: "card not in hand" };
          T.discard.push(move.card);
          T.lastDiscarderPid = pid;
          logEvent(T, { k: "toss", who: pid, card: move.card });
          if (hand.length === 0) {
            T.phase = "dealEnd";
            T.goerPid = pid;
          } else {
            T.turnPid = nextPid(state, pid);
            T.turnStep = "draw";
            T.turnNo++;
          }
          return { ok: true };
        }
        return { ok: false, error: "unknown move" };
      }
      function scoreDeal(state) {
        var pts = {}, pid;
        for (pid in state.hands) {
          if (pid === state.table.goerPid) {
            pts[pid] = 0;
            continue;
          }
          var s = 0, i, h = state.hands[pid];
          for (i = 0; i < h.length; i++)
            s += cardPoints(h[i]);
          pts[pid] = s;
        }
        return pts;
      }
      function cardKeepValue(hand, card, need) {
        if (isWild(card))
          return 99;
        need = need || { sets: 1, runs: 1 };
        var v = 0, i, c;
        var rank = rankOf(card), suit = suitOf(card), rv = rankVal(rank, true);
        var sameRank = 0, suited = [];
        for (i = 0; i < hand.length; i++) {
          c = hand[i];
          if (c === card || isWild(c))
            continue;
          if (rankOf(c) === rank)
            sameRank++;
          else if (suitOf(c) === suit)
            suited.push(rankVal(rankOf(c), true));
        }
        if (need.sets > 0) {
          if (sameRank >= 2)
            v += 8;
          else if (sameRank === 1)
            v += 4;
        }
        if (need.runs > 0) {
          var vals = [rv];
          if (rank === "A")
            vals.push(1);
          for (i = 0; i < suited.length; i++)
            if (vals.indexOf(suited[i]) < 0)
              vals.push(suited[i]);
          var best = 1, a, b, cnt;
          for (a = 0; a < vals.length; a++) {
            cnt = 0;
            for (b = 0; b < vals.length; b++)
              if (vals[b] >= vals[a] && vals[b] <= vals[a] + 3)
                cnt++;
            if (cnt > best)
              best = cnt;
          }
          if (best >= 4)
            v += 9;
          else if (best === 3)
            v += 6;
          else if (best === 2)
            v += 2;
        } else {
          for (i = 0; i < suited.length; i++)
            if (Math.abs(suited[i] - rv) === 1)
              v += 1;
        }
        return v;
      }
      function handUsefulness(hand, card) {
        return cardKeepValue(hand, card, null);
      }
      function botChooseDiscard(hand, need) {
        var best = null, bestScore = -1e9, i;
        for (i = 0; i < hand.length; i++) {
          var c = hand[i];
          var sc = cardPoints(c) * 2 - cardKeepValue(hand, c, need);
          if (isWild(c) && hand.length > 1)
            sc = -1e6;
          if (sc > bestScore) {
            bestScore = sc;
            best = c;
          }
        }
        return best;
      }
      function botDrawChoice(hand, discardTop, need) {
        if (!discardTop)
          return "drawStock";
        if (isWild(discardTop))
          return "drawDiscard";
        need = need || { sets: 1, runs: 1 };
        var r = rankOf(discardTop), s = suitOf(discardTop), rv = rankVal(r, true), i, useful = false;
        for (i = 0; i < hand.length; i++) {
          var c = hand[i];
          if (isWild(c))
            continue;
          if (need.sets > 0 && rankOf(c) === r) {
            useful = true;
            break;
          }
          if (need.runs > 0 && suitOf(c) === s && Math.abs(rankVal(rankOf(c), true) - rv) <= 2) {
            useful = true;
            break;
          }
        }
        if (useful && Math.random() < 0.9)
          return "drawDiscard";
        if (!useful && Math.random() < 0.1)
          return "drawDiscard";
        return "drawStock";
      }
      function botWantsBuy(state, pid, card) {
        var hand = state.hands[pid];
        if (!hand || !card)
          return false;
        return botDrawChoice(hand, card, needsLeft(state, pid)) === "drawDiscard";
      }
      function botNextMove(state, pid) {
        var T = state.table, hand = state.hands[pid];
        if (T.phase !== "play" || T.turnPid !== pid)
          return null;
        if (T.turnStep === "draw") {
          if (T.dealNum === 7) {
            var combos2 = findMeldCombos(hand, 0, 3);
            var out = combos2.some(function(cb) {
              var n = 0, allRuns = true, i2;
              for (i2 = 0; i2 < cb.length; i2++) {
                n += cb[i2].cards.length;
                if (cb[i2].type !== "run")
                  allRuns = false;
              }
              return allRuns && n === hand.length && cb.length === 3;
            });
            if (out)
              return { t: "goOut7" };
          }
          var top = T.discard[T.discard.length - 1];
          return { t: botDrawChoice(hand, top, needsLeft(state, pid)) };
        }
        if (!T.down[pid]) {
          var need = needsLeft(state, pid);
          var found = findMeldCombos(hand, need.sets, need.runs);
          if (found.length) {
            var combo = found[0];
            var usedCount = combo.reduce(function(a, m) {
              return a + m.cards.length;
            }, 0);
            if (hand.length - usedCount >= 1) {
              return { t: "layDown", melds: combo.map(function(m) {
                return { type: m.type, cards: m.cards };
              }) };
            }
          }
        } else if (hand.length > 1 && T.downTurn[pid] !== T.turnNo) {
          for (var i = 0; i < hand.length; i++) {
            var c = hand[i];
            for (var mi = 0; mi < T.melds.length; mi++) {
              if (canLayOff(T.melds[mi], c))
                return { t: "layOff", card: c, meldId: T.melds[mi].id };
            }
          }
        }
        var d = botChooseDiscard(hand, needsLeft(state, pid));
        return { t: "discard", card: d };
      }
      return {
        RANKS,
        SUITS,
        isJoker,
        isWild,
        rankOf,
        suitOf,
        rankVal,
        cardPoints,
        cardName,
        isRed,
        deckSpec,
        buildDeck,
        shuffle,
        CONTRACTS,
        contractFor,
        contractText,
        dealSize,
        contractSatisfied,
        analyzeMeld,
        canLayOff,
        findMeldCombos,
        runWildOptions: validRunPlacements,
        layOffWildOptions,
        orderRunCards,
        meldDisplayOrder,
        createDeal,
        applyMove,
        scoreDeal,
        needsLeft,
        nextPid,
        meldsOf,
        botNextMove,
        botChooseDiscard,
        botDrawChoice,
        buyLimit,
        buyCandidates,
        botWantsBuy,
        handUsefulness
      };
    });
  }
});

// src/index.js
var import_engine = __toESM(require_engine(), 1);

// src/room.js
var E = null;
function setEngine(e) {
  E = e;
}
var TURN_MS = 9e4;
var BUY_MS = 12e3;
var BOT_MS = 3e3;
var MAX_HUMANS = 6;
function newPid() {
  return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
}
function countHands(G) {
  var c = {}, k;
  for (k in G.hands)
    c[k] = G.hands[k].length;
  return c;
}
function sanitizeTable(T, forPublic) {
  if (!T)
    return T;
  var c = {}, k;
  for (k in T)
    c[k] = T[k];
  c.stockCount = Array.isArray(T.stock) ? T.stock.length : 0;
  delete c.stock;
  if (forPublic)
    delete c.lastHands;
  return c;
}
function playerList(players) {
  return Object.keys(players).map(function(pid) {
    var p = players[pid];
    return { pid, name: p.name, isBot: !!p.isBot, seat: p.seat };
  }).sort(function(a, b) {
    return a.seat - b.seat;
  });
}
function send(ws, msg) {
  try {
    ws.send(JSON.stringify(msg));
  } catch (e) {
  }
}
var _Room = class {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sockets = [];
    this.state = null;
    this._ready = this._load();
  }
  async _load() {
    try {
      this.state = await this.ctx.storage.get("room-state");
    } catch (e) {
      this.state = null;
    }
    this._ensureObs();
  }
  async _save() {
    try {
      await this.ctx.storage.put("room-state", this.state);
    } catch (e) {
    }
  }
  _ensureObs() {
    var S = this.state;
    if (!S)
      return;
    if (!S.stats) {
      S.stats = { created: Date.now() };
      _Room.STAT_KEYS.forEach(function(k) {
        S.stats[k] = 0;
      });
    }
    if (!S.events)
      S.events = [];
  }
  _log(kind, detail, counter) {
    var S = this.state;
    if (!S)
      return;
    this._ensureObs();
    if (counter && S.stats[counter] != null)
      S.stats[counter]++;
    var d = (detail == null ? "" : String(detail)).slice(0, 160);
    S.events.push({ t: Date.now(), kind, d });
    if (S.events.length > 50)
      S.events = S.events.slice(-50);
    var line = { src: "lr-room", kind, d };
    if (counter === "exceptions" || kind === "exception" || kind === "client_error")
      console.error(JSON.stringify(line));
    else
      console.log(JSON.stringify(line));
  }
  _onException(where, e) {
    var msg = where + ": " + (e && e.message ? e.message : String(e)).slice(0, 200);
    this._log("exception", msg, "exceptions");
    this._save();
  }
  /* ---------- transport ---------- */
  async fetch(request) {
    await this._ready;
    try {
      return await this._route(request);
    } catch (e) {
      this._onException("fetch", e);
      return new Response("error", { status: 500 });
    }
  }
  // Client-side error beacon: the app POSTs window errors here (throttled,
  // fire-and-forget). Stored in the room's event buffer + counter and
  // console.error'd so it lands in Cloudflare Logs. Body is untrusted:
  // validate shape, truncate everything, never persist more than the cap.
  async _onClientError(request) {
    var data = null;
    try {
      var text = await request.text();
      if (text.length > 4e3)
        return new Response("too big", { status: 413 });
      data = JSON.parse(text);
    } catch (e) {
      return new Response("bad json", { status: 400 });
    }
    if (!data || typeof data.msg !== "string")
      return new Response("bad shape", { status: 400 });
    if (!this.state)
      return new Response("no room", { status: 404 });
    var v = String(data.v || "?").slice(0, 24);
    var msg = data.msg.slice(0, 200);
    var stack = typeof data.stack === "string" ? data.stack.slice(0, 300) : "";
    this._log("client_error", v + " | " + msg + (stack ? " | " + stack.split("\n")[0] : ""), "clientErrors");
    await this._save();
    return new Response("ok");
  }
  // All HTTP responses are same-shape JSON; allow the Pages origin (and any
  // origin) to read them so the dev-mode observability panel can poll /state.
  _json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    });
  }
  async _route(request) {
    var url = new URL(request.url);
    if (request.method === "OPTIONS")
      return this._json({}, 204);
    if (request.headers.get("Upgrade") === "websocket") {
      if (!/\/ws$/.test(url.pathname))
        return new Response("expected websocket", { status: 400 });
      var pair = new WebSocketPair();
      var server = pair[1];
      server.accept();
      var self2 = this;
      server.addEventListener("message", function(ev) {
        self2.onMessage(server, ev.data).catch(function(e) {
          self2._onException("onMessage", e);
        });
      });
      server.addEventListener("close", function() {
        self2.onClose(server);
      });
      server.addEventListener("error", function() {
        self2.onClose(server);
      });
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (/\/state$/.test(url.pathname)) {
      var body = this.state ? this.publicSnapshot() : { t: "state", empty: true };
      return this._json(body);
    }
    if (/\/client-error$/.test(url.pathname) && request.method === "POST")
      return this._onClientError(request);
    return new Response("not found", { status: 404 });
  }
  pidOf(ws) {
    for (var i = 0; i < this.sockets.length; i++)
      if (this.sockets[i].ws === ws)
        return this.sockets[i].pid;
    return null;
  }
  broadcast(msg) {
    var data = JSON.stringify(msg);
    this.sockets.forEach(function(s) {
      try {
        s.ws.send(data);
      } catch (e) {
      }
    });
  }
  sendTo(pid, msg) {
    var data = JSON.stringify(msg);
    this.sockets.forEach(function(s) {
      if (s.pid === pid) {
        try {
          s.ws.send(data);
        } catch (e) {
        }
      }
    });
  }
  snapshotFor(pid) {
    var S = this.state;
    var hands = null;
    if (S.game && S.game.hands) {
      hands = {};
      if (S.game.hands[pid])
        hands[pid] = S.game.hands[pid];
    }
    return {
      t: "state",
      status: S.status,
      creatorPid: S.creatorPid,
      settings: S.settings,
      players: S.players,
      table: S.game ? sanitizeTable(S.game.table, false) : null,
      hands,
      you: pid
    };
  }
  // Unauthenticated debug view: public info only, never any hands and never
  // the stock order or players' leftover hands. Stats + recent events are
  // included so the dev-mode observability panel (and anyone debugging) can
  // see room health without a privileged channel.
  publicSnapshot() {
    var S = this.state;
    this._ensureObs();
    return {
      t: "state",
      status: S.status,
      creatorPid: S.creatorPid,
      settings: S.settings,
      players: S.players,
      table: S.game ? sanitizeTable(S.game.table, true) : null,
      hands: null,
      stats: S.stats || null,
      events: (S.events || []).slice(-20)
    };
  }
  // State goes out per-socket so each client gets only their own hand.
  broadcastState() {
    var self2 = this;
    this.sockets.forEach(function(s) {
      try {
        s.ws.send(JSON.stringify(self2.snapshotFor(s.pid)));
      } catch (e) {
      }
    });
  }
  // Lobby controls belong to the creator; if the creator is offline, the
  // earliest-seated online human inherits them so lobbies never get stuck.
  effectiveCreator() {
    var S = this.state;
    if (S.players[S.creatorPid] && S.players[S.creatorPid].online)
      return S.creatorPid;
    var list = playerList(S.players).filter(function(p) {
      return !p.isBot && S.players[p.pid].online;
    });
    return list.length ? list[0].pid : S.creatorPid;
  }
  async onMessage(ws, raw) {
    await this._ready;
    var msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!msg || typeof msg.t !== "string")
      return;
    if (msg.t === "hello")
      return this.onHello(ws, msg);
    var pid = this.pidOf(ws);
    if (!pid) {
      send(ws, { t: "error", error: "Not in this room." });
      return;
    }
    switch (msg.t) {
      case "ping":
        send(ws, { t: "pong" });
        break;
      case "move":
        this.onMove(pid, msg.move);
        break;
      case "buy":
        this.onBuy(pid, msg.what);
        break;
      case "start":
        this.onStart(pid);
        break;
      case "nextDeal":
        this.onNextDeal(pid);
        break;
      case "addBot":
        this.onAddBot(pid);
        break;
      case "removeBot":
        this.onRemoveBot(pid, msg.pid);
        break;
      case "kick":
        this.onKick(pid, msg.pid);
        break;
      case "deals":
        this.onDeals(pid, msg.n);
        break;
    }
  }
  async onClose(ws) {
    await this._ready;
    var pid = this.pidOf(ws);
    this.sockets = this.sockets.filter(function(s) {
      return s.ws !== ws;
    });
    if (pid && this.state && this.state.players[pid]) {
      var still = this.sockets.some(function(s) {
        return s.pid === pid;
      });
      if (!still) {
        this.state.players[pid].online = false;
        await this._poke();
      }
    }
  }
  /* ---------- lobby ---------- */
  async onHello(ws, msg) {
    var S = this.state, pid = null;
    var name = (msg.name || "").toString().trim().slice(0, 24) || "Player";
    if (S && msg.pid && S.players[msg.pid] && !S.players[msg.pid].isBot) {
      pid = msg.pid;
      S.players[pid].online = true;
      if (name !== "Player")
        S.players[pid].name = name;
      this._log("rejoin", name, "rejoins");
    } else if (msg.create && S) {
      send(ws, { t: "error", error: "Room taken \u2014 try a new code." });
      try {
        ws.close();
      } catch (e) {
      }
      return;
    } else if (!msg.create && !S) {
      send(ws, { t: "error", error: "No room with that code." });
      try {
        ws.close();
      } catch (e) {
      }
      return;
    } else if (msg.create || !S) {
      pid = newPid();
      S = this.state = {
        status: "lobby",
        creatorPid: pid,
        settings: { deals: msg.deals === 3 ? 3 : 7 },
        players: {},
        game: null,
        buyRound: null,
        turn: null,
        action: null
      };
      S.players[pid] = { name, isBot: false, seat: 0, online: true };
      this._log("create", name, "creates");
    } else if (S.status === "lobby") {
      var humans = Object.keys(S.players).filter(function(k) {
        return !S.players[k].isBot;
      }).length;
      if (humans >= MAX_HUMANS) {
        send(ws, { t: "error", error: "Room is full." });
        try {
          ws.close();
        } catch (e) {
        }
        return;
      }
      pid = newPid();
      S.players[pid] = { name, isBot: false, seat: Object.keys(S.players).length, online: true };
      this._log("join", name, "joins");
    } else {
      send(ws, { t: "error", error: "That game already started." });
      try {
        ws.close();
      } catch (e) {
      }
      return;
    }
    var self2 = this;
    this.sockets.filter(function(s) {
      return s.pid === pid && s.ws !== ws;
    }).forEach(function(s) {
      try {
        s.ws.close();
      } catch (e) {
      }
    });
    this.sockets = this.sockets.filter(function(s) {
      return s.pid !== pid;
    });
    this.sockets.push({ ws, pid });
    this._ensureObs();
    await this._save();
    send(ws, { t: "welcome", pid, state: this.snapshotFor(pid) });
    var br = S.buyRound;
    if (br && br.queue[0] === pid && S.action && S.action.kind === "buy" && S.action.pid === pid)
      this._sendBuyRequest(pid);
    this.broadcastState();
  }
  async onStart(pid) {
    var S = this.state;
    if (!S || S.status !== "lobby")
      return;
    if (pid !== this.effectiveCreator()) {
      send(this._wsOf(pid), { t: "nak", error: "Only the room creator can start." });
      return;
    }
    var list = playerList(S.players);
    if (list.length < 2) {
      send(this._wsOf(pid), { t: "nak", error: "Need at least 2 players." });
      return;
    }
    S.game = E.createDeal(list, 1, S.settings.deals, null, Math.random);
    S.status = "playing";
    S.buyRound = null;
    S.action = null;
    S.turn = null;
    this._log("start", list.length + "p " + S.settings.deals + "d", "starts");
    await this._changed();
  }
  async onNextDeal(pid) {
    var S = this.state, G = S && S.game;
    if (!G || S.status !== "playing" || G.table.phase !== "score")
      return;
    if (pid !== this.effectiveCreator()) {
      this.sendTo(pid, { t: "nak", error: "Only the room creator can start the next deal." });
      return;
    }
    S.game = E.createDeal(playerList(S.players), G.table.dealNum + 1, G.table.dealsTotal, G.table.scores, Math.random);
    S.buyRound = null;
    S.action = null;
    S.turn = null;
    await this._changed();
  }
  async onAddBot(pid) {
    var S = this.state;
    if (!S || S.status !== "lobby" || pid !== this.effectiveCreator())
      return;
    if (Object.keys(S.players).length >= 6)
      return;
    var bots = Object.keys(S.players).filter(function(k) {
      return S.players[k].isBot;
    }).length;
    var bp = newPid();
    S.players[bp] = { name: "Bot " + (bots + 1), isBot: true, seat: Object.keys(S.players).length, online: true };
    await this._poke();
  }
  async onRemoveBot(pid, target) {
    var S = this.state;
    if (!S || S.status !== "lobby" || pid !== this.effectiveCreator())
      return;
    if (target && S.players[target] && S.players[target].isBot) {
      delete S.players[target];
      await this._poke();
    }
  }
  async onKick(pid, target) {
    var S = this.state;
    if (!S || S.status !== "lobby" || pid !== this.effectiveCreator())
      return;
    if (!target || target === pid || !S.players[target])
      return;
    var self2 = this;
    this.sockets.filter(function(s) {
      return s.pid === target;
    }).forEach(function(s) {
      send(s.ws, { t: "kicked" });
      try {
        s.ws.close();
      } catch (e) {
      }
    });
    this.sockets = this.sockets.filter(function(s) {
      return s.pid !== target;
    });
    delete S.players[target];
    await this._poke();
  }
  async onDeals(pid, n) {
    var S = this.state;
    if (!S || S.status !== "lobby" || pid !== this.effectiveCreator())
      return;
    S.settings.deals = n === 3 ? 3 : 7;
    await this._poke();
  }
  _wsOf(pid) {
    for (var i = 0; i < this.sockets.length; i++)
      if (this.sockets[i].pid === pid)
        return this.sockets[i].ws;
    return null;
  }
  /* ---------- game ---------- */
  async onMove(pid, move) {
    var S = this.state, G = S && S.game;
    var nak = function(err) {
      this._log("nak", "move:" + err, "naks");
      this._save();
      this.sendTo(pid, { t: "nak", error: err });
    }.bind(this);
    if (!G || S.status !== "playing")
      return nak("The game isn't running right now.");
    var T = G.table;
    if (T.phase !== "play")
      return nak("Hold on \u2014 not in play.");
    if (move && move.t === "liverpool")
      return this.onLiverpool(pid, move);
    if (T.turnPid !== pid)
      return nak("Too late \u2014 the turn moved on.");
    if (!move || typeof move.t !== "string")
      return nak("Bad move.");
    var r = E.applyMove(G, pid, move);
    if (!r.ok)
      return nak(r.error || "Illegal move.");
    if (S.stats)
      S.stats.moves++;
    if (S.buyRound)
      this._clearBuyRound();
    await this._changed();
    if (move.t === "discard" && G.table.phase === "play")
      await this._startBuyRound(pid, move.card);
  }
  // Liverpool calls happen out of turn: anyone except the discarder may call
  // the top discard while it sits on top. The engine validates; a good call
  // sheds one of the caller's cards without moving the turn.
  async onLiverpool(pid, move) {
    var S = this.state, G = S && S.game;
    var nak = function(err) {
      this._log("nak", "liverpool:" + err, "naks");
      this._save();
      this.sendTo(pid, { t: "nak", error: err });
    }.bind(this);
    if (!G || S.status !== "playing")
      return nak("The game isn't running right now.");
    if (G.table.phase !== "play")
      return nak("Hold on \u2014 not in play.");
    if (!move || typeof move.card !== "string")
      return nak("Bad move.");
    var r = E.applyMove(G, pid, move);
    if (!r.ok) {
      if (r.error === "that card can't be melded")
        this._log("liverpool_fail", E.cardName(move.card) + " by " + (S.players[pid] || {}).name, "liverpoolFails");
      return nak(r.error || "Illegal move.");
    }
    if (S.stats)
      S.stats.moves++;
    this._log("liverpool", E.cardName(move.card) + " by " + (S.players[pid] || {}).name, "liverpools");
    await this._changed();
    this.sendTo(pid, { t: "liverpoolOk", card: move.card, meldId: r.meldId });
  }
  async onBuy(pid, what) {
    var S = this.state, br = S && S.buyRound;
    if (!br || br.queue[0] !== pid)
      return;
    S.action = null;
    br.queue.shift();
    this.sendTo(pid, { t: "buyRequestClear" });
    if (what === "buy") {
      var r = E.applyMove(S.game, pid, { t: "buy", card: br.card });
      if (r.ok) {
        this._log("buy_done", E.cardName(r.bought), "buysDone");
        await this._changed();
        this._broadcastBuy(pid, r.bought, r.penalty);
      } else {
        this._log("nak", "buy:" + (r.error || "Can't buy that."), "naks");
        this._save();
        this.sendTo(pid, { t: "nak", error: r.error || "Can't buy that." });
      }
    }
    await this._buyStep();
  }
  /* ----- buy round ----- */
  async _startBuyRound(discarderPid, card) {
    var S = this.state;
    var queue = E.buyCandidates(S.game);
    if (!queue.length)
      return;
    S.buyRound = { queue, card, discarderPid };
    this._log("buy_open", E.cardName(card) + " x" + queue.length, "buysOffered");
    await this._buyStep();
  }
  async _buyStep() {
    var S = this.state, br = S.buyRound;
    if (!br)
      return;
    var T = S.game.table;
    if (T.phase !== "play" || T.turnStep !== "draw" || !T.lastDiscarderPid)
      return this._endBuyRound();
    var pid = br.queue[0];
    if (!pid)
      return this._endBuyRound();
    var p = S.players[pid];
    if (!p) {
      br.queue.shift();
      return this._buyStep();
    }
    if (p.isBot) {
      if (E.botWantsBuy(S.game, pid, br.card)) {
        var r = E.applyMove(S.game, pid, { t: "buy", card: br.card });
        if (r.ok) {
          await this._changed();
          this._broadcastBuy(pid, r.bought, r.penalty);
        }
      }
      br.queue.shift();
      return this._buyStep();
    }
    S.action = { kind: "buy", pid, at: Date.now() + BUY_MS };
    this._sendBuyRequest(pid);
    await this._poke();
  }
  // The buy prompt goes to exactly one socket. If that socket dies and the
  // player rejoins mid-window, the original buyRequest is lost with it — so
  // re-sends are safe and idempotent: the client just re-renders the box.
  _sendBuyRequest(pid) {
    var S = this.state, br = S.buyRound;
    if (!br || br.card == null || !S.game)
      return;
    var T = S.game.table;
    var dn = S.players[br.discarderPid];
    this.sendTo(pid, {
      t: "buyRequest",
      card: br.card,
      cardName: E.cardName(br.card),
      buyerPid: pid,
      discarderName: dn ? dn.name : "Someone",
      buysLeft: T.buysLeft && T.buysLeft[pid] || 0
    });
  }
  async _buyTimeout(pid) {
    var S = this.state, br = S.buyRound;
    if (!br || br.queue[0] !== pid)
      return;
    br.queue.shift();
    this._log("buy_timeout", E.cardName(br.card), "buyTimeouts");
    this.sendTo(pid, { t: "buyRequestClear" });
    await this._buyStep();
  }
  _clearBuyRound() {
    var S = this.state, br = S.buyRound;
    if (!br)
      return;
    if (br.queue[0])
      this.sendTo(br.queue[0], { t: "buyRequestClear" });
    S.buyRound = null;
    S.action = null;
  }
  async _endBuyRound() {
    var S = this.state;
    if (S.buyRound && S.buyRound.queue[0])
      this.sendTo(S.buyRound.queue[0], { t: "buyRequestClear" });
    S.buyRound = null;
    S.action = null;
    if (S.turn && S.game && S.game.table && S.game.table.phase === "play") {
      S.turn.deadline = Date.now() + TURN_MS;
      S.game.table.turnDeadline = S.turn.deadline;
    }
    await this._poke();
  }
  _broadcastBuy(buyerPid, card, penalty) {
    var p = this.state.players[buyerPid];
    this.broadcast({
      t: "buyResult",
      buyerPid,
      buyerName: p ? p.name : "Someone",
      card,
      penalty
    });
  }
  /* ----- bots + auto-play ----- */
  async _botStep(pid) {
    var S = this.state, G = S.game;
    if (!G || S.status !== "playing")
      return;
    var T = G.table;
    if (T.phase !== "play" || T.turnPid !== pid)
      return;
    var p = S.players[pid];
    if (!p || !p.isBot)
      return;
    var mv = E.botNextMove(G, pid);
    if (!mv)
      return;
    var wasDiscard = mv.t === "discard";
    if (!E.applyMove(G, pid, mv).ok)
      return;
    await this._changed();
    if (wasDiscard && G.table.phase === "play")
      await this._startBuyRound(pid, mv.card);
  }
  async _autoPlay(pid, step, key) {
    var S = this.state, G = S.game;
    if (!G || S.status !== "playing")
      return;
    var T = G.table;
    if (T.phase !== "play")
      return;
    if (T.turnNo + ":" + T.turnPid + ":" + T.turnStep !== key)
      return;
    if (!G.hands[pid])
      return;
    if (T.turnStep === "draw") {
      if (!E.applyMove(G, pid, { t: "drawStock" }).ok)
        E.applyMove(G, pid, { t: "drawDiscard" });
    }
    var autoD = null;
    if (G.table.phase === "play") {
      autoD = E.botChooseDiscard(G.hands[pid]);
      if (!E.applyMove(G, pid, { t: "discard", card: autoD }).ok)
        autoD = null;
    }
    if (G.table.phase === "play" && G.table.turnNo + ":" + G.table.turnPid + ":" + G.table.turnStep === key) {
      this._log(
        "autoplay_stuck",
        "turn " + key + " did not advance; forcing next player",
        "autoPlay"
      );
      var np = E.nextPid(G, pid);
      if (np && np !== pid) {
        G.table.turnPid = np;
        G.table.turnStep = "draw";
        G.table.turnNo++;
      } else {
        G.table.phase = "dealEnd";
        G.table.goerPid = pid;
      }
    }
    await this._changed();
    if (autoD && G.table.phase === "play")
      await this._startBuyRound(pid, autoD);
  }
  _endDeal() {
    var S = this.state, G = S.game, T = G.table;
    var pts = E.scoreDeal(G);
    T.dealPoints = pts;
    T.lastHands = {};
    Object.keys(G.hands).forEach(function(pid) {
      T.lastHands[pid] = G.hands[pid].slice();
    });
    Object.keys(pts).forEach(function(pid) {
      T.scores[pid] = (T.scores[pid] || 0) + pts[pid];
    });
    this._log("deal_end", "deal " + T.dealNum + "/" + T.dealsTotal, "dealEnds");
    if (T.dealNum >= T.dealsTotal) {
      T.phase = "final";
      S.status = "done";
    } else
      T.phase = "score";
    S.turn = null;
    S.action = null;
    S.buyRound = null;
  }
  /* ----- state pipeline ----- */
  _ensureTurn() {
    var S = this.state, G = S.game;
    if (!G || S.status !== "playing" || G.table.phase !== "play") {
      S.turn = null;
      return;
    }
    var key = G.table.turnNo + ":" + G.table.turnPid + ":" + G.table.turnStep;
    if (!S.turn || S.turn.key !== key) {
      S.turn = { key, pid: G.table.turnPid, step: G.table.turnStep, deadline: Date.now() + TURN_MS };
      G.table.turnDeadline = S.turn.deadline;
    }
  }
  _ensureAction() {
    var S = this.state;
    if (S.action || S.buyRound)
      return;
    var G = S.game;
    if (!G || S.status !== "playing" || G.table.phase !== "play")
      return;
    var p = S.players[G.table.turnPid];
    if (p && p.isBot)
      S.action = { kind: "bot", pid: G.table.turnPid, at: Date.now() + BOT_MS };
  }
  // Full pipeline after any game mutation: counts, revision, deal end,
  // timers, persist, alarm, broadcast.
  async _changed() {
    var S = this.state, G = S.game;
    if (G && G.table) {
      G.table.counts = countHands(G);
      G.table._rev = (G.table._rev || 0) + 1;
      if (G.table.phase === "dealEnd")
        this._endDeal();
      this._ensureTurn();
      this._ensureAction();
    }
    await this._save();
    await this._schedule();
    this.broadcastState();
  }
  // Light pipeline: no revision bump (lobby changes, buy prompts).
  async _poke() {
    this._ensureAction();
    await this._save();
    await this._schedule();
    this.broadcastState();
  }
  async _schedule() {
    var S = this.state, next = 0;
    if (S.action)
      next = S.action.at;
    if (S.turn)
      next = next ? Math.min(next, S.turn.deadline) : S.turn.deadline;
    try {
      if (next)
        await this.ctx.storage.setAlarm(Math.max(next, Date.now()));
      else
        await this.ctx.storage.deleteAlarm();
    } catch (e) {
    }
  }
  async alarm() {
    await this._ready;
    try {
      await this._alarmInner();
    } catch (e) {
      this._onException("alarm", e);
    }
  }
  async _alarmInner() {
    var S = this.state;
    if (!S || !S.game)
      return;
    var now = Date.now(), G = S.game, T = G.table;
    if (S.action && S.action.at <= now + 1e3) {
      var A = S.action;
      S.action = null;
      if (A.kind === "buy")
        await this._buyTimeout(A.pid);
      else if (A.kind === "bot")
        await this._botStep(A.pid);
    }
    if (S.turn && S.turn.deadline <= now + 1e3) {
      var tn = S.turn;
      if (S.status === "playing" && T.phase === "play" && T.turnNo + ":" + T.turnPid + ":" + T.turnStep === tn.key)
        await this._autoPlay(tn.pid, tn.step, tn.key);
      else {
        S.turn = null;
        await this._poke();
      }
    }
  }
};
var Room = _Room;
/* ---------- observability ---------- */
// Per-room stats (persisted counters) + a capped ring buffer of recent
// events. Both ride along in the public snapshot so the dev-mode panel can
// render them, and every entry also goes to console as structured JSON so
// it lands in Cloudflare Logs. Events are sanitized: kinds + short details
// only, never hands, never full state.
__publicField(Room, "STAT_KEYS", [
  "starts",
  "moves",
  "naks",
  "buysOffered",
  "buysDone",
  "buyTimeouts",
  "rejoins",
  "dealEnds",
  "clientErrors",
  "exceptions",
  "liverpools",
  "liverpoolFails",
  "joins",
  "creates"
]);

// src/index.js
setEngine(import_engine.default && import_engine.default.createDeal ? import_engine.default : self.LivEngine);
var src_default = {
  async fetch(request, env) {
    var url = new URL(request.url);
    if (url.pathname === "/health")
      return new Response("ok");
    var m = url.pathname.match(/^\/room\/([A-Za-z0-9]{4,12})\/(ws|state|client-error)$/);
    if (m) {
      var id = env.ROOMS.idFromName(m[1].toUpperCase());
      var stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }
    return new Response("not found", { status: 404 });
  }
};
export {
  Room,
  src_default as default
};
