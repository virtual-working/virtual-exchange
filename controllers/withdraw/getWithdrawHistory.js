const CoinList = require("../../models/CoinList");
const Network = require("../../models/Network");
const WalletAddress = require("../../models/WalletAddress");
const Withdraw = require("../../models/Withdraw");

const GetWithdrawHistory = async (req, res) => {
  try {
    let { user_id } = req.body;

    if (!user_id) {
      return res.json({
        status: "fail",
        showableMessage: "user_id is required",
        message: "user_id is required",
      });
    }
    let userWalletsInWithdraw = await WalletAddress.find({
      user_id: user_id,
    }).exec();
    let withdrawHistory = await Withdraw.find({
      user_id: user_id,
      to: { $not: { $in: userWalletsInWithdraw.wallet_address } },
    }).exec();
    let withdrawHistoryData = [];

    for (let i = 0; i < withdrawHistory.length; i++) {
      let coinInfo = await CoinList.findOne({
        _id: withdrawHistory[i].coin_id,
      }).exec();
      let networkInfo = await Network.findOne({
        _id: withdrawHistory[i].network_id,
      }).exec();
      if (coinInfo == null || networkInfo == null) continue;
      let stat = "";
      if (withdrawHistory[i].status == 0) {
        stat = "pending";
      } else if (withdrawHistory[i].status == 1) {
        stat = "confirmed";
      } else if (withdrawHistory[i].status == 2) {
        stat = "rejected";
      }
      withdrawHistoryData.push({
        id: withdrawHistory[i]._id,
        currency: coinInfo.symbol,
        network: networkInfo.symbol,
        txid: withdrawHistory[i].tx_id,
        fee: withdrawHistory[i].fee,
        amount: withdrawHistory[i].amount,
        fromAddress: withdrawHistory[i].fromAddress,
        address: withdrawHistory[i].to,
        time: new Date(withdrawHistory[i].createdAt).toLocaleString(),
        status: stat,
      });
    }

    return res.json({
      status: "success",
      message: "withdraw history",
      data: withdrawHistoryData,
    });
  } catch (error) {
    res.json({
      success: "fail",
      showableMessage: "fail",
      message: "error",
    });
  }
};

module.exports = GetWithdrawHistory;
