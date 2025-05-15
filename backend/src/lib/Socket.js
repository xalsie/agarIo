import {Player} from './index.js';

/* Function getNeighbourBlobs(posX, posY) {
	let neighbourBlobs = field[posX][posY].blobs.concat(
		field[posX - 1] && field[posX - 1][posY - 1] ? field[posX - 1][posY - 1].blobs : [],
		field[posX] && field[posX][posY - 1] ? field[posX][posY - 1].blobs : [],
		field[posX + 1] && field[posX + 1][posY - 1] ? field[posX + 1][posY - 1].blobs : [],

		field[posX - 1] && field[posX - 1][posY] ? field[posX - 1][posY].blobs : [],
		field[posX + 1] && field[posX + 1][posY] ? field[posX + 1][posY].blobs : [],

		field[posX - 1] && field[posX - 1][posY + 1] ? field[posX - 1][posY + 1].blobs : [],
		field[posX] && field[posX][posY + 1] ? field[posX][posY + 1].blobs : [],
		field[posX + 1] && field[posX + 1][posY + 1] ? field[posX + 1][posY + 1].blobs : [],
	)

	// let neighbourBlobs = []

	// if (field[posX - 1] && field[posX - 1][posY - 1])
	//   neighbourBlobs.push(field[posX - 1][posY - 1].blobs)
	// if (field[posX] && field[posX][posY - 1])
	//   neighbourBlobs.push(field[posX][posY - 1].blobs)
	// if (field[posX + 1] && field[posX + 1][posY - 1])
	//   neighbourBlobs.push(field[posX + 1][posY - 1].blobs)

	// if (field[posX - 1] && field[posX - 1][posY])
	//   neighbourBlobs.push(field[posX - 1][posY].blobs)
	// if (field[posX + 1] && field[posX + 1][posY])
	//   neighbourBlobs.push(field[posX + 1][posY].blobs)

	// if (field[posX - 1] && field[posX - 1][posY + 1])
	//   neighbourBlobs.push(field[posX - 1][posY + 1].blobs)
	// if (field[posX] && field[posX][posY + 1])
	//   neighbourBlobs.push(field[posX][posY + 1].blobs)
	// if (field[posX + 1] && field[posX + 1][posY + 1])
	//   neighbourBlobs.push(field[posX + 1][posY + 1].blobs)

	return neighbourBlobs
} */

/**
 * Finds index of block, that should contain player
 * @param {number} x X position of the player
 * @param {number} y Y position of the player
 * @param {Array} field The field array
 */
// function findBlock(x, y, field) {
// 	let pos = 0;

// 	for (let i = 0; i < BLOCKS_COUNT; i++) {
// 		pos = field[i].findIndex(block => {
// 			const xConstrain = block.x <= x && x <= block.x + BLOCKS_SIZE;
// 			const yConstrain = block.y <= y && y <= block.y + BLOCKS_SIZE;

// 			return xConstrain && yConstrain;
// 		});

// 		if (pos !== -1) {
// 			return [i, pos];
// 		}
// 	}

// 	return false;

// 	/* Let pos = [
// 	Math.floor((BLOCKS_COUNT * BLOCKS_SIZE) / x),
// 	Math.floor((BLOCKS_COUNT * BLOCKS_SIZE) / y)
// 	]

//   return pos */
// }

// Updated Socket for channel system
function Socket(io, channels, createPrivateChannel) {
	io.sockets.on('connection', socket => {
		console.log('> [LOG] New client:', `${socket.id}`);

		// Listen for joinChannel event
		socket.on('joinChannel', data => {
			const {channelId} = data;
			const {code} = data;
			let channel;
			if (code) {
				// Private channel
				channel = channels[`private_${code}`] || createPrivateChannel(code);
			} else {
				channel = channels[channelId];
			}

			if (!channel) {
				socket.emit('error', {message: 'Channel not found.'});
				return;
			}

			// Log the connection with channel
			console.log(`> [CHANNEL] Client ${socket.id} joined channel: ${channel.id}`);
			socket.join(`channel_${channel.id}`);
			// Add player to channel
			const player = new Player({
				x: data.x,
				y: data.y,
				r: data.r,
				b: data.b,
				bc: data.bc,
				n: data.n,
				id: socket.id,
			});
			channel.players[socket.id] = player;
			// Send initial state
			socket.emit('start', {
				players: channel.players,
				blobs: channel.blobs,
			});
			// Notify others
			socket.to(`channel_${channel.id}`).emit('newPlayer', player);

			// Handle updates for this channel
			socket.on('update', updateData => {
				if (!channel.players[socket.id]) {
					return;
				}

				channel.players[socket.id].x = updateData.x;
				channel.players[socket.id].y = updateData.y;
				channel.players[socket.id].r = updateData.r;
			});

			socket.on('eatBlob', i => {
				if (typeof i !== 'number') {
					return;
				}

				channel.blobs.splice(i, 1);
				io.to(`channel_${channel.id}`).emit('removeBlob', {i, id: socket.id});
			});

			socket.on('removePlayer', id => {
				delete channel.players[id];
				io.to(`channel_${channel.id}`).emit('removePlayer', {id, eater: socket.id});
			});

			socket.on('disconnect', () => {
				delete channel.players[socket.id];

				if (Object.keys(channel.players).length === 0 && channel.isPrivate) {
					delete channels[channel.id];
				}

				socket.to(`channel_${channel.id}`).emit('removePlayer', {id: socket.id});
			});
		});

		// (Old per-player logic removed; all per-channel logic is now handled in joinChannel)
	});
}

export {
	Socket,
};
