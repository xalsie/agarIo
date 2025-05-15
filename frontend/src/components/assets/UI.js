/** Class representing a group of pellets. */
export default class UI {
	constructor(p5, players, socket) {
		this.p5 = p5;
		this.players = players;
		this.socket = socket;
		console.log('UI initialized', this.socket);
		// This.font = font;
		this._c = false;
	}

	draw() {
		this.p5.push();

		// Draw size of player
		this.p5.textSize(24);
		this.p5.textAlign(this.p5.CENTER);
		// If (this.font) this.p5.textFont(this.font);
		this.p5.fill(255);
		this.p5.stroke(0);
		this.p5.strokeWeight(3);
		// If (this.socket && this.socket.id && this.players && this.players[this.socket.id]) {
		if (this.players[this.socket.id]) {
			this.p5.text(
				this.p5.floor(this.players[this.socket.id].Radius * 2),
				this.players[this.socket.id].pos.x,
				this.players[this.socket.id].pos.y - this.players[this.socket.id].Radius - 16,
			);
		}

		this.p5.pop();
	}

	loading() {
		console.log('loading...');
		if (this._c) {
			return;
		}

		this.p5.fill(0, 0, 0, 150);
		this.p5.noStroke();
		this.p5.rect(0, 0, this.p5.windowWidth, this.p5.windowHeight);

		// If (this.font) this.p5.textFont(this.font);
		this.p5.textSize(48);
		this.p5.fill(255);
		this.p5.stroke(0);
		this.p5.strokeWeight(2);
		this.p5.textAlign(this.p5.CENTER, this.p5.CENTER);
		this.p5.text('Loading...', this.p5.windowWidth / 2, this.p5.windowHeight / 2);

		this._c = !this._c;
	}
}
