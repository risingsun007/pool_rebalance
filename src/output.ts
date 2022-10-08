const { Pool, Client } = require("pg");
import { Swap, UniV3Error } from './utils'
export class Output {
    constructor() {
    }

    async initialize() {
    }

    async outputSwap(result: Error | Swap): Promise<void> {
        console.log(`swap result: ${JSON.stringify(result, null, 2)}`);
    }
}