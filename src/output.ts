//import { Pool, Client } from 'pg';
const { Pool, Client } = require("pg");
import { Swap, UniV3Error } from './utils'
export class Output {
    client: typeof Client;

    constructor(host: string, port: number, user: string, password: string, database: string) {
        console.log(`${host}, ${port}, ${user}, ${password}, ${database}`);
        this.client = new Client({ host, port, user, password, database });

    }

    async initialize() {
        console.log(`initialize start`);
        await this.client.connect();
        console.log(`initialize end`);
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
        if (!result || result instanceof Error || !result.blockNumber) {
            await this.outputSwapErr(result);
        }

        const sqlStr = this.swapToSql(result);
        await this.sendQuery(sqlStr);
        console.log(`swap succeeded, swap: ${JSON.stringify(result, null, 2)}`);
        // TODO output error to database
    }






}