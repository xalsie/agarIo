import {
  BLOCKS_SIZE
} from '../constants.js'
// import { Blob } from './index.js'

class Block {
  constructor(row, col) {
    this.x = row * BLOCKS_SIZE // X pos
    this.y = col * BLOCKS_SIZE // Y pos
    this.players = {}
    this.row = row
    this.col = col
  }

  /*createBlobs() {
    for (let i = 0; i < BLOBS_COUNT; i++) {
      this.blobs.push(new Blob(this.x, this.y, `${this.row}${this.col}${i}`))
    }
  }*/
}

export {
  Block
}
