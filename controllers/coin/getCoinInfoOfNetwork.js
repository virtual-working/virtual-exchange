const CoinList = require("../../models/CoinList");
var authFile = require("../../auth.js");

const getCoinInfoForNetwork = async function (req, res) {
  var api_key_result = req.body.api_key;

  var result = await authFile.apiKeyChecker(api_key_result);

  if (result === true) {
    CoinList.findOne({
      name: req.body.name,
      symbol: req.body.symbol,
      network: req.body.network,
      status: 1,
    })
      .then((coins) => {
        // console.log("coins", coins);
        if (coins == null) {
          return res.json({
            status: "fail",
            showableMessage: "Wallet not found",
            message: "Wallet_not_found",
          });
        }
        return res.json({
          status: "success",
          showableMessage: "Wallet found",
          data: coins,
        });
      })
      .catch((err) => {
        return res.json({
          status: "fail",
          showableMessage: "fail",
          message: err,
        });
      });
  } else {
    return res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });
  }
};

module.exports = getCoinInfoForNetwork;
