const Web3 = require('web3');

export class Web3Wrapper {
    web3: typeof Web3;
    constructor(httpConnector: string) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(httpConnector));
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

}





