const poolV3Abi = require("../../abi/poolV3.json");
const routerV3Abi = require("../../abi/routerV3.json");
const factoryV3Abi = require("../../abi/factoryV3.json");
const Web3 = require('web3');
const JSBI = require('jsbi');
import { Output } from "./output";
import { TxInfo, noExp, MIN_TICK_RATIO, trimHex, SWAP_EVENT_HASH, SWAPV3_EVENT_ABI, Swap, routerAddress } from "./utils";
import { Web3Wrapper } from "./web3Wrapper";
const Provider = require('@truffle/hdwallet-provider');
//const poolAddress = "0x72ed3F74a0053aD35b0fc8E4E920568Ca22781a8"; SLVT/USDC 1% pool
const ROUTER_ADDRESS = /*"0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";*/"0xE592427A0AEce92De3Edee1F18E0157C05861564";
const FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

export interface UniV3Config {
    httpConnector: string,
    token0: string;
    token1: string;
    tokenDec0: number;
    tokenDec1: number;
    buyAmtToken0: number;
    sellAmtToken0: number;
    privateKey: string;
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
    web3Wrapper: Web3Wrapper;
    poolAddress: string = "";

    constructor(config1: UniV3Config) {
        this.web3 = new Web3(new Provider(trimHex(config1.privateKey), config1.httpConnector));
        this.poolV3 = null;
        this.swapRouter = new this.web3.eth.Contract(routerV3Abi, ROUTER_ADDRESS);
        this.config = config1;
        this.myAddress = this.web3.eth.accounts.privateKeyToAccount(config1.privateKey).address;
        this.web3Wrapper = new Web3Wrapper(this.myAddress);
    }

    async initialize() {
        const factoryV3 = new this.web3.eth.Contract(factoryV3Abi, FACTORY_ADDRESS);
        this.poolAddress = await factoryV3.methods.getPool(this.config.token0, this.config.token1, this.config.feeLevel).call();
        console.log(`poolAddress: ${JSON.stringify(this.poolAddress)}`)
        if (parseInt(this.poolAddress, 16) === 0) {
            console.log(`Pool address not found for UniswapV3 factory with token0: ${this.config.token0}, token1: ${this.config.token1}\
            feeLevel: ${this.config.feeLevel}`);
        }
        this.poolV3 = new this.web3.eth.Contract(poolV3Abi, this.poolAddress);
    }

    async getPoolPrice(): Promise<number> {
        const sqrtPriceX96 = JSBI.BigInt(await this.getSqrtPriceX96());
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
            gas: 550000,
            maxPriorityFeePerGas: 3 * 10 ** 9,//this.config.maxPriorityFeePerGas,
            maxFeePerGas: 60 * 10 ** 9,//this.config.maxFeePerGas,
            to: routerAddress,
            value: "0"
        }
    }

    // Buy an exact amount of Token0

    private async buyToken0() {
        try {
            await this.getPoolPrice();
            const zzz = ((await this.getPoolPrice()));
            const fff = 10 ** (this.config.tokenDec1 - this.config.tokenDec0) * this.config.maxTradeSlippage;
            console.log(`attempting buy token: ${zzz}`);
            console.log(`pool price: ${await this.getPoolPrice()}`);

            const data = [
                this.config.token0,     // tokenIn
                this.config.token1,     // tokenOut
                this.config.feeLevel,   // fee
                this.myAddress,         // receipient
                //Date.now() + 120000,    // deadline
                10000/*noExp(this.config.buyAmtToken0)*/,     // amountOut
                10000
                /*noExp(this.config.buyAmtToken0 * (await this.getPoolPrice())
                    * 10 ** (this.config.tokenDec1 - this.config.tokenDec0) * this.config.maxTradeSlippage)*/, // amountInMaximum
                MIN_TICK_RATIO + 1000
                //noExp((await this.getSqrtPriceX96Decimal()) * this.config.maxTradeSlippage) // sqrtPriceLimitX96
            ];
            console.log(`buyToken0 data: ${JSON.stringify(data)}`);
            return await this.swapRouter.methods.exactOutputSingle(data).call(this.getTxParams());
        } catch (e) {
            console.log(`buyToken0 failed with error: ${JSON.stringify(e)}`);
        }
    }

    // Sell an exact amount of Token0

    private async sellToken0(unlimitedImpact: boolean = false) {
        try {
            this.config.sellAmtToken0 = 10;
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

            const data2 = [
                1000,     // tokenIn
                0,
                [this.config.token0, this.config.token1],
                this.myAddress
            ]

            console.log(`attempting to sellToken0, data: ${JSON.stringify(data)}`);
            console.log(`data: ${JSON.stringify(this.swapRouter.methods.exactInputSingle(data).encodeABI(), null, 2)}}`)
            return await this.swapRouter.methods.exactInputSingle(data).call(this.getTxParams());
        } catch (e) {
            console.log(`error: ${JSON.stringify(e, null, 2)}`);
        }
    }

    parseSwapOutput(result: any) {
        if (!result || result instanceof Error || typeof (result) !== 'object') {
            console.log("result not parseable");
            return result;
        }

        if (result.events) {
            const data = this.web3Wrapper.getDecodeLogfromEvents(result, SWAP_EVENT_HASH, SWAPV3_EVENT_ABI);
            if (data && data.liquidity) {
                const amount0 = Number(data.amount0) / this.config.tokenDec0 * -1.0;
                const amount1 = Number(data.amount1) / this.config.tokenDec1 * -1;
                let swap: Swap = {
                    time: Date.now(),
                    amount0,
                    amount1,
                    sqrtPriceX96: Number(data.sqrtPriceX96),
                    liquidity: Number(data.liquidity),
                    tick: Number(data.tick),
                    token0: this.config.token0,
                    token1: this.config.token1,
                    hash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    pool: this.poolAddress,
                    price: Math.abs(amount1) / Math.abs(amount0)
                }
                return swap;
            } else {
                console.log("didn't find data")
            }
        }
    }

    async placeTrade(doBuyToken0: boolean, unlimitedImpact: boolean = false) {
        console.log("placing trade");
        let result;
        if (doBuyToken0) {
            result = await this.buyToken0();
        } else {
            result = await this.sellToken0(unlimitedImpact);
        }
        return this.parseSwapOutput(result);
    }
}




