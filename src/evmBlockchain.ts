const Web3 = require('web3');

export function getWallet() {
    const web3 = new Web3(new Web3.providers.HttpProvider(""));
    const wallet = web3.eth.accounts.create();
    return wallet
}



