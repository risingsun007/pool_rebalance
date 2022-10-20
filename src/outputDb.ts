const { Pool, Client } = require("pg");
import { Swap, UniV3Error } from './utils';
import { Output } from './output';
export class OutputDb extends Output {
    client: typeof Client;

    constructor(connectionString: string) {
        super();
        this.client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            }
        });
    }

    async initialize() {
        super.initialize();
        await this.client.connect();
        console.log('connected to db successfully');
    }

    private async sendQuery(sqlStr: string) {
        const result = this.client.query(sqlStr);
    }

    private async outputSwapErr(result: any) {
        let err: UniV3Error = {
            time: Date.now(),
            msg: "",
            type: "Swap"
        }

        if (!result) {
            err.msg = "no MessageReceived";
        } else if (result instanceof Error) {
            err.msg = result.message;
        } else {
            err.msg = JSON.stringify(result, null, 2);
        }
        console.log(` error with swap: ${JSON.stringify(err)}`);
        //output to error database
    }

    private swapToSql(x: any) {
        let sqlStr = "INSERT INTO swaps  values (";
        sqlStr += `${x.time},${x.amount0},${x.amount1},${x.sqrtPriceX96},${x.liquidity},${x.tick},${x.price},`;
        sqlStr += `'${x.hash}','${x.blockNumber}','${x.token0}','${x.token1}','${x.pool}')`;
        return sqlStr;
    }

    async outputSwap(result: Error | Swap): Promise<void> {
        super.outputSwap(result);
        if (!result || result instanceof Error || !result.blockNumber) {
            console.log("didn't find swap");
            await this.outputSwapErr(result);
        }
        const sqlStr = this.swapToSql(result);
        await this.sendQuery(sqlStr);
    }
}