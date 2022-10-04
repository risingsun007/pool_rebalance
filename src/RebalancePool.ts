import { UniV3Config, UniV3 } from "./UniswapV3";
import { Weth } from "./WETH";
import { sleep, routerAddress, gweiToEth } from "./utils";
require('dotenv').config()

const runTestsOnTestNet = false;

// You need to set these config values to run Program on Mainnet
const config: UniV3Config = {
    httpConnector: "https://mainnet.infura.io/v3/96be6c20daf74b9093bc3c3db80f801d",
    token0: "0x652594082f97392a1703D80985Ab575085f34a4e", // SLVT token Address
    token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC token Address
    tokenDec0: 8,
    tokenDec1: 6,
    buyAmtToken0: .000000001 * 10 ** 8,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
    sellAmtToken0: .001 * 10 ** 6,
    targetSellPrct: 110,
    targetBuyPrct: 90,
    minMillSecBetweenTrades: 30000,
    sleepTimeMillSec: 10000,
    feeLevel: 10000, //10000 = 1%
    maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
    maxFeePerGas: gweiToEth(50),
    maxTradeSlippage: 1.15, // 1.15 = you will pay up to 15% more than current prc or trade reverts
    privateKey: process.env.PRIVATE_KEY || "",
}


async function doTrade(price: number, theoPrice: number, lastPlaceOrderTime: number) {
    let doBuy = false;
    let doSell = false;
    if (Date.now() - lastPlaceOrderTime < config.minMillSecBetweenTrades) {
        return { doBuy, doSell };
    }
    if (!price || !theoPrice) {
        console.log(`price input wrong price: ${price} ${theoPrice}`);
        return { doBuy, doSell };
    }

    try {
        return { doBuy: (price / theoPrice < config.targetBuyPrct), doSell: (price / theoPrice > config.targetSellPrct) };
    } catch (e) {
        console.log(`doTrade error: ${e}`);
        throw (e)
    }
}

async function reBalance() {
    let lastPlaceOrderTime: number = 0;
    const uniV3 = new UniV3(config);
    await uniV3.initialize();

    while (true) {
        console.log(`pool price: ${await uniV3.getPoolPrice()}`);
        if (false) {
            try {
                const { doBuy, doSell } = await doTrade(await uniV3.getPoolPrice(), await uniV3.getTargetedPrice(), lastPlaceOrderTime);
                if (doBuy || doSell) {
                    lastPlaceOrderTime = Date.now();
                    await uniV3.placeTrade(doBuy);
                }
            } catch (e) {
                console.log(`error with rebalance: ${e}`);
            }
        }
        await sleep(config.sleepTimeMillSec);
    }
}

async function buy() {
    const uniV3 = new UniV3(config);
    await uniV3.initialize();

    const usdc = new Weth(config.token1, config.httpConnector, config.privateKey, gweiToEth(3));
    console.log(`router allowance token1: ${await usdc.getAllowance(routerAddress)}`);
    if (await usdc.getAllowance(routerAddress) < 1) {
        console.log("attempting to increase allowance");
        console.log(`approve result: ${JSON.stringify(await usdc.approve(routerAddress, 10000))}`);
    }
    await uniV3.placeTrade(true);
}

async function sell() {
    const uniV3 = new UniV3(config);
    await uniV3.initialize();

    const token0 = new Weth(config.token0, config.httpConnector, config.privateKey, gweiToEth(3));
    console.log(`router allowance token0: ${await token0.getAllowance(routerAddress)}`);
    if (await token0.getAllowance(routerAddress) < 1) {
        console.log("attempting to increase allowance");
        console.log(`approve result: ${JSON.stringify(await token0.approve(routerAddress, 10000))}`);
    }
    const unlimitedImpact = true;
    await uniV3.placeTrade(false, unlimitedImpact);
}

if (process.argv.length < 3) {
    console.log("running rebalance");
    reBalance();
} else if (process.argv[2] === "sell") {
    console.log("running sell");
    sell();
} else if (process.argv[2] === "buy") {
    console.log("running buy");
    buy();
} else {
    console.log(process.argv)
    console.log("didn't find any arguments,  An argument \"buy\" \"sell\" or no arguments is needed to run the program");
}
