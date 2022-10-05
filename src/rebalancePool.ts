import { UniV3Config, UniV3 } from "./uniswapV3";
import { Erc20 } from "./erc20";
import { sleep, routerAddress, gweiToEth, getPrivateKey, getTheoSlvtPrice, getAccountFromKey, getHttpConnector } from "./utils";
import { Console } from "console";

export class RebalancePool {
    config: UniV3Config;

    constructor(config: UniV3Config) {
        this.config = config;
    }

    async doTrade(price: number, lastPlaceOrderTime: number) {
        let doBuy = false;
        let doSell = false;
        let theoPrice = await getTheoSlvtPrice();
        if (theoPrice < 0) {
            console.log("failed to get theo SLVT price, not evualtion rebalance");
            return { doBuy, doSell };
        }
        if (Date.now() - lastPlaceOrderTime < this.config.minMillSecBetweenTrades) {
            return { doBuy, doSell };
        }
        if (!price || !theoPrice) {
            console.log(`price input wrong price: ${price} ${theoPrice}`);
            return { doBuy, doSell };
        }

        try {
            return { doBuy: (price / theoPrice < this.config.targetBuyPrct), doSell: (price / theoPrice > this.config.targetSellPrct) };
        } catch (e) {
            console.log(`doTrade error: ${e}`);
            throw (e)
        }
    }

    async setupAllowance(tokenAddress: string) {
        const minBalanceForApproval = 10 ** 20;
        try {
            const tokenCnt = new Erc20(tokenAddress, this.config.httpConnector, this.config.privateKey, gweiToEth(3));
            if (await tokenCnt.getAllowance(routerAddress) < minBalanceForApproval) {
                console.log(`Approving router for trading on token ${tokenAddress}`)
                await tokenCnt.approveMax(routerAddress);
            }
        } catch (e) {
            console.log(`failed with setupAllowance with error: ${e}`)
            throw (e);
        }
    }

    async setupAllowances() {
        await this.setupAllowance(this.config.token0);
        await this.setupAllowance(this.config.token1);
    }

    async reBalance() {
        const unlimitedImpact = true;
        let poolPrice;
        let lastPlaceOrderTime: number = 0;
        const uniV3 = new UniV3(this.config);
        await uniV3.initialize();
        await this.setupAllowances();
        console.log(`starting rebalance account using account: ${getAccountFromKey(this.config.privateKey)}`);

        while (true) {
            poolPrice = await uniV3.getPoolPrice();
            console.log(`pool price: ${poolPrice}, theoPrice: ${await getTheoSlvtPrice()}`);
            try {
                const { doBuy, doSell } = await this.doTrade(await uniV3.getPoolPrice(), lastPlaceOrderTime);
                if (doBuy || doSell) {
                    lastPlaceOrderTime = Date.now();
                    console.log(`would have done trade here, isbuy: ${doBuy}, pool price: ${await uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}`);
                    //uncomment to trade
                    //await uniV3.placeTrade(doBuy, unlimitedImpact);
                }
            } catch (e) {
                console.log(`error with rebalance: ${e}`);
            }
            await sleep(this.config.sleepTimeMillSec);
        }
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
        await uniV3.placeTrade(false, unlimitedImpact);
    }
}