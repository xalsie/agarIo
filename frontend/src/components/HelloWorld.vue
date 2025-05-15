<script setup>
import { onMounted, ref } from "vue";
import { io } from "socket.io-client";
import p5 from './p5-instantiate';
import { Blob, Grid, Player, UI } from './assets/index';

const playerCount = ref(0);
const playerPosition = ref({ x: 0, y: 0 });
const showMenu = ref(true);

let w = window.innerWidth;
let h = window.innerHeight;

const PLAYER_RADIUS = 16;
const FIELD_SIZE = 10000;
const GRID_SIZE = 40;
const BLOBS_COUNT = FIELD_SIZE / 1.25;

let players = {};
let ui, grid;
let blobs = [];
let paused = true;
let gameStarted = false;
let zoom = 1;

let socket = io("http://localhost:4000");

function randomColor() {
    const color = p5.floor(p5.random(360));
    return {
        body: `hsla(${color}, 100%, 50%, 1)` ,
        border: `hsla(${color}, 100%, 35%, 1)`
    };
}

function connectToServer(nick) {
    const color = randomColor();
    const player = new Player(nick, socket.id, color.body, color.border);
    socket.emit("start", {
        x: player.pos.x,
        y: player.pos.y,
        r: player.radius,
        b: player.COLOR,
        bc: player.BORDER_COLOR,
        n: player.nick,
    });
    showMenu.value = false;
}

function handleConnect() {
    const nick = document.getElementById("nick").value;
    if (nick) connectToServer(nick);
}

function windowResized() {
    w = window.innerWidth;
    h = window.innerHeight;
    p5.resizeCanvas(w, h);
}

p5.setup = () => {
    p5.createCanvas(w, h);
    ui = new UI(p5, players, socket);
    grid = new Grid(GRID_SIZE);
    grid.draw();
};

p5.draw = () => {
    if (!gameStarted) {
        p5.clear();
        grid.draw();
        blobs.forEach(blob => blob && blob.draw());
        Object.values(players).forEach(player => player.draw());
        p5.fill(0, 0, 0, 120);
        p5.noStroke();
        p5.rect(0, 0, w, h);
        return;
    }
    if (!players[socket.id]) return ui.loading();
    p5.clear();
    p5.translate(w / 2, h / 2);
    let newZoom = p5.sqrt(h / (players[socket.id].radius * 8));
    zoom = p5.lerp(zoom, Math.max(newZoom, 0.7), 0.1);
    p5.scale(zoom);
    p5.translate(-players[socket.id].pos.x, -players[socket.id].pos.y);
    grid.draw();
    for (let i = blobs.length - 1; i >= 0; i--) {
        if (!blobs[i]) continue;
        blobs[i].draw();
        if (players[socket.id].eats(blobs[i])) {
            socket.emit("eatBlob", i);
            blobs.splice(i, 1);
        }
    }
    p5.stroke(100, 100, 150, 10);
    p5.strokeWeight(8);
    p5.noFill();
    p5.rect(0, 0, FIELD_SIZE, FIELD_SIZE);
    ui.draw();
    for (let id in players) {
        players[id].draw();
        if (id !== socket.id && players[socket.id].eats(players[id]) && players[id]) {
            delete players[id];
            socket.emit("removePlayer", id);
        }
        if (id === socket.id && !paused && players[socket.id]) {
            players[socket.id].move();
            socket.emit("update", {
                x: players[socket.id].pos.x,
                y: players[socket.id].pos.y,
                r: players[socket.id].radius,
            });
        }
    }
    if (players[socket.id]) {
        playerPosition.value = {
            x: Math.round(players[socket.id].pos.x),
            y: Math.round(players[socket.id].pos.y)
        };
    }
};

onMounted(() => {
    window.addEventListener("resize", windowResized);
});

// Socket events
socket.on("blobs", (data) => {
    blobs = data.blobs.map(b => new Blob(b.x, b.y, b.r, b.c));
    showMenu.value = true;
});

socket.on("start", (data) => {
    for (let id in data.players) {
        let p = data.players[id];
        players[id] = new Player(p.n, p.id, p.b, p.bc, p.x, p.y);
        players[id].block = [p.block.row, p.block.col];
    }
    blobs = data.blobs.map(b => b && new Blob(b.x, b.y, b.r, b.c)).filter(Boolean);
    gameStarted = true;
    paused = false;
});

socket.on("heartbeat", (data) => {
    for (let id in data.players) {
        if (id !== socket.id && players[id]) {
            players[id].pos.x = data.players[id].x;
            players[id].pos.y = data.players[id].y;
            players[id].radius = data.players[id].r;
        } else if (players[id]) {
            players[id].block = [data.players[id].block.row, data.players[id].block.col];
        }
    }
    playerCount.value = Object.keys(data.players).length;
});

socket.on("newPlayer", (data) => {
    players[data.id] = new Player(data.n, data.id, data.b, data.bc, data.x, data.y);
    playerCount.value = Object.keys(players).length;
});

socket.on("removePlayer", (data) => {
    delete players[data.id];
    if (data.id == socket.id) {
        gameStarted = false;
        paused = true;
        showMenu.value = true;
    }
    playerCount.value = Object.keys(players).length;
});

socket.on("removeBlob", (data) => {
    if (data.id !== socket.id) blobs.splice(data.i, 1);
});

socket.on("newBlob", (data) => {
    blobs.push(new Blob(data.x, data.y, data.r, data.c));
});
</script>

<template>
    <div>
        <div class="players player-position" id="playersStats" style="display: block">
            <div>
                Players: <span>{{ playerCount }}</span>
            </div>
            <div v-if="playerPosition" class="flex flex-col items-center">
                <div><span>Position X: {{ playerPosition.x }}</span></div>
                <div><span>Position Y: {{ playerPosition.y }}</span></div>
            </div>
        </div>
        <div class="game-menu" v-show="showMenu" id="menu">
            <h1 class="game-header">agario.js</h1>
            <input type="text" placeholder="Nickname" id="nick" required class="name-input" />
            <button @click="handleConnect" class="connect-btn btn">connect</button>
        </div>
    </div>
</template>

<style scoped>
:root {
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;

    color-scheme: light dark;
    color: rgba(255, 255, 255, 0.87);
    background-color: #242424;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
}
a:hover {
    color: #535bf2;
}

body {
    margin: 0;
    display: flex;
    place-items: center;
    min-width: 320px;
    min-height: 100vh;
}

h1 {
    font-size: 3.2em;
    line-height: 1.1;
}

button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #1a1a1a;
    cursor: pointer;
    transition: border-color 0.25s;
}
button:hover {
    border-color: #646cff;
}
button:focus,
button:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
}

.card {
    padding: 2em;
}

#app {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}

@media (prefers-color-scheme: light) {
    :root {
        color: #213547;
        background-color: #ffffff;
    }
    a:hover {
        color: #747bff;
    }
    button {
        background-color: #f9f9f9;
    }
}
/* ------------------ */
body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

.game-menu {
    position: absolute;
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.game-header {
    color: white;
    font-weight: 900;
    font-size: 4.5rem !important;
    margin-bottom: 24px;
    margin-top: 0;
}

.btn {
    max-width: 256px;
    width: 100%;
    height: 48px;
    border-radius: 14px;
    border: 2px white solid;
    background: transparent;
    margin: 6px;
    color: white;
    font-size: 1.2rem;
    text-transform: uppercase;
    transition: 0.1s ease all;
}

.btn:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: translateY(-0.5px);
}

.btn:focus {
    outline: 0;
}

.connect-btn {
    background: rgba(41, 134, 241, 0.8);
    border-color: rgb(41, 144, 241);
}

.connect-btn:hover {
    background: rgba(41, 134, 241, 0.6);
    border-color: rgba(41, 144, 241, 0.8);
}

.name-input {
    max-width: 256px;
    width: 100%;
    height: 48px;
    background: transparent !important;
    border: none;
    border-bottom: 2px white solid;
    color: white;
    font-size: 1.1rem;
    margin-bottom: 6px;
    padding-left: 6px;
    outline: 0 !important;
}

.players {
    position: absolute;
    top: 8px;
    left: 8px;
}

.players h3 {
    margin: 0;
}

.pause {
    position: absolute;
    top: 8px;
    right: 8px;
}

.pause span {
    margin-left: 3px;
    margin-right: 3px;
    background: black;
}

.player-position
{
  /* position: absolute;
  top: 8px;
  right: 16px; */
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 1.1rem;
  z-index: 10;
}
</style>
