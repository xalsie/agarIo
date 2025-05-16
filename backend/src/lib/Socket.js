import {Player} from './index.js';

function Socket(io, channels, createPrivateChannel) {
	io.sockets.on('connection', socket => {
		console.log('> [LOG] New client:', `${socket.id}`);

		socket.on('joinChannel', data => {
			const {channelId} = data;
			const {code} = data;
			let channel;
			if (code) {
				channel = channels[`private_${code}`] || createPrivateChannel(code);
			} else {
				channel = channels[channelId];
			}

			if (!channel) {
				socket.emit('error', {message: 'Channel not found.'});
				return;
			}

			console.log(`> [CHANNEL] Client ${socket.id} joined channel: ${channel.id}`);
			socket.join(`${channel.id}`);

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

			socket.emit('start', {
				players: channel.players,
				blobs: channel.blobs,
			});
			socket.to(`${channel.id}`).emit('newPlayer', player);

			socket.on('update', updateData => {
				if (!channel.players[socket.id]) {
					return;
				}

				channel.players[socket.id].x = updateData.x;
				channel.players[socket.id].y = updateData.y;
				channel.players[socket.id].r = updateData.r;
			});

			socket.on('eatBlob', blobId => {
				const idx = channel.blobs.findIndex(b => b.id === blobId);
				if (idx === -1) {
					return;
				}

				channel.blobs.splice(idx, 1);
				io.in(`${channel.id}`).emit('removeBlob', {blobId, id: socket.id});
			});

			socket.on('removePlayer', id => {
				const eater = channel.players[socket.id];
				const eaten = channel.players[id];
				if (eater && eaten && eater.id !== eaten.id) {
					const sum = (Math.PI * eater.r * eater.r) + (Math.PI * eaten.r * eaten.r * 6);
					eater.r = Math.sqrt(sum / Math.PI);
				}

				delete channel.players[id];
				io.to(`${channel.id}`).emit('removePlayer', {id, eater: socket.id});
			});

			socket.on('disconnect', () => {
				delete channel.players[socket.id];

				if (Object.keys(channel.players).length === 0 && channel.isPrivate) {
					delete channels[channel.id];
				}

				socket.to(`${channel.id}`).emit('removePlayer', {id: socket.id});
			});
		});
	});
}

export {
	Socket,
};
