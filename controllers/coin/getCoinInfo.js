const CoinList = require("../../models/CoinList");
var authFile = require("../../auth.js");

const getCoinInfo = async function (req, res) {
  var api_key_result = req.body.api_key;

  var result = await authFile.apiKeyChecker(api_key_result);

  if (result === true) {
    CoinList.findOne({ _id: req.body.coin_id })
      .then((coins) => {
        res.json({
          status: "success",
          showableMessage: "success",
          data: coins,
        });
      })
      .catch((err) => {
        res.json({ status: "fail", showableMessage: "fail", message: err });
      });
  } else {
    res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });
  }
};

module.exports = getCoinInfo;
