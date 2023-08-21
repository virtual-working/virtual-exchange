const Orders = require("../../../models/Orders");
const Wallet = require("../../../models/Wallet");
const ContractAbi = require("../../../controllers/withdraw/contract.json");
const Web3 = require("web3");
const WalletAddress = require("../../../models/WalletAddress");
const contractAddress = process.env.contractAddress;
const web3 = new Web3(process.env.web3Url);
const tokenContractABI = require("../../../controllers/withdraw/token.json");
const CoinList = require("../../../models/CoinList");
const Tx = require("@ethereumjs/tx").Transaction;
const Common = require("@ethereumjs/common").default;
const contractOfTransfer = new web3.eth.Contract(ContractAbi, contractAddress);

const AddLimitSellOrder = async (req, res, getPair, api_result, apiRequest) => {
  let percent = parseFloat(req.body.percent);
  let target_price = parseFloat(req.body.target_price);
  let amount = parseFloat(req.body.amount);

  var fromWallet = await Wallet.findOne({
    coin_id: req.body.symbolId,
    user_id: req.body.user_id,
  }).exec();
  let balance = parseFloat(fromWallet.amount);
  // console.log("fromWallet", fromWallet);
  // console.log("target_price", target_price);
  // return;
  let total = amount * target_price;
  const getToWalletAddress = await WalletAddress.findOne({
    user_id: req.body.user_id,
  }).exec();
  const account = web3.eth.accounts.privateKeyToAccount(
    getToWalletAddress.private_key
  );
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;
  let fromAddress = account.address;
  const pvKey = getToWalletAddress.private_key.slice(2);
  const privateKey = Buffer.from(pvKey, "hex");
  let tokenContractAddress = await CoinList.findById(req.body.symbolId);

  tokenContractAddress = tokenContractAddress.contract_address;
  console.log("tokenContractAddress", tokenContractAddress);
  const contractOfTokenTransfer = new web3.eth.Contract(
    tokenContractABI,
    tokenContractAddress
  );

  // amount = splitLengthNumber(amount);
  if (amount <= 0) {
    return res.json({
      status: "fail",
      showableMessage: "Invalid amount",
      message: "Invalid amount",
    });
  }
  if (balance < total) {
    return res.json({
      status: "fail",
      showableMessage: "Invalid  balance",
      message: "Invalid  balance",
    });
  }
  console.log("percent", percent, target_price, getPair.symbolTwoID);
  let totalAmount = 0;
  let filteredRecords = [];

  let checkBuyOrder = await Orders.find({
    type: "limit",
    method: "buy",
    pair_name: req.body.pair_name,
    // first_pair: !req.body.symbolId,
    target_price: { $gte: target_price },
    status: 1,
  }).sort({ target_price: -1, createdAt: 1 });
  console.log("checkBuyOrder", checkBuyOrder);
  // return
  if (!checkBuyOrder)
    return res.json({
      status: "Success",
      showableMessage: "Selling order is Placed",
      message: "buy_order_empty",
    });
  checkBuyOrder.forEach((record) => {
    if (totalAmount >= amount) {
      return;
    }
    totalAmount += record.amount;
    filteredRecords.push(record);
  });

  console.log("filteredRecords", filteredRecords);
  let amountToremove = amount;
  // for (record of filteredRecords) {
  //   await (async () => {
  //     if (parseFloat(amountToremove) >= parseFloat(record.amount)) {
  //       console.log("record", record);
  //       amountToremove = amountToremove - record.amount;

  //       /// minus the amount from wallet
  //       var fromWallet = await Wallet.findOne({
  //         coin_id: record.first_pair,
  //         user_id: record.user_id,
  //       }).exec();
  //       console.log("fromWallet", fromWallet);

  //       // console.log(
  //       //   fromWallet.amount,
  //       //   fromWallet.amount - record.amount,
  //       //   "fromWallet"
  //       // );
  //       fromWallet.amount =
  //         parseFloat(fromWallet.amount) + parseFloat(record.amount);
  //       await fromWallet.save();
  //       console.log("fromWallet.amount", fromWallet.amount);

  //       /// add the amount to wallet

  //       var towallet = await Wallet.findOne({
  //         coin_id: record.first_pair,
  //         user_id: req.body.user_id,
  //       }).exec();
  //       console.log("towallet.amount", towallet);

  //       // console.log(
  //       //   towallet.amount,
  //       //   towallet.amount + record.amount,
  //       //   "towllet"
  //       // );
  //       towallet.amount =
  //         parseFloat(towallet.amount) + parseFloat(record.amount);
  //       await towallet.save();
  //       console.log("romWallet.amount", towallet.amount);

  //       ////now transfer the buy coins from seller account to buyer
  //       // console.log("getPair", getPair);
  //       var fromWalletCoin = await Wallet.findOne({
  //         coin_id: req.body.symbolId,
  //         user_id: req.body.user_id,
  //       }).exec();
  //       console.log("fromWalletCoin", fromWalletCoin);
  //       let totalCoinRemove =
  //         parseFloat(record.amount) * parseFloat(record.target_price);
  //       fromWalletCoin.amount =
  //         parseFloat(fromWalletCoin.amount) - parseFloat(totalCoinRemove);
  //       await fromWalletCoin.save();

  //       var toWalletCoin = await Wallet.findOne({
  //         coin_id: req.body.symbolId,
  //         user_id: record.user_id,
  //       }).exec();
  //       console.log("toWalletCoin", toWalletCoin);
  //       toWalletCoin.amount =
  //         parseFloat(toWalletCoin.amount) + parseFloat(totalCoinRemove);
  //       await toWalletCoin.save();
  //       record.amount = 0;
  //       if (record.amount == 0) {
  //         record.status = 0;
  //       }
  //       await record.save();
  //     } else {
  //       console.log("in else", amountToremove);
  //       record.amount = parseFloat(record.amount) - parseFloat(amountToremove);
  //       var fromWallet = await Wallet.findOne({
  //         coin_id: record.first_pair,
  //         user_id: record.user_id,
  //       }).exec();
  //       // console.log(
  //       //   fromWallet.amount,
  //       //   fromWallet.amount - amountToremove,
  //       //   "fromWallet in else"
  //       // );
  //       console.log("fromWallet", fromWallet);
  //       fromWallet.amount =
  //         parseFloat(fromWallet.amount) + parseFloat(amountToremove);
  //       await fromWallet.save();
  //       console.log("fromWallet", fromWallet.amount);

  //       var towallet = await Wallet.findOne({
  //         coin_id: record.first_pair,
  //         user_id: req.body.user_id,
  //       }).exec();
  //       // console.log(
  //       //   towallet.amount,
  //       //   towallet.amount + amountToremove,
  //       //   "towllet in else"
  //       // );
  //       console.log("towallet", towallet);
  //       towallet.amount =
  //         parseFloat(towallet.amount) - parseFloat(amountToremove);
  //       await towallet.save();

  //       console.log("towallet", towallet.amount);

  //       ////now transfer the buy coins from seller account to buyer
  //       console.log("getPair", getPair);
  //       var fromWalletCoin = await Wallet.findOne({
  //         coin_id: req.body.symbolId,
  //         user_id: req.body.user_id,
  //       }).exec();
  //       console.log("fromWalletCoin", fromWalletCoin);
  //       let totalCoinRemove =
  //         parseFloat(amountToremove) * parseFloat(record.target_price);
  //       fromWalletCoin.amount = fromWalletCoin.amount + totalCoinRemove;
  //       await fromWalletCoin.save();
  //       console.log("fromWalletCoin.amount", fromWalletCoin.amount);

  //       var toWalletCoin = await Wallet.findOne({
  //         coin_id: req.body.symbolId,
  //         user_id: record.user_id,
  //       }).exec();
  //       console.log("toWalletCoin", toWalletCoin);

  //       if (record.amount == 0) {
  //         record.status = 0;
  //       }

  //       await record.save();
  //       // console.log(toWalletCoin, "toWalletCoin");
  //       toWalletCoin.amount =
  //         parseFloat(toWalletCoin.amount) - parseFloat(totalCoinRemove);
  //       await toWalletCoin.save();
  //       console.log("toWalletCoin", toWalletCoin.amount);

  //       amountToremove = 0;
  //     }
  //   })();
  // }

  /// check for order reamining or not

  let sts = parseFloat(amountToremove) > 0 ? 1 : 0;
  if (sts != 0) {
    console.log("into send singnature");
    const nonce = await web3.eth.getTransactionCount(fromAddress, "pending");
    console.log("nonce", nonce);

    const gasPrice = await web3.eth.getGasPrice();
    console.log("gasPrice", gasPrice);
    console.log(
      "amountToremove==req.body.amount",
      amountToremove == req.body.amount
    );
    let commission;
    if (amountToremove == req.body.amount) {
      commission = 0.001; ////commission set for now

      console.log("amountToremove", amountToremove, target_price);

      // amountToremove = amountToremove * target_price;
      console.log("amountToremove", amountToremove);

      if (parseFloat(amountToremove) > 999) {
        let result = parseInt(amountToremove / 1000);
        console.log("result", result);
        result += 1;
        // let commission = 0.000001; ////commission set for now
        commission = commission * result;
        console.log(commission, "commission");
      }
    } else {
      commission = 0;
    }
    let total =
      parseFloat(commission) + parseFloat(web3.utils.fromWei(gasPrice));
    console.log(total, "total");
    // const amount = web3.utils.toWei(amounts.toString());
    total = total.toFixed(10).toString();
    let userBalance = await getBalance(fromAddress);
    // console.log("userbalance", userBalance);
    let checkBal =
      parseFloat(userBalance) -
      parseFloat(commission) +
      parseFloat(web3.utils.fromWei(gasPrice));
    console.log("checkBal", checkBal);
    if (parseFloat(checkBal) <= 0) {
      return res.json({
        success: "success",
        showableMessage: "balance is low",
        message: "balance_low",
      });
    }
    // console.log(contractOfTransfer, "contractOfTransfer");
    // console.log(recipientAddress, "recipientAddress");
    // console.log(fromAddress, "fromAddress");
    console.log("total in native", total);
    // console.log(
    //   "amount",
    //   web3.utils.toWei(req.body.amount.toString(), "ether")
    // );
    console.log("amountToremove", amountToremove, typeof amountToremove);
    let newStringAmount = amountToremove.toFixed(18).toString();
    console.log("newStringAmount", newStringAmount, typeof newStringAmount);

    let AmountForApprove = web3.utils.toWei(newStringAmount, "ether");
    console.log("AmountForApprove", AmountForApprove);
    console.log("contractAddress", contractAddress);

    const approveTokens = async (contractAddress, tokenApprove, privateKey) => {
      try {
        const nonce = await web3.eth.getTransactionCount(
          fromAddress,
          "pending"
        );
        console.log("nonce", nonce);
        const gasPrice = await web3.eth.getGasPrice();
        console.log("gasPrice", gasPrice);

        const gasLimit = await tokenApprove.estimateGas({ from: fromAddress });
        console.log("gasLimit", gasLimit);

        const txData = {
          nonce: web3.utils.toHex(nonce),
          gasPrice: web3.utils.toHex(gasPrice),
          gasLimit: web3.utils.toHex(gasLimit) || web3.utils.toHex("2000000"),
          to: tokenContractAddress,
          data: tokenApprove.encodeABI(),
        };

        const common = Common.forCustomChain(
          "mainnet",
          {
            name: "binance",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );
        const transaction = Tx.fromTxData(txData, { common });
        const signedTransaction = transaction.sign(privateKey);

        const receipt = await web3.eth
          .sendSignedTransaction(
            "0x" + signedTransaction.serialize().toString("hex")
          )
          .on("receipt", (receipt) => {
            // console.log("Receipt:", receipt);
          })
          .then((response) => {
            console.log("response of token approve", response);
            return;
          });

        // console.log("Transaction receipt:", receipt);
      } catch (error) {
        console.error(
          "An error occurred while sending the transaction:",
          error
        );
      }
    };

    ////function for sendToken;
    const sendSignedTransaction = async (
      fromAddress,
      contractAddress,
      contractMethod,
      total,
      privateKey
    ) => {
      try {
        const nonce = await web3.eth.getTransactionCount(
          fromAddress,
          "pending"
        );

        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = await contractMethod.estimateGas({
          from: fromAddress,
        });
        // commission = web3.utils.toWei(commission.toString());
        ////checking for sender
        let fromWallet = await Wallet.findOne({
          address: fromAddress,
          coin_id: req.body.symbolId,
        }).exec();
        if (fromWallet == null)
          return res.json({
            success: "success",
            showableMessage: "Wallet not found",
            message: "wallet_not_found",
          });
        let com = web3.utils.toWei(total.toString());

        const txData = {
          nonce: web3.utils.toHex(nonce),
          gasPrice: web3.utils.toHex(gasPrice),
          gasLimit: web3.utils.toHex("2000000"),
          to: contractAddress,
          value: web3.utils.toHex(com),
          data: contractMethod.encodeABI(),
        };

        const common = Common.forCustomChain(
          "mainnet",
          {
            name: "binance",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );
        const transaction = Tx.fromTxData(txData, { common });
        const signedTransaction = transaction.sign(privateKey);

        const receipt = await web3.eth
          .sendSignedTransaction(
            "0x" + signedTransaction.serialize().toString("hex")
          )
          .on("transactionHash", (hash) => {
            console.log("Transaction hash:", hash);
          })
          .on("receipt", (receipt) => {
            console.log("Receipt:", receipt);
          })
          .on("confirmation", async (confirmationNumber, receipt) => {
            console.log("receipt on confirmation", receipt);
          })
          .on("error", (error) => {
            console.error("Error:", error);
            return res.json({
              stauts: "fail",
              showableMessage: "fail",
              error: error,
            });
          })
          .then(async (receipt) => {
            console.log("Final receipt:", receipt.transactionHash);

            let tokenBalanceFromWallet = await contractOfTransfer.methods
              .getUserTokenBalance(tokenContractAddress, fromAddress)
              .call();

            tokenBalanceFromWallet = web3.utils.fromWei(tokenBalanceFromWallet);
            tokenBalanceFromWallet = parseFloat(tokenBalanceFromWallet);
            fromWallet.amount = tokenBalanceFromWallet;
            // parseFloat(fromWallet.amount) - parseFloat(amounts);

            await fromWallet.save();

            const orders = new Orders({
              first_pair: req.body.symbolId,
              pair_name: getPair.name,
              user_id: req.body.user_id,
              amount: toPlainString(amountToremove),
              tokenAmount: toPlainString(amount),
              open_price: 0,
              type: "limit",
              method: "sell",
              target_price: target_price,
              status: sts,
            });
            let saved = await orders.save();
            // let saved = false;
            if (saved) {
              // fromWallet.amount = fromWallet.amount - total;
              // await fromWallet.save();
              if (api_result === false) {
                apiRequest.status = 1;
                await apiRequest.save();
              }

              return res.json({
                status: "success",
                showableMessage: "Sell Limit Order Successfully Created",
                data: receipt,
              });
            } else {
              return res.json({
                status: "fail",
                showableMessage: "Unknown error",
                message: "Unknow error",
              });
            }
          });
      } catch (error) {
        console.error(
          "An error occurred while sending the transaction:",
          error
        );
        return res.json({
          stauts: "fail",
          showableMessage: "forbidden 403",
          message: "forbidden_403",
        });
      }
    };

    const tokenApprove = await contractOfTokenTransfer.methods.approve(
      contractAddress,
      AmountForApprove
    );
    await approveTokens(contractAddress, tokenApprove, privateKey);
    const contractMethod = contractOfTransfer.methods.SellTokenOrder(
      tokenContractAddress,
      AmountForApprove
    );

    await sendSignedTransaction(
      fromAddress,
      contractAddress,
      contractMethod,
      total,
      privateKey
    );
    // let gasLimitForApprove = await contractOfTokenTransfer.methods
    //   .approve(contractAddress, AmountForApprove)
    //   .estimateGas({
    //     from: fromAddress,
    //     value: web3.utils.toWei(total.toString(), "ether"),
    //   });
    // let resOfapprove = await contractOfTokenTransfer.methods
    //   .approve(contractAddress, AmountForApprove)
    //   .send({
    //     from: fromAddress,
    //     gas: gasLimitForApprove,
    //     gasPrice: web3.utils.fromWei(gasPrice, "gwei"),
    //   });
    // console.log("resOfapprove", resOfapprove);
    return;
    let com = web3.utils.toWei(commission.toString());
    console.log("com", com);
    let gasLimit = await contractOfTransfer.methods.BuyPayOrder().estimateGas({
      from: fromAddress,
      value: web3.utils.toWei(total.toString(), "ether"),
    });
    let resss = await contractOfTransfer.methods.BuyPayOrder().send({
      from: fromAddress,
      gas: gasLimit,
      gasPrice: web3.utils.fromWei(gasPrice, "gwei"),
      value: web3.utils.toWei(total.toString(), "ether"),
    });
  }
  const orders = new Orders({
    first_pair: req.body.symbolId,
    pair_name: getPair.name,
    user_id: req.body.user_id,
    amount: toPlainString(amountToremove),
    tokenAmount: toPlainString(amount),
    open_price: 0,
    type: "limit",
    method: "sell",
    target_price: target_price,
    status: sts,
  });
  let saved = await orders.save();
  // let saved = false;
  if (saved) {
    // fromWallet.amount = fromWallet.amount - total;
    // await fromWallet.save();
    if (api_result === false) {
      apiRequest.status = 1;
      await apiRequest.save();
    }
    return res.json({
      status: "success",
      showableMessage: "Sell Limit Order Successfully Created",
      data: saved,
    });
  } else {
    return res.json({
      status: "fail",
      showableMessage: "Unknown error",
      message: "Unknow error",
    });
  }
};
function splitLengthNumber(q) {
  return q.toString().length > 10
    ? parseFloat(q.toString().substring(0, 10))
    : q;
}
module.exports = AddLimitSellOrder;

function toPlainString(num) {
  return ("" + +num).replace(
    /(-?)(\d*)\.?(\d*)e([+-]\d+)/,
    function (a, b, c, d, e) {
      return e < 0
        ? b + "0." + Array(1 - e - c.length).join(0) + c + d
        : b + c + d + Array(e - d.length + 1).join(0);
    }
  );
}

const getBalance = async (address) => {
  try {
    let balance = await web3.eth.getBalance(address);

    console.log("Balance:", web3.utils.fromWei(balance, "ether"), "ETH");
    return web3.utils.fromWei(balance, "ether");
  } catch (error) {
    console.error("An error occurred while sending the transaction:", error);
  }
};
