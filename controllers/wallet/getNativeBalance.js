const Wallet = require("../../models/Wallet");
var authFile = require("../../auth.js");
const Web3 = require("web3");
const web3 = new Web3(process.env.web3Url);

const getNativeBalance = async function (req, res) {
  try {
    var api_key_result = req.body.api_key;
    let result = await authFile.apiKeyChecker(api_key_result);

    if (result === true) {
      var list = await Wallet.findOne({
        user_id: req.body.user_id,
        coinName: "BNB",
      }).exec();
      if (list == null) {
        return res.json({
          status: "fail",
          showableMessage: "Wallet not found",
          message: "Wallet_not_found",
        });
      }

      let balance = await getBalance(list.address);
      list.amount = balance;
      await list.save();
      return res.json({
        status: "success",
        showableMessage: "success",
        data: balance,
      });
    } else {
      return res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden 403",
      });
    }
  } catch (error) {
    return res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });
  }
};

const getBalance = async (address) => {
  try {
    let balance = await web3.eth.getBalance(address);
    balance = web3.utils.fromWei(balance, "ether");
    return balance;
  } catch (error) {
    console.error("An error occurred while sending the transaction:", error);
  }
};
module.exports = getNativeBalance;
