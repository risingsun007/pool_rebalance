import { UniV3Config, UniV3 } from "./uniswapV3";
import { Erc20 } from "./erc20";
import { sleep, routerAddress, gweiToEth, getPrivateKey } from "./utils";
require('dotenv').config()

const config: UniV3Config = {
    httpConnector: "https://goerli.infura.io/v3/96be6c20daf74b9093bc3c3db80f801d",
    token0: "0x7144Cd6Cca5e45Ca071190E88E0E85228200Fa27", // WETH on Goerli
    token1: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", // random token Address
    // pool address is  0x61975B078473Ec6dDcEfd80b2Ab8E57cC78222F7
    tokenDec0: 18,
    tokenDec1: 18,
    buyAmtToken0: .01 * 10 ** 18,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
    sellAmtToken0: .01 * 10 ** 18,
    targetSellPrct: 110,
    targetBuyPrct: 90,
    minMillSecBetweenTrades: 30000,
    sleepTimeMillSec: 10000,
    feeLevel: 10000, //3000 = .3%
    maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
    maxFeePerGas: gweiToEth(50),
    maxTradeSlippage: 1.15, // 1.15 = you will pay up to 15% more than current prc or trade reverts
    privateKey: getPrivateKey(),
}

async function test() {
    //sell WETH for other token, then sell other token
    const weth = new Erc20(config.token0, config.httpConnector, config.privateKey, gweiToEth(3));
    const uniV3 = new UniV3(config);
    await weth.initialize();
    await uniV3.initialize();
    console.log(await uniV3.getPoolPrice());
    console.log(`my balance: ${await weth.getMyBalance()}`);
    if ((await weth.getMyBalance()) < .0001) {
        console.log("attempting to deposit");
        await weth.deposit(.1);
    }

    if ((await weth.getAllowance(routerAddress)) < 1) {
        console.log("attempting to increase allowance: await weth.getAllowance(routerAddress)");
        console.log(`approve result: ${JSON.stringify(await weth.approve(routerAddress, 10000))}`);
    }
    console.log(`result: ${JSON.stringify(await uniV3.placeTrade(false))}`);

    const token1 = new Erc20(config.token1, config.httpConnector, config.privateKey, gweiToEth(3));
    const balanceT1 = await token1.getMyBalance();
    if (balanceT1) {
        console.log(`result: ${JSON.stringify(await uniV3.placeTrade(true))}`);
    }
}

test()