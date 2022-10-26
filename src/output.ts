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
        const sqlStr = `update trade_status set \
        last_evaluation_time = '${new Date().toISOString().slice(0, 19).replace('T', ' ')}', \
        num_orders_sent = ${numOrdersSent}, \
        num_errors_seen = ${numErrors}, \
        pool_price = ${poolPrice}, \
        silver_price = ${silverPrice}`;
        
        console.log(`sqlStr: ${sqlStr}`);
        return sqlStr;
    }
}