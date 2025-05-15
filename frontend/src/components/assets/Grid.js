import p5 from '../p5-instantiate';

const FIELD_SIZE = 10000;

/** Class representing a Food. */
export default class Grid {
    constructor(size) {
        console.log("loading grid");
        this.size = size;
    }

    /**
     * Draws grid
     * @function
     */
    draw() {
        // console.log("Drawing grid");
        p5.stroke(100, 100, 150, 32);
        p5.strokeWeight(1);

        for (let i = 0; i < FIELD_SIZE / this.size; i++) {
            p5.line(0, this.size * i, FIELD_SIZE, this.size * i);
        }

        for (let i = 0; i < FIELD_SIZE / this.size; i++) {
            p5.line(this.size * i, 0, this.size * i, FIELD_SIZE);
        }
    }
}
