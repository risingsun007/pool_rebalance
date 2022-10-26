import { UniV3Config, UniV3 } from "./uniswapV3Pool";
import { Erc20Cnt } from "./erc20Cnt";
import { sleep, routerAddress, gweiToEth, getTheoSlvtPrice, getAccountFromKey, TradeConfig, getEnv } from "./utils";
import { OutputDb } from "./outputDb";
import { Output } from "./output";
import { DB } from "./db";
import { Web3Wrapper } from "./web3Wrapper";
const MS_TIME_BETWEEN_UPDATE_CONFIG = 60000;
const unlimitedImpact = true;

export class RebalancePool {
    config: UniV3Config;
    erc20Cnt0: Erc20Cnt;
    erc20Cnt1: Erc20Cnt;
    output: Output;
    tradeConfig: TradeConfig;
    db: DB | null = null;
    useDb: boolean;
    lastUpdateConfigTime: number;
    lastPlaceOrderTime: number = 0;
    uniV3: UniV3;

    constructor(tradeConfig: TradeConfig, config: UniV3Config, DATABASE_URL: string, useDb: boolean) {
        this.config = config;
        this.tradeConfig = tradeConfig;
        this.erc20Cnt0 = new Erc20Cnt(config.token0, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);
        this.erc20Cnt1 = new Erc20Cnt(config.token1, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);
        this.useDb = useDb;
        this.lastUpdateConfigTime = Date.now();
        this.uniV3 = new UniV3(config);
        if (useDb) {
            this.output = new OutputDb(DATABASE_URL);
            this.db = new DB(DATABASE_URL);
        } else {
            this.output = new Output();
        }
    }

    async intialize() {
        await this.output.initialize();
    }

    async updateConfig() {
        if (this.db && Date.now() - this.lastUpdateConfigTime > MS_TIME_BETWEEN_UPDATE_CONFIG) {
            console.log("updated config");
            this.lastUpdateConfigTime = Date.now();
            this.tradeConfig = await this.db.getConfig();
            this.config.buyAmtToken0 = this.tradeConfig.buyAmt0 * 10 ** this.config.tokenDec0;
            this.config.sellAmtToken0 = this.tradeConfig.sellAmt0 * 10 ** this.config.tokenDec0;
        }
    }

    async doHaveEnough(isbuy: boolean, price: number) {
        try {
            // set this to true for the time being because there is very little 
            // liquidity pool in the and the pool price is 10 ^ 40 vs a theo of 25
            return true;

            const SAFETY_BUFFER = 1.2;
            let myBalance = isbuy ? (await this.erc20Cnt1.getMyBalance()) : (await this.erc20Cnt0.getMyBalance());
            let amtNeeded = (isbuy ? this.config.buyAmtToken0 * price : this.config.sellAmtToken0)
                / this.config.tokenDec0 * SAFETY_BUFFER;

            if (myBalance < amtNeeded) {
                console.log(`Don't have enough token ${isbuy ? this.config.token1 : this.config.token0} to sell in order to buy ${isbuy ? this.config.token0 : this.config.token1}`);
                console.log(`You have ${myBalance} you need ${amtNeeded}`);
                return false;
            }

            return true;
        } catch (e) {
            console.log(`checkIfHaveEnough failed with error: ${e}`);
            throw (e);
        }
    }

    async canTrade(price: number, lastPlaceOrderTime: number) {
        let doBuy = false;
        let doSell = false;
        let theoPrice = await getTheoSlvtPrice();
        if (theoPrice < 0) {
            console.log("failed to get theo SLVT price, not evualtion rebalance");
            return { doBuy, doSell };
        }
        if (Date.now() - lastPlaceOrderTime < this.tradeConfig.minMillSecBetweenTrades) {
            return { doBuy, doSell };
        }
        if (!price || !theoPrice) {
            console.log(`price input wrong price: ${price} ${theoPrice}`);
            return { doBuy, doSell };
        }

        try {
            return {
                doBuy: (price / theoPrice < this.tradeConfig.targetBuyPrct && (await this.doHaveEnough(true, price))),
                doSell: price / theoPrice > this.tradeConfig.targetSellPrct && (await this.doHaveEnough(false, price))
            };
        } catch (e) {
            console.log(`doTrade error: ${e}`);
            throw (e)
        }
    }

    async setupAllowance(isToken0: boolean) {
        const minBalanceForApproval = 10 ** 20;
        try {
            const tokenCnt = isToken0 ? this.erc20Cnt0 : this.erc20Cnt1;
            if (await tokenCnt.getAllowance(routerAddress) < minBalanceForApproval) {
                console.log(`Approving router for trading on token ${isToken0 ? this.config.token0 : this.config.token1}`)
                await tokenCnt.approveMax(routerAddress);
            }
        } catch (e) {
            console.log(`failed with setupAllowance with error: ${e}`)
            throw (e);
        }
    }

    // Ensure that tradeDataConfig exists

    async isDataValid() {
        return this.tradeConfig && this.tradeConfig.buyAmt0;
    }

    async setupAllowances() {
        await this.setupAllowance(true);
        await this.setupAllowance(false);
    }

    async setup() {
        console.log(`getconfig: ${getEnv('DATABASE_URL')}`);
        // disables for testing purposes
        // renable when running live account
        //- await this.setupAllowances();
        console.log(`Starting rebalance account using account: ${getAccountFromKey(this.config.privateKey)}`);
        await this.updateConfig();
        this.uniV3.initialize();

    }

    async placeTrade(doBuy: boolean) {
        this.lastPlaceOrderTime = Date.now();
        return await this.uniV3.placeTrade(doBuy, unlimitedImpact);
    }

    maxTradeAndErrorsReached(numTrades: number, numErrors: number): boolean {
        return numTrades < this.tradeConfig.maxNumTrades && numErrors < this.tradeConfig.maxNumErrors;
    }

    async reBalance() {
        let poolPrice, numTrades = 0, numErrors = 0;
        let lastPlaceOrderTime: number = 0;
        await this.setup();

        while (!this.maxTradeAndErrorsReached(numTrades, numErrors) && await this.isDataValid()) {
            await sleep(this.tradeConfig.sleepTimeMillSec);
            await this.updateConfig();
            poolPrice = await this.uniV3.getPoolPrice();
            console.log(`Pool price: ${poolPrice}, theoPrice: ${await getTheoSlvtPrice()}`);
            await this.output.outputTradeStatus(numTrades, numErrors, poolPrice, await getTheoSlvtPrice());
            try {
                const { doBuy, doSell } = await this.canTrade(poolPrice, lastPlaceOrderTime);
                if (!doBuy && !doSell) {
                    continue;
                }

                if (this.tradeConfig.doMakeTrades) {
                    ++numTrades;
                    console.log(`Attempting trade, isbuy: ${doBuy}, pool price: ${await this.uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}, doMakeTrades: ${this.tradeConfig.doMakeTrades}`);
                    this.output.outputSwap(await this.placeTrade(doBuy));
                    await this.updateConfig();
                } else {
                    console.log(`Would have done trade here, isbuy: ${doBuy}, pool price: ${await this.uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}`);
                }
            } catch (e) {
                ++numErrors;
                console.log(`error with rebalance: ${e}`);
            }

        }
        console.log(`Rebalancing Program exiting`);
        console.log(`numTrades: ${numTrades}, numErrors: ${numErrors}, maxNumTrades: ${this.tradeConfig.maxNumTrades}, maxNumErrors: ${this.tradeConfig.maxNumErrors}`);
        console.log(`data is valid: ${await this.isDataValid()}, max errors reached: ${this.maxTradeAndErrorsReached(numTrades, numErrors)}`);
    }

    async buy() {
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();

        const usdc = new Erc20Cnt(this.config.token1, this.config.httpConnector, this.config.privateKey, gweiToEth(3));
        console.log(`router allowance token1: ${await usdc.getAllowance(routerAddress)}`);
        if (await usdc.getAllowance(routerAddress) < 1) {
            console.log("attempting to increase allowance");
            console.log(`approve result: ${JSON.stringify(await usdc.approve(routerAddress, 10000))}`);
        }
        await uniV3.placeTrade(true);
    }

    async sell() {
        const web3 = new Web3Wrapper(this.config.httpConnector);
        await web3.getPastEvents("0x41c84c0e2EE0b740Cf0d31F63f3B6F627DC6b393");
        return;
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();
        const poolAddress = "0x72ed3F74a0053aD35b0fc8E4E920568Ca22781a8";
        console.log(`this sellAmt0: ${this.config.sellAmtToken0}`);
        this.config.sellAmtToken0 = 0;
        const unlimitedImpact = true;
        const swapResult = await uniV3.placeTrade(false, unlimitedImpact);
        console.log(`RebalancePool.swapResult: ${swapResult}`);
        this.output.outputSwap(swapResult);
    }
}