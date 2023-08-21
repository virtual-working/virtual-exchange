const Orders = require("../../../models/Orders");
const Wallet = require("../../../models/Wallet");
const ContractAbi = require("../../../controllers/withdraw/contract.json");
const Web3 = require("web3");
const WalletAddress = require("../../../models/WalletAddress");
const contractAddress = process.env.contractAddress;
const web3 = new Web3(process.env.web3Url);
const Tx = require("@ethereumjs/tx").Transaction;
const Common = require("@ethereumjs/common").default;
const tokenContractABI = require("../../../controllers/withdraw/token.json");
const CoinList = require("../../../models/CoinList");
const AddLimitBuyOrder = async (req, res, getPair, api_result, apiRequest) => {
  const contractOfTransfer = new web3.eth.Contract(
    ContractAbi,
    contractAddress
  );

  let percent = parseFloat(req.body.percent);
  let target_price = parseFloat(req.body.target_price);
  let amount = parseFloat(req.body.amount);
  console.log("get pair in addBuy", getPair);
  var towallet = await Wallet.findOne({
    coin_id: req.body.symbolId,
    user_id: req.body.user_id,
  }).exec();
  // console.log("towallet", towallet);
  // console.log("target_price", target_price);
  // return;
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
  // console.log("percent", percent, target_price, getPair);
  let balance = towallet.amount;
  console.log("amount<= 0", amount);

  console.log("amount<= 0", amount <= 0);
  if (amount <= 0) {
    return res.json({
      status: "fail",
      showableMessage: "Invalid amount",
      message: "Invalid amount",
    });
  }
  let total = amount * target_price;
  if (balance < total) {
    return res.json({
      status: "fail",
      showableMessage: "Low balance",
      message: "Invalid  balance",
    });
  }

  // let search = Orders.aggregate([
  //   // {
  //   //   $match: {
  //   //     target_price: { $lte: req.body.target_price },
  //   //   },
  //   // },
  //   {
  //     $group: {
  //       _id: null,
  //       totalAmount: { $sum: "$amount" }, // Field to sum
  //     },
  //   },
  // ]).exec(function (err, result) {
  //   if (err) {
  //     console.error("Error executing aggregate:", err);
  //     return;
  //   }
  //   console.log("result", result);
  //   const sum = result.length > 0 ? result[0].totalAmount : 0;
  //   console.log("Sum:", sum);
  // });

  // console.log("search", search);

  let totalAmount = 0;
  let filteredRecords = [];
  let checkSellOrder = await Orders.find({
    type: "limit",
    method: "sell",
    pair_name: req.body.pair_name,
    status: 1,
    // first_pair: !req.body.symbolId,
    target_price: { $lte: target_price },
  }).sort({ target_price: 1, createdAt: 1 });

  console.log("checkSellOrder", checkSellOrder);
  // return;
  if (!checkSellOrder)
    return res.json({
      status: "Success",
      showableMessage: "Buying order is Placed",
      message: "sell_order_empty",
    });
  checkSellOrder.forEach((record) => {
    if (totalAmount >= amount) {
      return;
    }
    totalAmount += record.amount;
    filteredRecords.push(record);
  });

  console.log("filteredRecords in", filteredRecords, filteredRecords.length);

  console.log("rec", totalAmount);
  // return;
  let amountToremove = amount;
  for (record of filteredRecords) {
    console.log("record", record);

    await (async () => {
      if (parseFloat(amountToremove) >= parseFloat(record.amount)) {
        let aaaaa = amountToremove;
        amountToremove = parseFloat(amountToremove) - parseFloat(record.amount);
        console.log("record in if", record, amountToremove);

        // return;

        /// minus the amount from wallet
        var fromWallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: record.user_id,
        }).exec();
        // console.log(
        //   fromWallet.amount,
        //   fromWallet.amount - record.amount,
        //   "fromWallet"
        // );
        fromWallet.amount =
          parseFloat(fromWallet.amount) - parseFloat(record.amount);
        await fromWallet.save();

        /// add the amount to wallet

        var towallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: req.body.user_id,
        }).exec();
        // console.log(
        //   towallet.amount,
        //   towallet.amount + record.amount,
        //   "towllet"
        // );
        towallet.amount =
          parseFloat(towallet.amount) + parseFloat(record.amount);
        await towallet.save();

        ////now transfer the buy coins from seller account to buyer
        // console.log("getPair", getPair);
        var fromWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: req.body.user_id,
        }).exec();
        // console.log(fromWalletCoin, "fromWalletCoin");
        let totalCoinRemove =
          parseFloat(record.amount) * parseFloat(record.target_price);
        fromWalletCoin.amount =
          parseFloat(fromWalletCoin.amount) - parseFloat(totalCoinRemove);
        await fromWalletCoin.save();

        var toWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: record.user_id,
        }).exec();
        // console.log(toWalletCoin, "toWalletCoin");
        toWalletCoin.amount =
          parseFloat(toWalletCoin.amount) + parseFloat(totalCoinRemove);
        await toWalletCoin.save();

        console.log("record record", record);
        let val = totalCoinRemove;
        let commissionIfAmount;
        if (aaaaa == req.body.amount) {
          commissionIfAmount = 0.001;

          // console.log("amountToremove", amountToremove, target_price);

          let val = record.amount * record.target_price;
          // console.log("amountToremove", amountToremove);

          if (parseFloat(val) > 999) {
            let result = parseInt(val / 1000);
            console.log("result", result);
            result += 1;
            // let commissionIfAmount = 0.000001; ////commissionIfAmount set for now
            commissionIfAmount = commissionIfAmount * result;
            console.log(commissionIfAmount, "commissionIfAmount");
          }
        } else {
          commissionIfAmount = 0;
        }
        val = commissionIfAmount + val;
        // BUY(amountReciever, ZFTtokenAddress, commission, amountToremove).send(
        //   commision + price + gas
        // );
        // let addressTOkenTOSend = await CoinList.findById(record.first_pair);
        let addressTOkenTOSend = await CoinList.findById(req.body.symbolId);

        console.log("addressTOkenTOSend", addressTOkenTOSend.contract_address);
        // return;
        commissionIfAmount = web3.utils.toWei(commissionIfAmount.toString());
        console.log("commissionIfAmount", commissionIfAmount);

        // console.log("aaaaa", aaaaa);

        console.log("va", record.amount);

        const contractMethod = await contractOfTransfer.methods.BUY(
          fromWallet.address,
          addressTOkenTOSend.contract_address,
          commissionIfAmount,
          record.amount
        );
        console.log("contractMethod", contractMethod);

        const nonce = await web3.eth.getTransactionCount(
          fromAddress,
          "pending"
        );

        const gasPrice = await web3.eth.getGasPrice();
        let coma = web3.utils.toWei(val.toString());

        const txData = {
          nonce: web3.utils.toHex(nonce),
          gasPrice: web3.utils.toHex(gasPrice),
          gasLimit: web3.utils.toHex("2000000"),
          to: contractAddress,
          value: web3.utils.toHex(coma),
          data: contractMethod.encodeABI(),
        };
        console.log("txData", txData);

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

            await fromWallet.save(); /////should add after checking
          });
        record.amount = 0;
        if (record.amount == 0) {
          record.status = 0;
        }
        await record.save();
      } else {
        console.log("in else", amountToremove, record);
        record.amount = parseFloat(record.amount) - parseFloat(amountToremove);
        console.log("record.amount", record.amount, record);
        // return;

        var fromWallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: record.user_id,
        }).exec();
        console.log(fromWallet, "fromWallet in else");
        // return;
        fromWallet.amount =
          parseFloat(fromWallet.amount) - parseFloat(amountToremove);
        await fromWallet.save();

        var towallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: req.body.user_id,
        }).exec();
        // console.log(
        //   towallet.amount,
        //   towallet.amount + amountToremove,
        //   "towllet in else"
        // );
        towallet.amount =
          parseFloat(towallet.amount) + parseFloat(amountToremove);
        await towallet.save();

        ////now transfer the buy coins from seller account to buyer
        console.log("getPair", getPair);
        var fromWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: req.body.user_id,
        }).exec();
        // console.log(fromWalletCoin, "fromWalletCoin");
        let totalCoinRemove =
          parseFloat(amountToremove) * parseFloat(record.target_price);
        fromWalletCoin.amount = fromWalletCoin.amount - totalCoinRemove;
        await fromWalletCoin.save();

        var toWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: record.user_id,
        }).exec();
        if (record.amount == 0) {
          record.status = 0;
        }

        await record.save();
        console.log(toWalletCoin, "toWalletCoin");
        toWalletCoin.amount =
          parseFloat(toWalletCoin.amount) + parseFloat(totalCoinRemove);
        await toWalletCoin.save();
        let val = totalCoinRemove;
        let commissionIfAmount;
        if (amountToremove == req.body.amount) {
          commissionIfAmount = 0.001;
          if (parseFloat(val) > 999) {
            let result = parseInt(val / 1000);

            result += 1;
            // let commissionIfAmount = 0.000001; ////commissionIfAmount set for now
            commissionIfAmount = commissionIfAmount * result;
          }
        } else {
          commissionIfAmount = 0;
        }
        val = commissionIfAmount + val;
        // BUY(amountReciever, ZFTtokenAddress, commission, amountToremove).send(
        //   commision + price + gas
        // );
        // let addressTOkenTOSend = await CoinList.findById(record.first_pair);
        let addressTOkenTOSend = await CoinList.findById(req.body.symbolId);

        console.log("addressTOkenTOSend", addressTOkenTOSend.contract_address);
        // return;
        commissionIfAmount = web3.utils.toWei(commissionIfAmount.toString());
        console.log("commissionIfAmount", commissionIfAmount);
        let aaaaa = web3.utils.toWei(amountToremove.toString());
        // console.log("towallet", towallet.address);
        // console.log("aaaaa", fromWallet.address);
        // return;
        const contractMethod = await contractOfTransfer.methods.BUY(
          fromWallet.address,
          addressTOkenTOSend.contract_address,
          commissionIfAmount,
          aaaaa
        );
        console.log("contractMethod", contractMethod);

        const nonce = await web3.eth.getTransactionCount(
          fromAddress,
          "pending"
        );

        const gasPrice = await web3.eth.getGasPrice();
        let coma = web3.utils.toWei(val.toString());

        const txData = {
          nonce: web3.utils.toHex(nonce),
          gasPrice: web3.utils.toHex(gasPrice),
          gasLimit: web3.utils.toHex("2000000"),
          to: contractAddress,
          value: web3.utils.toHex(coma),
          data: contractMethod.encodeABI(),
        };
        console.log("txData", txData);

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

            await fromWallet.save(); ////  should add after checking
          });

        amountToremove = 0;
      }
    })();
  }
  // return;
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

      amountToremove = amountToremove * target_price;
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
      parseFloat(amountToremove) +
      parseFloat(commission) +
      parseFloat(web3.utils.fromWei(gasPrice));
    console.log(total, "total");
    // const amount = web3.utils.toWei(amounts.toString());
    total = total.toFixed(10).toString();
    let userBalance = await getBalance(fromAddress);
    // console.log("userbalance", userBalance);
    let checkBal = parseFloat(userBalance) - total;
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
        console.log("fromWallet ", fromWallet);

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
            console.log("fromWallet in final", fromWallet);
            let tokenBalanceFromWallet = await getBalance(fromAddress);

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
                showableMessage: "Buy Limit Order Successfully Created",
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

    // let gasLimit = await contractOfTransfer.methods.BuyPayOrder().estimateGas({
    //   from: fromAddress,
    //   value: web3.utils.toWei(total.toString(), "ether"),
    // });
    // let resss = await contractOfTransfer.methods.BuyPayOrder().send({
    //   from: fromAddress,
    //   gas: gasLimit,
    //   gasPrice: web3.utils.fromWei(gasPrice, "gwei"),
    //   value: web3.utils.toWei(total.toString(), "ether"),
    // });
    // console.log("resss in buy", resss);
    const contractMethod = contractOfTransfer.methods.BuyPayOrder();
    await sendSignedTransaction(
      fromAddress,
      contractAddress,
      contractMethod,
      total,
      privateKey
    );
    return;
  } else {
    console.log("sts", sts, amountToremove);
    const orders = new Orders({
      first_pair: req.body.symbolId,
      pair_name: getPair.name,
      user_id: req.body.user_id,
      amount: toPlainString(amountToremove),
      tokenAmount: toPlainString(amount),
      open_price: 0,
      type: "limit",
      method: "buy",
      target_price: target_price,
      status: sts,
    });
    console.log("orders", orders);
    let saved = await orders.save();
    // console.log("contractOfTransfer", contractOfTransfer);
    // let saved = true;
    console.log(saved, "saved");

    if (saved) {
      if (api_result === false) {
        apiRequest.status = 1;
        await apiRequest.save();
      }
      return res.json({
        status: "success",
        showableMessage: "Buy Limit Order Successfully Created",
        data: saved,
      });
    } else {
      return res.json({
        status: "fail",
        showableMessage: "Unknown Error",
        message: "Unknow error",
      });
    }
  }
};

module.exports = AddLimitBuyOrder;

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
