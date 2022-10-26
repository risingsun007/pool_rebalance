const Web3 = require('web3');
const Provider = require('@truffle/hdwallet-provider');
import { stringify } from "querystring";
import { trimHex, noExp } from "./utils";

export class Web3Wrapper {
    web3: typeof Web3;
    myAddress: string = "";
    constructor(httpConnector: string, privateKey: string = "") {
        if (privateKey) {
            this.web3 = this.web3 = new Web3(new Provider(trimHex(privateKey), httpConnector));
            this.myAddress = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        } else {
            this.web3 = new Web3(new Web3.providers.HttpProvider(httpConnector));
        }
    }

    getWallet() {
        return this.web3.eth.accounts.create();
    }

    async getTransaction(tx: string): Promise<string> {
        return await this.web3.eth.getTransaction(tx);
    }
    async getLogs(tx: string): Promise<string> {
        return await this.web3.eth.getTransactionReceipt(tx);
    }

    async getDecodeLogfromTxHash(tx: any, sigHash: string, inputs: any) {
        if (!tx || !tx.logs) {
            console.log("didn't find logs");
            return {};
        }

        for (const x of tx.logs) {
            if (x.topics[0] === sigHash) {
                return this.getDecodeLog(inputs, x.data, x.topics);
            }
        }
        return {};
    }

    getDecodeLogfromEvents(tx: any, sigHash: string, inputs: any) {
        if (!tx || !tx.events) {
            console.log("didn't find logs");
            return {};
        }

        for (const x in tx.events) {
            if (tx.events[x].hasOwnProperty('raw') && tx.events[x].raw.topics[0] === sigHash) {
                return this.getDecodeLog(inputs, tx.events[x].raw.data, tx.events[x].raw.topics);
            }
        }
        return {};
    }

    getDecodeLog(inputs: any, data: string, topics: any) {
        // console.log(`inputs: ${JSON.stringify(inputs, null, 2)}`);
        // console.log(`data: ${data}`);
        // console.log(`topics: ${JSON.stringify(topics, null, 2)}`);
        // console.log(`fff: ${JSON.stringify(this.web3.eth.abi.decodeLog(inputs, data, topics), null, 2)}`);
        return (this.web3.eth.abi.decodeLog(inputs, data, topics));
    }

    async sendValue(amount: number, to: string) {
        return await this.web3.eth.sendTransaction({
            from: this.myAddress,
            value: noExp(amount),
            to,
            gas: 50000,
            maxPriorityFeePerGas: 3 * 10 ** 9,
            maxFeePerGas: 100 * 10 ** 9,
        });
    }

    async getPastEvents(address: string) {

        
       // const cnt = new this.web3.eth.Contract([], addr);
        const blockNumber = await this.web3.eth.getBlockNumber();
        console.log(`Current block number: ${blockNumber}, address: ${address}`);
        const logs = await this.web3.eth.getPastLogs({
            fromBlock: blockNumber - 1000000,
            toBlock: blockNumber,
            address,
        });
        const liquidationEvent = "0x298637f684da70674f26509b10f07ec2fbc77a335ab1e7d6215a4b2484d8bb52";

        console.log(`num logs: ${JSON.stringify(logs.length, null, 2)}`);
        let myMap = new Map<string, number>();
        for(let i = 0;i < logs.length; ++i){
            if(logs[i].topics){
                let tpx = logs[i].topics[0];
                if(tpx){
                    if(tpx===liquidationEvent){
                        console.log(logs[i]);
                    }
                    let val = myMap.get(tpx);
                    if(myMap.has(tpx) &&   val){
                        myMap.set(tpx,val+1);
                    } else {
                        myMap.set(tpx, 0);
                    }
                }
            }   
        }
        console.log(`myMap size: ${myMap.size}`);
        myMap.forEach( (x, y) =>{
            console.log(`${x}: ${y}`);
        })
        //console.log(` ${JSON.stringify(logs, null, 2)}`);
    }

}





