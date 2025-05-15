/**
 * Create random bright contrast color
 * @function
 */
function randomColor() {
	const color = Math.floor(random(0, 360));
	const body = `hsla(${color}, 100%, 50%, 1)`;
	const border = `hsla(${color}, 100%, 35%, 1)`;

	return {
		body,
		border,
	};
}

/**
 * Returns random num between 'min' and 'max'
 * @param {number} min Minimum
 * @param {number} max Maximum
 */
// const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const random = (min, max) => {
	const random = Math.random() * (max - min + 1);
	return Math.floor(random + min);
};

export {
	random,
	randomColor,
};
