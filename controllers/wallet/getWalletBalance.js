const Wallet = require("../../models/Wallet");
const Pairs = require("../../models/Pairs");
var authFile = require("../../auth.js");
const CoinList = require("../../models/CoinList");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequest = require("../../models/ApiRequests");
const Web3 = require("web3");
const web3 = new Web3(process.env.web3Url);
const contractABI = require("../withdraw/contract.json");

const getWalletBalance = async function (req, res) {
  try {
    var api_key_result = req.body.api_key;
    let result = await authFile.apiKeyChecker(api_key_result);
    if (result === true) {
      let coin = await CoinList.findOne({
        _id: req.body.coin_id,
        status: 1,
      }).exec();
      console.log("coin", coin);

      let id = coin._id.toString();
      var _wallets = await Wallet.findOne({
        user_id: req.body.user_id,
        coin_id: id,
      }).exec();
      // console.log("_wallets", _wallets);
      if (!_wallets)
        return res.json({
          status: "Success",
          showableMessage: "Coin not found in wallet",
          message: "coin_not_found",
        });

      const contractOfTransfer = new web3.eth.Contract(
        contractABI,
        process.env.contractAddress
      );
      let tokenBalance = 0;
      if (req.body.coin_id == "647441da2fb79b25ec8a3b79") {
        tokenBalance = await contractOfTransfer.methods
          .getUserBalance(_wallets.address)
          .call();
      } else {
        tokenBalance = await contractOfTransfer.methods
          .getUserTokenBalance(coin.contract_address, _wallets.address)
          .call();
      }

      console.log("tokenBalance", tokenBalance);
      tokenBalance = web3.utils.fromWei(tokenBalance);
      tokenBalance = parseFloat(tokenBalance);
      // console.log("tokenBalance", tokenBalance);
      _wallets.amount = tokenBalance;
      console.log("_wallets", _wallets);

      await _wallets.save();
      let wallets = {
        id: _wallets._id,
        coin_id: _wallets.coin_id,
        amount: tokenBalance,
        // symbolName: coin.symbol + "/USDT",
        symbol: coin.symbol,
        name: coin.name,
        icon: coin.image_url,
      };

      // console.log("wallets", wallets);

      res.json({
        status: "success",
        showableMessage: "success",
        data: wallets,
      });
    } else {
      return res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden 403",
      });
    }
  } catch (error) {
    res.json({
      success: "fail",
      showableMessage: "fail",
      data: { amount: 0.0 },
    });
  }
};

module.exports = getWalletBalance;
