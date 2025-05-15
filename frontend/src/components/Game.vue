<script setup>
import { onMounted, ref } from "vue";
import { io } from "socket.io-client";
import p5 from "./p5-instantiate";
import { Blob, Grid, Player, UI } from "./assets/index";

const VUE_APP_API_URL = "http://localhost:4000";

const playerCount = ref(0);
const playerPosition = ref({ x: 0, y: 0 });
const showMenu = ref(true);

// Channel selection state
const selectedChannel = ref('1');
const privateCode = ref('');
const usePrivate = ref(false);

// Leaderboard state
const leaderboard = ref([]);

let w = window.innerWidth;
let h = window.innerHeight;

const PLAYER_RADIUS = 16;
const FIELD_SIZE = 10000;
const GRID_SIZE = 40;
const BLOCKS_COUNT = Math.ceil(FIELD_SIZE / 10);
const BLOCKS_SIZE = FIELD_SIZE / BLOCKS_COUNT;

const BLOBS_COUNT = FIELD_SIZE / 1.25;
const BLOB_RADIUS = 5;

let players = {};
let ui, grid;
let blobs = [];
let paused = true;
let gameStarted = false;
let zoom = 1;

let socket = null;

const fps = ref(0);
let lastFpsUpdate = 0;
let lastPlayerPos = { x: 0, y: 0 };

function randomColor() {
    const color = p5.floor(p5.random(360));
    return {
        body: `hsla(${color}, 100%, 50%, 1)`,
        border: `hsla(${color}, 100%, 35%, 1)`,
    };
}

function connectToServer(nick) {
    if (!socket) {
        socket = io(VUE_APP_API_URL);
        setupSocketEvents();
    }
    const color = randomColor();

    ui = new UI(p5, players, socket);

    const player = new Player({
        nick,
        id: socket.id,
        color: color.body,
        bcolor: color.border,
        x: p5.random(0, FIELD_SIZE),
        y: p5.random(0, FIELD_SIZE),
    });
    let channelId = usePrivate.value ? undefined : selectedChannel.value;
    let code = usePrivate.value ? privateCode.value.trim() : undefined;
    if (usePrivate.value && !code) {
        alert('Veuillez entrer un code de salon privé.');
        return;
    }
    if (!usePrivate.value && !channelId) {
        alert('Veuillez sélectionner un channel.');
        return;
    }
    socket.emit("joinChannel", {
        channelId,
        code,
        x: player.pos.x,
        y: player.pos.y,
        r: player.radius,
        b: player.COLOR,
        bc: player.BORDER_COLOR,
        n: player.nick,
    });
    showMenu.value = false;

    socket.on("heartbeat", (data) => {
        for (let id in data.players) {
            if (players[id]) {
                // For local player, update radius and block only
                if (id === socket.id) {
                    players[id].radius = data.players[id].r;
                    players[id].block = [
                        data.players[id].block.row,
                        data.players[id].block.col,
                    ];
                } else {
                    // For enemies, set target for interpolation and update radius
                    players[id].setTarget(data.players[id].x, data.players[id].y);
                    players[id].radius = data.players[id].r;
                }
            }
        }
        playerCount.value = Object.keys(data.players).length;
        // Sync leaderboard from backend data
        leaderboard.value = Object.values(data.players)
            .filter(p => p && p.n)
            .sort((a, b) => b.r - a.r)
            .slice(0, 10)
            .map(p => ({ nick: p.n, score: p5.floor(p.r * 2) }));
    });

    socket.on("newPlayer", (data) => {
        players[data.id] = new Player({
            nick: data.n,
            id: data.id,
            color: data.b,
            bcolor: data.bc,
            x: data.x,
            y: data.y
        });
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
        blobs.push(
            new Blob({
                x: data.x,
                y: data.y,
                r: data.r,
                c: data.c
            })
        );
    });

    socket.on("disconnect", () => {
        gameStarted = false;
        paused = true;
        showMenu.value = true;
        players = {};
        blobs = [];
    });
}

function handleConnect() {
    const nick = document.getElementById("nick").value;
    if (!nick) {
        alert('Veuillez entrer un pseudo.');
        return;
    }
    connectToServer(nick);
}

function windowResized() {
    w = window.innerWidth;
    h = window.innerHeight;
    p5.resizeCanvas(w, h);
}

p5.setup = () => {
    p5.createCanvas(w, h);
    // ui = new UI(p5, players, socket);
    grid = new Grid(GRID_SIZE);
    grid.draw({
        viewportX: w / 2,
        viewportY: h / 2,
        viewportW: w,
        viewportH: h,
        zoom: 1,
    });
};

p5.draw = () => {
    // FPS update throttled to 1s for less DOM update
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        const newFps = Math.round(p5.frameRate());
        if (fps.value !== newFps) fps.value = newFps;
        lastFpsUpdate = now;
    }
    if (!gameStarted) {
        p5.clear();
        // Optimized grid draw: only visible lines
        grid.draw({
            viewportX: w / 2,
            viewportY: h / 2,
            viewportW: w,
            viewportH: h,
            zoom: 1,
        });
        for (let i = 0, len = blobs.length; i < len; i++) {
            if (blobs[i]) blobs[i].draw();
        }
        for (const id in players) {
            players[id].draw();
        }
        p5.fill(0, 0, 0, 120);
        p5.noStroke();
        p5.rect(0, 0, w, h);
        return;
    }
    // Defensive: check socket and players[socket.id] before using
    if (!socket || !players || !players[socket.id]) {
        if (ui && typeof ui.loading === 'function') return ui.loading();
        return;
    }
    p5.clear();
    p5.translate(w / 2, h / 2);
    let player = players[socket.id];
    let newZoom = p5.sqrt(h / ((player && player.radius ? player.radius : PLAYER_RADIUS) * 8));
    zoom = p5.lerp(zoom, Math.max(newZoom, 0.7), 0.1);
    p5.scale(zoom);
    if (player && player.pos) {
        p5.translate(-player.pos.x, -player.pos.y);
        // Optimized grid draw: only visible lines
        grid.draw({
            viewportX: player.pos.x,
            viewportY: player.pos.y,
            viewportW: w,
            viewportH: h,
            zoom: zoom,
        });
    } else {
        p5.translate(0, 0);
        grid.draw({
            viewportX: 0,
            viewportY: 0,
            viewportW: w,
            viewportH: h,
            zoom: zoom,
        });
    }
    // --- OPTIMIZED BLOBS RENDERING: only draw visible blobs ---
    const viewX = player && player.pos ? player.pos.x : 0;
    const viewY = player && player.pos ? player.pos.y : 0;
    const viewW = w / zoom;
    const viewH = h / zoom;
    // Cache visible area for blobs
    const minBlobX = viewX - viewW / 2 - BLOB_RADIUS;
    const maxBlobX = viewX + viewW / 2 + BLOB_RADIUS;
    const minBlobY = viewY - viewH / 2 - BLOB_RADIUS;
    const maxBlobY = viewY + viewH / 2 + BLOB_RADIUS;
    for (let i = blobs.length - 1; i >= 0; i--) {
        const blob = blobs[i];
        if (!blob) continue;
        const bx = blob.pos.x, by = blob.pos.y;
        if (bx < minBlobX || bx > maxBlobX || by < minBlobY || by > maxBlobY) continue;
        blob.draw();
        if (player && typeof player.eats === 'function' && player.eats(blob)) {
            socket.emit("eatBlob", i);
            blobs.splice(i, 1);
        }
    }
    p5.stroke(100, 100, 150, 10);
    p5.strokeWeight(8);
    p5.noFill();
    p5.rect(0, 0, FIELD_SIZE, FIELD_SIZE);
    ui.draw();
    // --- OPTIMIZED PLAYERS RENDERING: only draw visible players ---
    // Cache visible area for players
    const minPlayerX = viewX - viewW / 2 - PLAYER_RADIUS;
    const maxPlayerX = viewX + viewW / 2 + PLAYER_RADIUS;
    const minPlayerY = viewY - viewH / 2 - PLAYER_RADIUS;
    const maxPlayerY = viewY + viewH / 2 + PLAYER_RADIUS;
    for (const id in players) {
        const p = players[id];
        if (!p || !p.pos) continue;
        // Mark local player for interpolation logic
        p.isLocal = (id === socket.id);
        // Interpolate enemy movement
        if (!p.isLocal && typeof p.interpolate === 'function') {
            p.interpolate(0.05); // dt controls smoothing
        }
        const px = p.pos.x, py = p.pos.y;
        if (px < minPlayerX || px > maxPlayerX || py < minPlayerY || py > maxPlayerY) continue;
        p.draw();
        if (id !== socket.id && player && typeof player.eats === 'function' && player.eats(p) && p) {
            delete players[id];
            socket.emit("removePlayer", id);
        }
        if (id === socket.id && !paused && player) {
            if (typeof player.move === 'function') player.move();
            socket.emit("update", {
                x: player.pos.x,
                y: player.pos.y,
                r: player.radius,
            });
        }
    }
    // Only update playerPosition ref if changed
    // Only update playerPosition ref if changed, throttle to 100ms
    if (player && player.pos) {
        const px = Math.round(player.pos.x);
        const py = Math.round(player.pos.y);
        if (!p5._lastPosUpdate || now - p5._lastPosUpdate > 100) {
            if (lastPlayerPos.x !== px || lastPlayerPos.y !== py) {
                playerPosition.value = { x: px, y: py };
                lastPlayerPos.x = px;
                lastPlayerPos.y = py;
            }
            p5._lastPosUpdate = now;
        }
    }
};

onMounted(() => {
    window.addEventListener("resize", windowResized);
});

// Socket events
function setupSocketEvents() {
    if (!socket) return;
    socket.on("blobs", (data) => {
        if (data && Array.isArray(data.blobs)) {
            blobs = data.blobs.map((b) => new Blob({
                x: b.x,
                y: b.y,
                r: b.r,
                c: b.c,
            }));
        } else {
            blobs = [];
        }
        showMenu.value = true;
    });

    socket.on("start", (data) => {
        for (let id in data.players) {
            let p = data.players[id];
            players[id] = new Player({
                nick: p.n,
                id: p.id,
                color: p.b,
                bcolor: p.bc,
                x: p.x,
                y: p.y,
            });
            players[id].block = [p.block.row, p.block.col];
        }
        blobs = data.blobs
            .map((b) => b && new Blob({
                x: b.x,
                y: b.y,
                r: b.r,
                c: b.c,
            }))
            .filter(Boolean);
        gameStarted = true;
        paused = false;
    });
}
</script>

<template>
    <div>
        <div id="leaderboard" class="leaderboard">
            <h3>Leaderboard</h3>
            <ol>
                <li v-for="(entry, i) in leaderboard" :key="i">
                    <span>{{ i + 1 }}. {{ entry.nick }} ({{ entry.score }})</span>
                </li>
            </ol>
        </div>

        <div id="playersStats" class="players player-position">
            <div v-if="playerPosition" class="flex flex-col items-center">
                <div class="fps-counter">
                    FPS: <span>{{ fps }}</span>
                </div>
                <div>
                    Players: <span>{{ playerCount }}</span>
                </div>
                <div>
                    <span>Position X: {{ playerPosition.x }}</span>
                </div>
                <div>
                    <span>Position Y: {{ playerPosition.y }}</span>
                </div>
            </div>
        </div>

        <div id="menu" v-show="showMenu" class="game-menu bg-red-500 rounded-lg p-4">
            <h1 class="game-header">agario.js</h1>
            <input type="text" placeholder="Nickname" id="nick" required class="name-input" />
            <div class="channel-select">
                <label>
                    <input type="radio" v-model="usePrivate" :value="false" />
                    Public
                </label>
                <select v-if="!usePrivate" v-model="selectedChannel" class="channel-dropdown">
                    <option v-for="i in 5" :key="i" :value="String(i)">Channel {{ i }}</option>
                </select>
                <label style="margin-left:16px;">
                    <input type="radio" v-model="usePrivate" :value="true" />
                    Privé
                </label>
                <input v-if="usePrivate" v-model="privateCode" type="text" maxlength="16" placeholder="Code privé" class="private-code-input" />
            </div>
            <button @click="handleConnect" class="connect-btn btn" style="margin-top:12px;">connect</button>
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

.player-position {
    /* position: absolute;
  top: 8px;
  right: 16px; */
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 1.1rem;
    z-index: 10;
}

.fps-counter {
    margin-bottom: 8px;
    font-size: 1rem;
    color: #aaffaa;
    text-shadow: 1px 1px 2px #000;
}

.leaderboard {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 10px 18px 10px 18px;
    border-radius: 10px;
    font-size: 1.1rem;
    z-index: 20;
    min-width: 180px;
    margin-bottom: 8px;
}
.leaderboard h3 {
    margin: 0 0 6px 0;
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
    letter-spacing: 1px;
}
.leaderboard ol {
    list-style: none;
    padding: 0;
    margin: 0;
}
.leaderboard li {
    margin: 0 0 2px 0;
    padding: 0;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
/* Channel selection styles */
.channel-select {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    gap: 8px;
}
.channel-dropdown {
    margin-left: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #ccc;
    font-size: 1rem;
}
.private-code-input {
    margin-left: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #ccc;
    font-size: 1rem;
    width: 120px;
}
</style>
