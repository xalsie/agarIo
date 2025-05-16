import {
	FIELD_SIZE,
	BLOB_RADIUS,
} from '../constants.js';
import {random, randomColor} from './index.js';

let BLOB_ID = 0;

class Blob {
	constructor() {
		this.x = random(0, FIELD_SIZE); // X pos
		this.y = random(0, FIELD_SIZE); // Y pos
		this.r = random(BLOB_RADIUS, BLOB_RADIUS * 1.3); // Radius
		this.c = randomColor().body;
		this.id = BLOB_ID++;
	}
}

export {
	Blob,
};
