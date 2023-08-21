var authFile = require("../../auth.js");
const Orders = require("../../models/Orders.js");

const getAllOrdersByGroup = async function (req, res) {
  const api_key_result = req.body.api_key;
  const result = await authFile.apiKeyChecker(api_key_result);
  if (!result)
    res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });

  // const orders = await Orders.find().sort({ createdAt: -1 }).lean();
  const orders = await Orders.aggregate([
    {
      $match: {
        user_id: { $ne: req.body.user_id },
        status: 1,
      },
    },
    {
      $group: {
        _id: {
          target_price: "$target_price",
          pair_name: "$pair_name",
          method: "$method",
        },

        amount: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        target_price: "$_id.target_price",
        pair_name: "$_id.pair_name",
        method: "$_id.method",
        amount: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { target_price: -1 },
    },
  ]);

  console.log("Grouped and summed data:", orders);

  res.json({
    status: "success",
    showableMessage: "success",
    length: orders.length,
    data: orders,
  });
};

module.exports = getAllOrdersByGroup;
