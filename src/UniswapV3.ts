const poolV3Abi = require("../ABI/poolV3.json");
const routerV3Abi = require("../ABI/routerV3.json");
const factoryV3Abi = require("../ABI/factoryV3.json");
const Web3 = require('web3');
const JSBI = require('jsbi');
import { TxInfo, noExp, MIN_TICK_RATIO, trimHex } from "./utils";
//const poolAddress = "0x72ed3F74a0053aD35b0fc8E4E920568Ca22781a8"; SLVT/USDC 1% pool
const routerAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const Provider = require('@truffle/hdwallet-provider');

export interface UniV3Config {
    httpConnector: string,
    token0: string;
    token1: string;
    tokenDec0: number;
    tokenDec1: number;
    buyAmtToken0: number;
    sellAmtToken0: number;
    privateKey: string;
    targetSellPrct: number;
    targetBuyPrct: number;
    minMillSecBetweenTrades: number;
    sleepTimeMillSec: number;
    feeLevel: number;
    maxPriorityFeePerGas: number;
    maxFeePerGas: number;
    maxTradeSlippage: number;
}

export class UniV3 {
    web3: any;
    poolV3: any;
    config: UniV3Config;
    myAddress: string;
    swapRouter: any;

    constructor(config1: UniV3Config) {
        this.web3 = new Web3(new Provider(trimHex(config1.privateKey), config1.httpConnector));
        this.poolV3 = null;
        this.swapRouter = new this.web3.eth.Contract(routerV3Abi, routerAddress);
        this.config = config1;
        this.myAddress = this.web3.eth.accounts.privateKeyToAccount(config1.privateKey).address;
    }

    async initialize() {
        const factoryV3 = new this.web3.eth.Contract(factoryV3Abi, factoryAddress);
        let poolAddress = await factoryV3.methods.getPool(this.config.token0, this.config.token1, this.config.feeLevel).call();
        console.log(`poolAddress: ${JSON.stringify(poolAddress)}`)
        if (parseInt(poolAddress, 16) === 0) {
            console.log(`Pool address not found for UniswapV3 factory with token0: ${this.config.token0}, token1: ${this.config.token1}\
            feeLevel: ${this.config.feeLevel}`);
        }
        this.poolV3 = new this.web3.eth.Contract(poolV3Abi, poolAddress);
    }

    async getPoolPrice(): Promise<number> {
        const sqrtPriceX96 = JSBI.BigInt(await this.getSqrtPriceX96())
        console.log(`sqrtprice : ${JSBI.toNumber(sqrtPriceX96)}`);
        const rightShiftAmt = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(192));
        const priceX96 = JSBI.multiply(sqrtPriceX96, sqrtPriceX96);
        JSBI.multiply(priceX96, JSBI.BigInt(10 ** this.config.tokenDec0))
        const rtnVal = JSBI.toNumber(
            JSBI.divide
                (
                    JSBI.multiply(priceX96, JSBI.BigInt(10 ** this.config.tokenDec0)),
                    rightShiftAmt
                )
        ) / 10 ** this.config.tokenDec1;
        console.log(`pool price: ${rtnVal}`);
        return rtnVal;
    }

    async getTargetedPrice(): Promise<number> {
        return 24;
    }

    private async getSqrtPriceX96(): Promise<typeof JSBI.BigInt> {
        return JSBI.BigInt((await this.poolV3.methods.slot0().call()).sqrtPriceX96);
    }

    private async getSqrtPriceX96Decimal(): Promise<number> {
        console.log(Number((await this.poolV3.methods.slot0().call()).sqrtPriceX96));
        return Number((await this.poolV3.methods.slot0().call()).sqrtPriceX96);
    }

    private getTxParams(): TxInfo {
        return {
            from: this.myAddress,
            gas: 300000,
            maxPriorityFeePerGas: this.config.maxPriorityFeePerGas,
            maxFeePerGas: this.config.maxFeePerGas,
        }
    }

    // Buy an exact amount of Token0

    private async buyToken0() {
        await this.getPoolPrice();
        console.log('fffffff');
        const zzz = ((await this.getPoolPrice()));
        const fff = 10 ** (this.config.tokenDec1 - this.config.tokenDec0) * this.config.maxTradeSlippage;
        console.log(`attempting buy token: ${zzz}`);
        console.log(`pool price: ${await this.getPoolPrice()}`);

        const data = [
            this.config.token1,     // tokenIn
            this.config.token0,     // tokenOut
            this.config.feeLevel,   // fee
            this.myAddress,         // receipient
            Date.now() + 120000,    // deadline
            noExp(this.config.buyAmtToken0),     // amountOut
            noExp(this.config.buyAmtToken0 * (await this.getPoolPrice())
                * 10 ** (this.config.tokenDec1 - this.config.tokenDec0) * this.config.maxTradeSlippage), // amountInMaximum
            noExp((await this.getSqrtPriceX96Decimal()) * this.config.maxTradeSlippage) // sqrtPriceLimitX96
        ];
        console.log(`buyToken0 data: ${JSON.stringify(data)}`);
        // return;
        return await this.swapRouter.methods.exactOutputSingle(data).send(this.getTxParams());
    }

    // Sell an exact amount of Token0

    private async sellToken0(unlimitedImpact: boolean = false) {
        const data = [
            this.config.token0,     // tokenIn
            this.config.token1,     // tokenOut
            this.config.feeLevel,   // fee
            this.myAddress,         // receipient
            Date.now() + 120000,    // deadline
            noExp(this.config.sellAmtToken0),     // amountIn
            noExp(this.config.sellAmtToken0 * (await this.getPoolPrice()) * 10
                ** (this.config.tokenDec1 - this.config.tokenDec0) / this.config.maxTradeSlippage),  // amountOutMinimum
            noExp(Number(await this.getSqrtPriceX96Decimal()) / this.config.maxTradeSlippage), // sqrtPriceLimitX96
        ];
        if (unlimitedImpact) {
            data[6] = 0;
            data[7] = MIN_TICK_RATIO + 1000;
        }

        console.log(`attempting to sellToken0, data: ${JSON.stringify(data)}`);
        return await this.swapRouter.methods.exactInputSingle(data).send(this.getTxParams());
    }

    async placeTrade(doBuyToken0: boolean, unlimitedImpact: boolean = false) {
        if (doBuyToken0) {
            return this.buyToken0();
        } else {
            return this.sellToken0(unlimitedImpact);
        }
    }
}




