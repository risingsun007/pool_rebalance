import {  getEnv } from "./utils";
import { RebalancePool } from "./poolRebalancer";
import { getConfig } from "./config1"

async function selectProgram() {
    const { useDb, tradeConfig, config, } = await getConfig()
    const rebalancePool = new RebalancePool(tradeConfig, config, getEnv('DATABASE_URL'), useDb);
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
        console.log("didn't find usable arguments,  An argument \"buy\" \"sell\" or no arguments is needed to run the program");
    }
}

selectProgram();
