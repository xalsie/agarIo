import p5 from '../p5-instantiate';

const FIELD_SIZE = 10000;
const BLOB_RADIUS = 5;

/** Class representing a blob. */
export default class Blob {
	constructor({x, y, r, c, id}) {
		this.pos = p5.createVector(x, y);
		this.radius = p5.floor(r);
		this.color = c;
		this.id = id;
	}

	randomColor = () => {
		const color = p5.floor(p5.random(360));
		const body = `hsla(${color}, 100%, 50%, 1)`;
		const border = `hsla(${color}, 100%, 35%, 1)`;

		return {
			body,
			border,
		};
	};

	/**
	 * Draws blob
	 * @function
	 */
	draw() {
		p5.fill(this.color);
		p5.noStroke();

		p5.ellipse(this.pos.x, this.pos.y, this.radius * 2);
	}
}
