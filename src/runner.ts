import { UniV3Config, UniV3 } from "./uniswapV3";
import { gweiToEth, getPrivateKey, getHttpConnector, TradeConfig, getEnv } from "./utils";
import { RebalancePool } from "./rebalancePool";

const DATABASE_URL: string = getEnv('DATABASE_URL');
// This program uses a database setup in PostGRES on Heroku.
// If you don't want to use a database to store completed trade info,
// set useDb = false
const useDb = true;

const tradeConfig: TradeConfig = {
    targetSellPrct: 110,
    targetBuyPrct: 90,
    minMillSecBetweenTrades: 120000,
    sleepTimeMillSec: 100000,
    maxNumErrors: 5, // the program will exit when the number of error has been reached
    maxNumTrades: 5, // the program will exit when this number of trades has been sent
    doMakeTrades: false, // set to true if you want the program to make trades
};

// These config variables determine how to program functions
const config: UniV3Config = {
    httpConnector: getHttpConnector(),
    token0: "0x652594082f97392a1703D80985Ab575085f34a4e", // SLVT token Address
    token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC token Address
    tokenDec0: 8,
    tokenDec1: 6,
    buyAmtToken0: .0001 * 10 ** 8,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
    sellAmtToken0: .001 * 10 ** 6,
    feeLevel: 10000, //10000 = 1%
    maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
    maxFeePerGas: gweiToEth(50),
    maxTradeSlippage: 1.15, // 1.15 = you will pay up to 15% more than current prc or trade reverts
    privateKey: getEnv('PRIVATE_KEY')
}

async function selectProgram() {
    const UseDb = true;
    const rebalancePool = new RebalancePool(tradeConfig, config, DATABASE_URL, useDb);
    await rebalancePool.intialize();

    if (process.argv.length < 3) {
        console.log("running rebalance");
        rebalancePool.reBalance();
    } else if (process.argv[2] === "sell") {
        console.log("running sell");
        rebalancePool.sell();
    } else if (process.argv[2] === "buy") {
        console.log("running buy");
        rebalancePool.buy();
    } else {
        console.log(process.argv)
        console.log("didn't find any arguments,  An argument \"buy\" \"sell\" or no arguments is needed to run the program");
    }
}

selectProgram();
