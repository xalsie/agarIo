import p5 from '../p5-instantiate';

const FIELD_SIZE = 10000;

/** Class representing a Food. */
export default class Grid {
	constructor(size) {
		console.log('loading grid');
		this.size = size;
	}

	/**
     * Draws grid
     * @function
     */
	draw({viewportX, viewportY, viewportW, viewportH, zoom = 1}) {
		p5.stroke(100, 100, 150, 32);
		p5.strokeWeight(1);
		// Calculate visible grid lines only
		const minX = Math.max(0, Math.floor((viewportX - (viewportW / 2 / zoom)) / this.size));
		const maxX = Math.min(Math.ceil((viewportX + (viewportW / 2 / zoom)) / this.size), FIELD_SIZE / this.size);
		const minY = Math.max(0, Math.floor((viewportY - (viewportH / 2 / zoom)) / this.size));
		const maxY = Math.min(Math.ceil((viewportY + (viewportH / 2 / zoom)) / this.size), FIELD_SIZE / this.size);

		for (let i = minY; i < maxY; i++) {
			p5.line(0, this.size * i, FIELD_SIZE, this.size * i);
		}

		for (let i = minX; i < maxX; i++) {
			p5.line(this.size * i, 0, this.size * i, FIELD_SIZE);
		}
	}
}
