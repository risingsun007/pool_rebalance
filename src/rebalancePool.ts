import { UniV3Config, UniV3 } from "./uniswapV3";
import { Erc20 } from "./erc20";
import { sleep, routerAddress, gweiToEth, getTheoSlvtPrice, getAccountFromKey } from "./utils";

export class RebalancePool {
    config: UniV3Config;
    erc20Cnt0: Erc20;
    erc20Cnt1: Erc20;

    constructor(config: UniV3Config) {
        this.config = config;
        this.erc20Cnt0 = new Erc20(config.token0, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);
        this.erc20Cnt1 = new Erc20(config.token1, config.httpConnector, config.privateKey, config.maxPriorityFeePerGas);

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

            console.log(`You have ${myBalance} you need ${amtNeeded}`);

            return true;
        } catch (e) {
            console.log(`checkIfHaveEnough failed with error: ${e}`);
            throw (e);
        }
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
            return {
                doBuy: (price / theoPrice < this.config.targetBuyPrct && (await this.doHaveEnough(true, price))),
                doSell: price / theoPrice > this.config.targetSellPrct && (await this.doHaveEnough(false, price))
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