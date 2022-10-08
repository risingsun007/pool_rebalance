import { UniV3Config, UniV3 } from "./uniswapV3";
import { Erc20 } from "./erc20";
import { sleep, routerAddress, gweiToEth, getTheoSlvtPrice, getAccountFromKey, TradeConfig } from "./utils";
import { OutputDb } from "./outputDb";
import { Output } from "./output";
import { isConstructorDeclaration } from "typescript";

export class RebalancePool {
    config: UniV3Config;
    erc20Cnt0: Erc20;
    erc20Cnt1: Erc20;
    output: Output;
    tradeConfig: TradeConfig;

    constructor(tradeConfig: TradeConfig, config: UniV3Config, DATABASE_URL: string, useDb: boolean) {
        this.config = config;
        this.tradeConfig = tradeConfig;
        this.erc20Cnt0 = new Erc20(config.token0, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);
        this.erc20Cnt1 = new Erc20(config.token1, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);
        if (useDb) {
            this.output = new OutputDb(DATABASE_URL);
        } else {
            this.output = new Output();
        }
    }

    async intialize() {
        await this.output.initialize();
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

    async setupAllowances() {
        await this.setupAllowance(true);
        await this.setupAllowance(false);
    }

    async reBalance() {
        const unlimitedImpact = true;
        let poolPrice;
        let numTrades = 0;
        let numErrors = 0;
        let lastPlaceOrderTime: number = 0;
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();
        // disables for testing purposes
        // renable when running live account
        //- await this.setupAllowances();
        console.log(`Starting rebalance account using account: ${getAccountFromKey(this.config.privateKey)}`);

        while (numTrades < this.tradeConfig.maxNumTrades && numErrors < this.tradeConfig.maxNumErrors) {
            poolPrice = await uniV3.getPoolPrice();
            console.log(`Pool price: ${poolPrice}, theoPrice: ${await getTheoSlvtPrice()}`);
            try {
                const { doBuy, doSell } = await this.canTrade(await uniV3.getPoolPrice(), lastPlaceOrderTime);
                if (doBuy || doSell) {
                    lastPlaceOrderTime = Date.now();
                    ++numTrades;
                   
                    if (this.tradeConfig.doMakeTrades) {
                        console.log(`Attempting trade, isbuy: ${doBuy}, pool price: ${await uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}`);
                        this.output.outputSwap(await uniV3.placeTrade(doBuy, unlimitedImpact));
                    } else {
                        console.log(`Would have done trade here, isbuy: ${doBuy}, pool price: ${await uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}`);
                    }
                }
            } catch (e) {
                ++numErrors;
                console.log(`error with rebalance: ${e}`);
            }
            await sleep(this.tradeConfig.sleepTimeMillSec);
        }
        console.log(`Rebalancing Program exiting`);
        console.log(`numTrades: ${numTrades}, numErrors: ${numErrors}, maxNumTrades: ${this.tradeConfig.maxNumTrades}, maxNumErrors: ${this.tradeConfig.maxNumErrors}`);
    }

    async buy() {
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();

        const usdc = new Erc20(this.config.token1, this.config.httpConnector, this.config.privateKey, gweiToEth(3));
        console.log(`router allowance token1: ${await usdc.getAllowance(routerAddress)}`);
        if (await usdc.getAllowance(routerAddress) < 1) {
            console.log("attempting to increase allowance");
            console.log(`approve result: ${JSON.stringify(await usdc.approve(routerAddress, 10000))}`);
        }
        await uniV3.placeTrade(true);
    }

    async sell() {
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();

        const token0 = new Erc20(this.config.token0, this.config.httpConnector, this.config.privateKey, gweiToEth(3));
        console.log(`router allowance token0: ${await token0.getAllowance(routerAddress)}`);
        if (await token0.getAllowance(routerAddress) < 1) {
            console.log("attempting to increase allowance");
            console.log(`approve result: ${JSON.stringify(await token0.approve(routerAddress, 10000))}`);
        }
        const unlimitedImpact = true;
        const swapResult = await uniV3.placeTrade(false, unlimitedImpact);
        console.log(`RebalancePool.swapResult: ${swapResult}`);
        this.output.outputSwap(swapResult);
    }
}