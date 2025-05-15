import p5 from '../p5-instantiate';

const FIELD_SIZE = 10000;
const BLOB_RADIUS = 5;

/** Class representing a blob. */
export default class Blob {
    constructor(x, y, r, c, id) {
        if (x && y) {
            this.pos = p5.createVector(x, y);
            this.radius = p5.floor(r);
            this.color = c;
        } else {
            this.pos = p5.createVector(p5.random(0, FIELD_SIZE), p5.random(0, FIELD_SIZE));
            this.radius = p5.floor(p5.random(BLOB_RADIUS, BLOB_RADIUS * 1.3));
            this.color = this.randomColor().body;
        }
    }

    randomColor = () => {
        let color = p5.floor(p5.random(360));
        let body = `hsla(${color}, 100%, 50%, 1)`;
        let border = `hsla(${color}, 100%, 35%, 1)`;

        return {
            body: body,
            border: border,
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