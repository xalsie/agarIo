import { createServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'

import {
  BLOCKS_COUNT,
  BLOBS_COUNT
} from './constants.js'
import { Blob, Block, Socket } from './lib/index.js'

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

setInterval(() => heartbeat(), 1500)
setInterval(() => {
  if (blobs.length > BLOBS_COUNT) return
  blobs.push(new Blob())
  io.sockets.emit("newBlob", {
    blob: blobs[blobs.length - 1]
  })
}, 1000)

// #region Variables
let players = {}
let blobs = []
let field = []
// #endregion

for (let i = 0; i < BLOCKS_COUNT; i++) {
  field.push([])
  for (let j = 0; j < BLOCKS_COUNT; j++) {
    field[i].push(new Block(i, j))
  }
}

for (let i = 0; i < BLOBS_COUNT; i++) {
  blobs.push(new Blob())
}

// Handle socket
Socket(io, players, field, blobs)

// Listen on port
server.listen(4000, () => {
  console.log('> [SERVER] Listening on port', "4000");
});

// Functions
function heartbeat() {
  // Send players to all sockets
  if (Object.keys(players).length == 0) return

  // console.log("> [LOG] Heartbeat :", Object.keys(players).length, "players");

  io.sockets.emit("heartbeat", {
    players: players
  })
}
