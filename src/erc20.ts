const Web3 = require('web3');
const WEthAbi = require("../ABI/weth.json");
const Provider = require('@truffle/hdwallet-provider');
const JSBI = require("jsbi");
import { TxInfo, noExp, trimHex } from "./utils";


export class Erc20 {
    web3: any;
    cnt: any;
    numDecimals: number = 18;
    myAddress: string;
    key: string;
    maxPriorityFee: number;

    constructor(address: string, httpConnector: string, key: string, maxPriorityFee: number) {
        this.web3 = new Web3(new Provider(trimHex(key), httpConnector));
        this.cnt = new this.web3.eth.Contract(WEthAbi, address);
        this.key = key;
        this.myAddress = this.web3.eth.accounts.privateKeyToAccount(key).address;
        this.maxPriorityFee = maxPriorityFee;
    }

    async initialize() {
        try {
            this.numDecimals = Number(await this.cnt.methods.decimals().call());
        } catch (e) {
            console.log(`Failed to get number of decimals with error ${e}`);
            this.numDecimals = 18;
        }
    }

    async getBalance(address: string) {
        return Number(await (this.cnt.methods.balanceOf(address).call())) / 10 ** this.numDecimals;
    }

    async getMyBalance() {
        return Number(await (this.cnt.methods.balanceOf(this.myAddress).call())) / 10 ** this.numDecimals;
    }

    private getTxParams(value: number): TxInfo {
        console.log(`get value: ${value * 10 ** this.numDecimals}, address: ${this.myAddress}`);

        return {
            from: this.myAddress,
            gas: 100000,
            maxPriorityFeePerGas: this.maxPriorityFee,
            maxFeePerGas: 100 * 10 ** 9,
            value: noExp(value * 10 ** this.numDecimals),
        }
    }

    async deposit(amount: number) {
        return await this.cnt.methods.deposit().send(this.getTxParams(amount));
    }

    async getAllowance(spender: string) {
        return await this.cnt.methods.allowance(this.myAddress, spender).call() / 10 ** this.numDecimals;
    }

    async approve(spender: string, amount: number) {
        return await this.cnt.methods.approve(spender, noExp(amount * 10 ** this.numDecimals)).send(this.getTxParams(0));
    }

    async approveMax(spender: string) {
        const maxNum = JSBI.subtract(JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(256)), JSBI.BigInt(1000));
        return await this.cnt.methods.approve(spender, maxNum.toString()).send(this.getTxParams(0));
    }

}