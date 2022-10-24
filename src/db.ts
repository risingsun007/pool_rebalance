const { Pool, Client } = require("pg");
import { snakeToCamelJson, Swap, TradeConfig, changeKeyName } from "./utils";

export class DB {
    client: typeof Client;
    pool: typeof Pool;
    constructor(connectionString: string) {
        this.client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            }
        });
        this.pool = new Pool({
            connectionString, max: 1000,
            ssl: {
                rejectUnauthorized: false,
            }
        });
    }

    async getConfig() {
        const result = await this.pool.query("select * from config");
        changeKeyName(result.rows[0], 'slvt_buy_amount', 'buy_amt0');
        changeKeyName(result.rows[0], 'slvt_sell_amount', 'sell_amt0');
        snakeToCamelJson(result.rows[0]);
        return result.rows[0] as TradeConfig;
    }
}
