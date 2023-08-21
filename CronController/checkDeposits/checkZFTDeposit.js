const axios = require("axios");
const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const WalletAddress = require("../../models/WalletAddress");
const CoinList = require("../../models/CoinList");
const ContractAddressSchema = require("../../models/ContractAddress");
const Deposits = require("../../models/Deposits");
var authFile = require("../../auth.js");
const utilities = require("../../utilities");
require("dotenv").config();

const checkZFTDeposit = async () => {
  try {
    let networkID = "6359169ee5f78e20c0bb809a";
    const coinID = "64959e2e7e1705bacda3e1d0";
    let wallets = await WalletAddress.find();
    // console.log("wallets", wallets);
    for (var i = 0; i < wallets.length; i++) {
      let wallet = wallets[i];
      let coins = await CoinList.find();
      console.log("wallet", coins.length, wallets.length);
      for (let ib = 0; ib < coins.length; ib++) {
        let dep = await Deposits.find();
        console.log("dep", dep);
      }
      return;
    }
  } catch (err) {
    console.log("BNB Deposit err : ", err.message);
  }
};

module.exports = checkZFTDeposit;
