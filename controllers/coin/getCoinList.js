var authenticator = require("authenticator");
const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const CoinList = require("../../models/CoinList");
const Referral = require("../../models/Referral");
const RegisterMail = require("../../models/RegisterMail");
const RegisterSMS = require("../../models/RegisterSMS");
const UserRef = require("../../models/UserRef");
const Pairs = require("../../models/Pairs");
const Orders = require("../../models/Orders");
const LoginLogs = require("../../models/LoginLogs");
const SecurityKey = require("../../models/SecurityKey");
const Notification = require("../../models/Notifications");
const ReadNotification = require("../../models/ReadNotifications");
const SMSVerification = require("../../models/SMSVerification");
const MailVerification = require("../../models/MailVerification");
const CopyLeaderRequest = require("../../models/CopyTradeLeaderRequest");
const axios = require("axios");
const NotificationTokens = require("../../models/NotificationTokens");
const Withdraws = require("../../models/Withdraw");
const RegisteredAddress = require("../../models/RegisteredAddress");
var authFile = require("../../auth.js");
var notifications = require("../../notifications.js");
var utilities = require("../../utilities.js");
var mailer = require("../../mailer.js");
var CopyTrade = require("../../CopyTrade.js");
const CopyTradeModel = require("../../models/CopyTrade");
const Connection = require("../../Connection");
const { exit } = require("process");
const auth = require("../../auth.js");
const MarginOrder = require("../../models/MarginOrder");
const MarginWallet = require("../../models/MarginWallet");
const { ObjectId } = require("mongodb");
const { createHash, randomBytes } = require("crypto");

const MarginWalletId = "62ff3c742bebf06a81be98fd";

async function parseCoins(coins, amounts) {
  let parsedCoins = [];

  for (let i = 0; i < coins.length; i++) {
    let a = coins[i].toObject();
    let select = amounts.filter((amount) => amount.coin_id == a._id);
    if (select != null && select.length > 0) {
      let usdValue = 0;
      if (a.name != "USDT") {
        if (select[0].amount > 0)
          usdValue = await calcCoinValue(a.symbol, select[0].amount);
        else usdValue = 0;
      } else {
        usdValue = select[0].amount;
      }
      a.balance = splitLengthNumber(select[0].amount);
      a.usdValue = splitLengthNumber(usdValue);
    }
    parsedCoins.push(a);
  }
  return parsedCoins;
}

const calcCoinValue = async (coin, amount) => {
  let priceInfo = await axios(
    "http://global.oxhain.com:8542/price?symbol=" + coin + "USDT"
  );
  let price = priceInfo.data.data.ask;
  return price * amount;
};

const getCoinList = async function (req, res) {
  try {
    var api_key_result = req.body.api_key;
    var user_id = req.body.user_id;

    var result = await authFile.apiKeyChecker(api_key_result);

    if (result === true) {
      var coins = await CoinList.find({ status: 1 })
        .populate({ path: "image_url", model: "Image" })
        .exec();
      // console.log("coins", coins);

      let amounst = await Wallet.find({ user_id: user_id });
      let result = await parseCoins(coins, amounst);
      let map = new Map(result.map((item) => [item.name + item.symbol, item]));
      let uniqueArray = Array.from(map.values());

      res.json({
        status: "success",
        showableMessage: "success",
        data: uniqueArray,
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
function splitLengthNumber(q) {
  return q.toString().length > 10
    ? parseFloat(q.toString().substring(0, 10))
    : q;
}

module.exports = getCoinList;
