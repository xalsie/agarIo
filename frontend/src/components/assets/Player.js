import p5 from '../p5-instantiate';

const PLAYER_RADIUS = 16;
const FIELD_SIZE = 10000;

/** Class representing a Player. */
export default class Player {
	constructor({nick, id, color, bcolor, x, y}) {
		this.radius = PLAYER_RADIUS;
		this.Radius = PLAYER_RADIUS / 2;

		if (x && y) {
			this.pos = p5.createVector(x, y);
		} else {
			this.pos = p5.createVector(p5.random(0, FIELD_SIZE), p5.random(0, FIELD_SIZE));
		}

		// For enemy interpolation
		this.targetPos = this.pos.copy();
		this.lastUpdate = Date.now();

		this.velocity = p5.createVector(0, 0);
		this.mass = p5.PI * this.radius * this.radius;
		this.speed = 30 * (this.mass ** -0.2);
		this.points = [];

		this.nick = nick;
		this.id = id;
		this.block = [];

		this.COLOR = color;
		this.BORDER_COLOR = bcolor;

		this.angle = Math.random() * p5.TWO_PI;
	}

	/**
	* For enemy players: smoothly interpolate position toward targetPos
	* Call this in the main draw loop for all enemies
	*/
	interpolate(dt = 0.05) {
		// Only interpolate if not the local player
		if (!this.isLocal) {
			this.pos.x = p5.lerp(this.pos.x, this.targetPos.x, dt);
			this.pos.y = p5.lerp(this.pos.y, this.targetPos.y, dt);
		}
	}

	/**
	* Set the target position for interpolation (called on heartbeat)
	*/
	setTarget(x, y) {
		if (typeof x === 'number' && typeof y === 'number') {
			this.targetPos.x = x;
			this.targetPos.y = y;
			this.lastUpdate = Date.now();
		}
	}

	/**
	 * Create points for player's shape
	 * @function
	 */
	makePoints() {
		this.Radius = p5.lerp(this.Radius, this.radius, 0.1);

		this.points = [];

		for (let i = 0; i <= 360; i++) {
			const angle = p5.map(i, 0, 360, 0, p5.TWO_PI);
			const x = (this.Radius * p5.cos(angle)) + this.pos.x;
			const y = (this.Radius * p5.sin(angle)) + this.pos.y;

			this.points.push({
				x,
				y,
			});

			this.points[i].x = p5.constrain(this.points[i].x, 5, FIELD_SIZE - 5);
			this.points[i].y = p5.constrain(this.points[i].y, 5, FIELD_SIZE - 5);
		}
	}

	/**
	 * Draws player
	 * @function
	 */
	draw() {
		p5.fill(this.COLOR);
		p5.stroke(this.BORDER_COLOR);
		p5.strokeWeight(4);

		p5.beginShape();
		this.makePoints();
		this.points.forEach(p => {
			// p5.curveVertex(p.x, p.y);
			p5.vertex(p.x, p.y);
		});
		p5.endShape(p5.CLOSE);

		p5.textAlign(p5.CENTER, p5.CENTER);
		p5.fill(255);
		p5.stroke(0);
		p5.strokeWeight(1);
		// P5.textFont(font);
		p5.textSize(this.Radius / 1.5);
		p5.text(this.nick, this.pos.x, this.pos.y);
	}

	/**
	 * Locates player to the mouse position
	 * @function
	 */
	move() {
		const newVelocity = p5.createVector(p5.mouseX - (p5.windowWidth / 2), p5.mouseY - (p5.windowHeight / 2));

		// Update values
		this.mass = p5.PI * this.radius * this.radius;
		this.speed = 30 * (this.mass ** -0.2);
		newVelocity.setMag(this.speed * 0.95);

		this.velocity.lerp(newVelocity, 0.1);

		this.pos.x = p5.constrain(this.pos.x, 5, FIELD_SIZE - 5);
		this.pos.y = p5.constrain(this.pos.y, 5, FIELD_SIZE - 5);

		this.pos.add(this.velocity);
	}

	/**
	 * Returns true if player eats another blob
	 * @param {object} blob Blob object
	 */
	eats(blob) {
		// Let d = p5.Vector.dist(this.pos, blob.pos);
		const d = p5.dist(this.pos.x, this.pos.y, blob.pos.x, blob.pos.y);

		if (d < (this.radius - (blob.radius * 0.5)) && this.radius > blob.radius) {
			if (this.radius < blob.radius + 8) {
				return;
			}

			// A sum of 2 circles' area
			const sum
				= (p5.PI * this.radius * this.radius) + (p5.PI * blob.radius * blob.radius * 6);

			// R^2 = S / PI, then
			// R = square root of S / PI
			this.radius = p5.sqrt(sum / p5.PI);
			return true;
		}

		return false;
	}
}
