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

    async outputTradeStatus(numOrdersSent: number, numErrors: number, poolPrice: number, silverPrice: number) {
        console.log(`update trade_status \
        set last_evaluation_time = ${Date.now().toString()}, \
        set num_orders_sent = ${numOrdersSent}, \
        set num_errors_seen = ${numErrors}, \
        set pool_price = ${poolPrice} \
        set silver_price = ${silverPrice}`
    }
}