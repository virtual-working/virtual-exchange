const Deposits = require("../../models/Deposits");
const Web3 = require("web3");
var authFile = require("../../auth");
const WalletAddress = require("../../models/WalletAddress");
const { default: axios } = require("axios");
const web3 = new Web3(process.env.web3Url);
const Withdraws = require("../../models/Withdraw");

const getAllDepositHistory = async (req, res) => {
  try {
    let { user_id, api_key } = req.body;
    var result = await authFile.apiKeyChecker(api_key);

    if (result === true) {
      let walletAddress = await WalletAddress.findOne({ user_id: user_id });
      const userWalletAddress = walletAddress.wallet_address;
      let dataOfRes = await getTransactionsForUser(userWalletAddress);
      let depositsData = [];
      // console.log("dataOfRes", dataOfRes);
      // dataOfRes.map((item) => {
      //   console.log(item.input.length, "length");
      //   const parametersData = item.input.slice(10);
      //   console.log(parametersData, "length");

      //   if (parametersData.length == 128) {
      //     const parametersData = item.input.slice(10);
      //     console.log("parametersData", parametersData);
      //     // Split into four parameters
      //     const param1 = parametersData.slice(0, 64);
      //     const param2 = parametersData.slice(64, 128);

      //     const decodedParam1 = web3.eth.abi.decodeParameter("address", param1);
      //     const decodedParam2 = web3.eth.abi.decodeParameter("uint256", param2);
      //     console.log("Decoded Parameter 1: ", decodedParam1);
      //     console.log(
      //       "Decoded Parameter 2: ",
      //       web3.utils.fromWei(decodedParam2)
      //     );
      //   } else if (parametersData.length == 256) {
      //     const param1 = parametersData.slice(0, 64);
      //     const param2 = parametersData.slice(64, 128);
      //     const param3 = parametersData.slice(128, 192);
      //     const param4 = parametersData.slice(192, 256);

      //     const decodedParam1 = web3.eth.abi.decodeParameter("address", param1);
      //     const decodedParam2 = web3.eth.abi.decodeParameter("address", param2);
      //     const decodedParam3 = web3.eth.abi.decodeParameter("address", param3);
      //     const decodedParam4 = web3.eth.abi.decodeParameter("uint256", param4);

      //     console.log("Decoded Parameter 1: ", decodedParam1);
      //     console.log("Decoded Parameter 2: ", decodedParam2);
      //     console.log("Decoded Parameter 3: ", decodedParam3);
      //     console.log(
      //       "Decoded Parameter 4: ",
      //       web3.utils.fromWei(decodedParam4)
      //     );
      //   }
      // });
      let resss = dataOfRes.filter((item) => {
        // let resABi = web3.eth.abi.decodeParameters(item.input);
        // console.log("resABi", resABi);

        return item.to == userWalletAddress.toLowerCase();
      });
      // console.log("resss", resss);
      // let resABi = web3.eth.abi.decodeParameters(resss.input);
      // console.log("resABi", resABi);
      resss.map(async (item) => {
        // console.log("length", item);
        const parametersData = item.input.slice(10);
        // console.log(parametersData, "length");

        if (parametersData.length == 128) {
          // console.log("parametersData", parametersData);
          // Split into four parameters
          const param1 = parametersData.slice(0, 64);
          const param2 = parametersData.slice(64, 128);

          const decodedParam1 = web3.eth.abi.decodeParameter("address", param1);
          const decodedParam2 = web3.eth.abi.decodeParameter("uint256", param2);
          // console.log("Decoded Parameter 1: ", decodedParam1);
          // console.log(
          //   "Decoded Parameter 2: ",
          //   web3.utils.fromWei(decodedParam2)
          // );
        } else if (parametersData.length == 256) {
          const param1 = parametersData.slice(0, 64);
          const param2 = parametersData.slice(64, 128);
          const param3 = parametersData.slice(128, 192);
          const param4 = parametersData.slice(192, 256);

          const decodedParam1 = web3.eth.abi.decodeParameter("address", param1);
          const decodedParam2 = web3.eth.abi.decodeParameter("address", param2);
          const decodedParam3 = web3.eth.abi.decodeParameter("address", param3);
          const decodedParam4 = web3.eth.abi.decodeParameter("uint256", param4);

          // console.log("Decoded Parameter 1: ", decodedParam1);
          // console.log("Decoded Parameter 2: ", decodedParam2);
          // console.log("Decoded Parameter 3: ", decodedParam3);
          // console.log(
          //   "Decoded Parameter 4: ",
          //   web3.utils.fromWei(decodedParam4)
          // );
        }
        let date = new Date(item.timeStamp * 1000);
        date = date.toLocaleString();

        depositsData.push({
          hash: item.hash,
          amount: web3.utils.fromWei(item.value),
          fromAddress: item.from,
          to: item.to,
          date: date,
          status: item.txreceipt_status,
          fee: web3.utils.fromWei(item.gasPrice),
        });
        let depoCheck = await Deposits.findOne({
          user_id: user_id,
          tx_id: item.hash,
        });

        if (depoCheck == null) {
          let newDepo = new Deposits({
            user_id: user_id,
            tx_id: item.hash,
            amount: web3.utils.fromWei(item.value),
            fromAddress: item.from,
            address: item.to,
            updatedAt: date,
            status: item.txreceipt_status,
            fee: web3.utils.fromWei(item.gasPrice),
          });
          await newDepo.save();
        }
      });
      let walletAdd = await WalletAddress.findOne({
        user_id: req.body.user_id,
      });
      walletAdd = walletAdd.wallet_address;
      let depositFromWithdraw = await Withdraws.find({ to: walletAdd });

      for (const item of depositFromWithdraw) {
        const fromAdd = await WalletAddress.findOne({
          user_id: item.user_id,
        });

        const modifiedItem = {
          hash: item.tx_id,
          amount: item.amount,
          fromAddress: fromAdd.wallet_address,
          to: item.to,
          date: new Date(item.createdAt).toLocaleString(),
          status: item.status,
          fee: item.fee,
        };

        depositsData.push(modifiedItem);
      }

      return res.json({
        status: "success",
        message: "deposit history",
        data: depositsData,
      });
    } else {
      return res.json({
        status: "fail",
        message: "Forbidden 403",
        showableMessage: "Forbidden 403",
      });
    }
  } catch (error) {
    return res.send({
      status: "fail",
      showableMessage: "fail",
      message: error,
    });
  }
};

const dataDeposit = (depositsData, depositFromWithdraw) => {
  let da = depositFromWithdraw.map(async (item) => {
    let fromAdd = await WalletAddress.findOne({
      user_id: item.user_id,
    }).exec();

    fromAdd = fromAdd.wallet_address;
    depositsData.push({
      hash: item.tx_id,
      amount: item.amount,
      fromAddress: fromAdd,
      to: item.to,
      date: new Date(item.createdAt).toLocaleString(),
      status: item.status,
      fee: item.fee,
    });
    // console.log("depositsData", depositsData);
    // return depositsData;
  });
  return da;
};
const getTransactionsForUser = async (userAddress) => {
  try {
    const API_KEY = "8WN6R8BQETCZBP47S1GCHSA8ZHPM1Y1HZK";
    const endBlock = await web3.eth.getBlockNumber();
    console.log("endBlock", endBlock);
    let resultOfBlock = await axios.get(
      `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=${endBlock}&sort=asc&apikey=${API_KEY}`
    );
    // console.log("resultOfBlock", resultOfBlock.data.result);
    return resultOfBlock.data.result;
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
};

module.exports = getAllDepositHistory;
