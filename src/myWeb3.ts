const Web3 = require('web3');

export class MyWeb3 {
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
                console.log(`zzz: ${JSON.stringify(x, null, 2)}`)
                return await this.getDecodeLog(inputs, x.data, x.topics);
            }
        }
        return {};
    }

    getDecodeLog(inputs: any, data: string, topics: any) {
        console.log(`inputs: ${JSON.stringify(inputs, null, 2)}`);
        console.log(`data: ${data}`);
        console.log(`topics: ${JSON.stringify(topics, null, 2)}`);
        //topics = topics.slice(0,2);
        //topics = ['0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67', '0x0000000000000000000000000000000000000000000000000000000000000010'];

        return (this.web3.eth.abi.decodeLog(inputs, data, topics));
    }

}





