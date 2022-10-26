
import { UniV3Config, UniV3 } from "./uniswapV3Pool";
import { gweiToEth, getHttpConnector, TradeConfig, getEnv } from "./utils";

export async function getConfig() {
    // This program uses a database setup in PostGRES on Heroku.
    // If you don't want to use a database to store completed trade info,
    // set useDb = false
    const useDb = true;
    // Default values, if the database is used, values from
    // the database config table will be used
    const tradeConfig: TradeConfig = {
        targetSellPrct: 110,
        targetBuyPrct: 90,
        minMillSecBetweenTrades: 120000,
        sleepTimeMillSec: 100000,
        maxNumErrors: 5, // the program will exit when the number of error has been reached
        maxNumTrades: 5, // the program will exit when this number of trades has been sent
        doMakeTrades: false, // set to true if you want the program to make trades
        buyAmt0: 0,// define this from a database
        sellAmt0: 0,// define this from a database
    };

    // These config variables determine how the program functions
    const config: UniV3Config = {
        httpConnector: getHttpConnector(),
        token0: "0x652594082f97392a1703D80985Ab575085f34a4e", // SLVT token Address
        token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC token Address
        // pool address: 0x72ed3F74a0053aD35b0fc8E4E920568Ca22781a8
        tokenDec0: 8,
        tokenDec1: 6,
        buyAmtToken0: .0000001 * 10 ** 8,  //the buy and sell amts are in smallest increments of SLT 10 ^ 8 = 1 SLVT
        sellAmtToken0: .0000001 * 10 ** 8,
        feeLevel: 10000, //10000 = 1%
        maxPriorityFeePerGas: gweiToEth(3), // 1 gwei = 10 ** 9
        maxFeePerGas: gweiToEth(50),
        maxTradeSlippage: 1.15, // 1.15 = you will pay up to 15% more than current prc or trade reverts
        privateKey: getEnv('PRIVATE_KEY')
    }
    return { useDb, tradeConfig, config };
}