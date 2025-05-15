import {createServer} from 'node:http';
import express from 'express';
import {Server} from 'socket.io';
import cors from 'cors';

import {BLOCKS_COUNT, BLOBS_COUNT} from './constants.js';
import {Blob, Block, Socket as socket} from './lib/index.js';

const PORT = 4000;
// const ORIGIN = 'http://localhost:5173';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
		credentials: true,
	},
});

// Heartbeat per channel
setInterval(() => {
	for (const c in channels) {
		if (Object.hasOwn(channels, c)) {
			// console.log(`> [CHANNEL] Heartbeat for channel: ${c}`);
			if (Object.keys(channels[c].players).length === 0) {
				// console.log(`> [CHANNEL] No players in channel: ${c}`);
				continue;
			}

			// console.log(`> [CHANNEL] Heartbeat for channel: ${c}`, `Players: ${Object.keys(channels[c].players).length}`);
			heartbeat(c);
		}
	}
}, 750);

// Add blobs to each channel
setInterval(() => {
	for (const c in channels) {
		if (Object.hasOwn(channels, c)) {
			if (Object.keys(channels[c].players).length === 0) {
				// console.log(`> [CHANNEL] No players in channel: ${c}`, 'No blobs added');
				continue;
			}

			const channel = channels[c];
			if (channel.blobs.length > BLOBS_COUNT) {
				continue;
			}

			const newBlob = new Blob();
			channel.blobs.push(newBlob);
			io.to(`channel_${c}`).emit('newBlob', {
				blob: newBlob,
			});
		}
	}
}, 1000);

// #region Channel System
const channels = {};
const MAX_CHANNELS = 5;
for (let i = 1; i <= MAX_CHANNELS; i++) {
	channels[i] = {
		id: i,
		name: `Channel ${i}`,
		players: {},
		blobs: [],
		field: [],
		isPrivate: false,
		code: null,
	};
}

// Private channel creation
function createPrivateChannel(code) {
	const id = `private_${code}`;
	if (channels[id]) {
		return null;
	} // Already exists

	channels[id] = {
		id,
		name: `Private ${code}`,
		players: {},
		blobs: [],
		field: [],
		isPrivate: true,
		code,
	};

	const c = id;
	for (let i = 0; i < BLOCKS_COUNT; i++) {
		channels[c].field[i] ||= [];

		for (let j = 0; j < BLOCKS_COUNT; j++) {
			channels[c].field[i][j] = new Block(i, j);
		}
	}

	for (let i = 0; i < BLOBS_COUNT; i++) {
		channels[c].blobs.push(new Blob());
	}

	return channels[id];
}
// #endregion

// Init default channels' fields and blobs
for (const c in channels) {
	if (Object.hasOwn(channels, c)) {
		for (let i = 0; i < BLOCKS_COUNT; i++) {
			channels[c].field[i] ||= [];

			for (let j = 0; j < BLOCKS_COUNT; j++) {
				channels[c].field[i][j] = new Block(i, j);
			}
		}

		for (let i = 0; i < BLOBS_COUNT; i++) {
			channels[c].blobs.push(new Blob());
		}
	}
}

// Handle socket, pass channels and private channel creation
socket(io, channels, createPrivateChannel);

// Listen on port
server.listen(PORT, () => {
	console.log('> [SERVER] Listening on port', PORT);
});

// Functions
// Heartbeat for a specific channel
function heartbeat(channelId) {
	const ch = channels[channelId];
	if (!ch || Object.keys(ch.players).length === 0) {
		return;
	}

	io.to(`channel_${channelId}`).emit('heartbeat', {
		players: ch.players,
		leaderboard: Object.values(ch.players)
			.sort((a, b) => (b.r || 0) - (a.r || 0))
			.slice(0, 10)
			.map(p => ({id: p.id, name: p.n, score: p.r || 0})),
	});
}
