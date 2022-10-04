import { isNonNullExpression } from "typescript";

export const routerAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const MIN_TICK_RATIO = 4295128739;

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

