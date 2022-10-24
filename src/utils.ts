import Web3 from "web3";

export const routerAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const MIN_TICK_RATIO = 4295128739;
export const SWAP_EVENT_HASH = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";

export interface DbInfo {
    host: string,
    database: string,
    user: string,
    port: number,
    password: string
};

export interface TradeConfig {
    targetSellPrct: number;
    targetBuyPrct: number;
    minMillSecBetweenTrades: number;
    sleepTimeMillSec: number;
    maxNumErrors: number;
    maxNumTrades: number;
    doMakeTrades: boolean;
    buyAmt0: number;
    sellAmt0: number;
}

export const SWAPV3_EVENT_ABI = [{
    type: 'uint256',
    name: 'eventHash',
    indexed: true
}, {
    type: 'address',
    name: 'sender',
    indexed: true
}, {
    type: 'address',
    name: 'recipient',
    indexed: true
}, {
    type: 'int256',
    name: 'amount0'
}, {
    type: 'int256',
    name: 'amount1'
}, {
    type: 'uint160',
    name: 'sqrtPriceX96'
}, {
    type: 'uint128',
    name: 'liquidity',
}, {
    type: 'int24',
    name: 'tick',
}];

export interface Swap {
    time: number,
    amount0: number,
    amount1: number,
    sqrtPriceX96: number,
    liquidity: number,
    tick: number,
    price: number,
    hash: string,
    blockNumber: number,
    token0: string,
    token1: string,
    pool: string
};

export interface UniV3Error {
    time: number,
    type: string,
    msg: string
};

export function trimHex(str: string): string {
    if (str && str.length > 4 && str.search("0x") >= 0) {
        return str.trim().slice(2);
    }
    return str;
}
export interface TxInfo {
    from: string,
    gas: number,
    maxPriorityFeePerGas: number,
    maxFeePerGas: number,
    value?:  string,
    to?: string,
}

export function sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function gweiToEth(x: number): number {
    return x * 10 ** 9;
}

export function getAccountFromKey(privateKey: string) {
    const web3 = new Web3(new Web3.providers.HttpProvider(""));
    return web3.eth.accounts.privateKeyToAccount(privateKey).address;
}

export function noExp(input: any) {
    let str: string;
    if (typeof (input) === 'number') {
        str = String(input);
    } else {
        str = input;
    }

    if (str.indexOf('e+') === -1) {

        if (str.indexOf('.') != -1)
            str = String(Math.floor(Number(str)))
        return str;
    }

    // if number is in scientific notation, pick (b)ase and (p)ower
    str = str.replace('.', '').split('e+').reduce(function (b: any, p: any) {
        return b + Array(p - b.length + 2).join('0');
    });
    return str;
}

export function getPrivateKey() {
    if (process.env['PRIVATE_KEY']) {
        return process.env['PRIVATE_KEY'];
    } else {
        //console.log("get private key from .env ");
        require('dotenv').config()
        if (process.env.PRIVATE_KEY) {
            return process.env.PRIVATE_KEY;
        } else {
            return "";
        }
    }
}

export async function getTheoSlvtPrice() {
    try {
        let result = await fetch("https://silvertoken-backend.herokuapp.com/api/price/silver")
        return (await result.json()).price;
    } catch (e) {
        console.log(`getTheoSlvtPrice failed with ${e}`);
        return -99;
    }
}

export function getHttpConnector() {
    return getEnv('HTTP_CONNECTOR');
}

export function getEnv(x: string): string {
    if (x in process.env) {
        return process.env[x] || "";
    } else {
        console.log(`Did not find environmental variable ${x}`);
        console.log(`Please define ${x}`);
        return "";
    }
}

function snakeToCamel(str: any) {
    return str.toLowerCase().replace(/([-_][a-z])/g, (x: any) =>
        x.toUpperCase()
            .replace('-', '')
            .replace('_', '')
    )
}

export function changeKeyName(obj: any, from: string, to: string) {
    console.log(`zzz = ${to}`);
    Object.keys(obj).forEach((y: any) => {
        if(y===from){
            obj[to] = obj[from];
            delete obj[from];
            return;
        }
    });
}

export function snakeToCamelJson(x: any) {
    Object.keys(x).forEach((y: any) => {
        console.log(snakeToCamel(y))
        x[snakeToCamel(y)] = x[y];
        delete x[y];
    });
}
