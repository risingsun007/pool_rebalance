import { json } from "stream/consumers";
import { isNonNullExpression } from "typescript";
import Web3 from "web3";

export const routerAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const MIN_TICK_RATIO = 4295128739;

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
    value?: string,
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
        console.log("set private key from environmental variable");
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
    if (process.env['HTTP_CONNECTOR']) {
        return process.env['HTTP_CONNECTOR'];
    } else {
        return "";
    }
}

