import { UniV3Config, UniV3 } from "./UniswapV3";
import { Weth } from "./WETH";
import { sleep, routerAddress, gweiToEth, getPrivateKey, getTheoSlvtPrice, getAccountFromKey, getHttpConnector } from "./utils";
import { Console } from "console";


// You need to set these config values to run Program on Mainnet
const config: UniV3Config = {
    httpConnector: getHttpConnector(), //"https://mainnet.infura.io/v3/96be6c20daf74b9093bc3c3db80f801d",
    token0: "0x652594082f97392a1703D80985Ab575085f34a4e", // SLVT token Address
    token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC token Address
    tokenDec0: 8,
    tokenDec1: 6,
    buyAmtToken0: .0001 * 10 ** 8,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
    sellAmtToken0: .001 * 10 ** 6,
    targetSellPrct: 110,
    targetBuyPrct: 90,
    minMillSecBetweenTrades: 120000,
    sleepTimeMillSec: 10000,
    feeLevel: 10000, //10000 = 1%
    maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
    maxFeePerGas: gweiToEth(50),
    maxTradeSlippage: 1.15, // 1.15 = you will pay up to 15% more than current prc or trade reverts
    privateKey: getPrivateKey(),
}

async function doTrade(price: number, lastPlaceOrderTime: number) {
    let doBuy = false;
    let doSell = false;
    let theoPrice = await getTheoSlvtPrice();
    if (theoPrice < 0) {
        console.log("failed to get theo SLVT price, not evualtion rebalance");
        return { doBuy, doSell };
    }
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

async function setupAllowance(tokenAddress: string) {
    const minBalanceForApproval = 10 ** 20;
    try {
        const tokenCnt = new Weth(tokenAddress, config.httpConnector, config.privateKey, gweiToEth(3));
        if (await tokenCnt.getAllowance(routerAddress) < minBalanceForApproval) {
            console.log(`Approving router for trading on token ${tokenAddress}`)
            await tokenCnt.approveMax(routerAddress);
        }
    } catch (e) {
        console.log(`failed with setupAllowance with error: ${e}`)
        throw (e);
    }
}

async function setupAllowances() {
    await setupAllowance(config.token0);
    await setupAllowance(config.token1);
}

async function reBalance() {
    const unlimitedImpact = true;
    let poolPrice;
    let lastPlaceOrderTime: number = 0;
    const uniV3 = new UniV3(config);
    await uniV3.initialize();
    await setupAllowances();
    console.log(`starting rebalance account using account: ${getAccountFromKey(config.privateKey)}`);

    while (true) {
        poolPrice = await uniV3.getPoolPrice();
        console.log(`pool price: ${poolPrice}, theoPrice: ${await getTheoSlvtPrice()}`);
        try {
            const { doBuy, doSell } = await doTrade(await uniV3.getPoolPrice(), lastPlaceOrderTime);
            if (doBuy || doSell) {
                lastPlaceOrderTime = Date.now();
                console.log(`would have done trade here, isbuy: ${doBuy}, pool price: ${await uniV3.getPoolPrice()} theoprice: ${await getTheoSlvtPrice()}`);
                //uncomment to trade
                //await uniV3.placeTrade(doBuy, unlimitedImpact);
            }
        } catch (e) {
            console.log(`error with rebalance: ${e}`);
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
