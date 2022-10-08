import { UniV3Config, UniV3 } from "../src/uniswapV3";
import { Erc20 } from "../src/erc20";
import { sleep, routerAddress, gweiToEth, getPrivateKey, SWAPV3_EVENT_ABI, SWAP_EVENT_HASH, getEnv, TradeConfig } from "../src/utils";
import { Web3Wrapper } from "../src/web3Wrapper";
import { RebalancePool } from "../src/rebalancePool";
require('dotenv').config()

// test rebalance on Goerli test net  https://goerli.etherscan.io/ 

const useDb = true;

const DATABASE_URL: string = getEnv('DATABASE_URL');
console.log(`databaseURL: ${DATABASE_URL}`);

const tradeConfig: TradeConfig = {
    targetSellPrct: 110,
    targetBuyPrct: 90,
    minMillSecBetweenTrades: 120000,
    sleepTimeMillSec: 100000,
    maxNumErrors: 5, // the program will exit when the number of error has been reached
    maxNumTrades: 5, // the program will exit when this number of trades has been sent
    doMakeTrades: true
}

const config: UniV3Config = {
    httpConnector: getEnv('TESTNET_URL'),
    token0: "0x7144Cd6Cca5e45Ca071190E88E0E85228200Fa27", // WETH on Goerli
    token1: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", // random token Address
    // pool address is  0x61975B078473Ec6dDcEfd80b2Ab8E57cC78222F7
    tokenDec0: 18,
    tokenDec1: 18,
    buyAmtToken0: .00001 * 10 ** 18,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
    sellAmtToken0: .0000001 * 10 ** 18,
    feeLevel: 10000, //3000 = .3%
    maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
    maxFeePerGas: gweiToEth(50),
    maxTradeSlippage: 2, // 1.15 = you will pay up to 15% more than current prc or trade reverts
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

async function getTransaction() {
    const myWeb3 = new Web3Wrapper(config.httpConnector);
    const doneTx = "0x34c61308aaf21a9cc6b124139bc44b40285314a16cc84db28da995946e821492";
    const tx = await myWeb3.getLogs("0x34c61308aaf21a9cc6b124139bc44b40285314a16cc84db28da995946e821492");
    console.log(`log: ${JSON.stringify(await myWeb3.getDecodeLogfromTxHash(tx, SWAP_EVENT_HASH, SWAPV3_EVENT_ABI), null, 2)}`);
}

async function testRebalance() {
    const rebalancePool = new RebalancePool(tradeConfig, config, DATABASE_URL, useDb);
    await rebalancePool.intialize();
    await rebalancePool.reBalance();
    await sleep(1000000);
}

testRebalance()
