var authFile = require("../../auth.js");
const Orders = require("../../models/Orders.js");

const getOrders = async function (req, res) {
  try {
    const api_key_result = req.body.api_key;
    const { pair, method, type, fromDate, toDate, status } = req.query;
    const result = await authFile.apiKeyChecker(api_key_result);
    if (!result)
      res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden 403",
      });
    let filter = {};
    // if (req.body?.user_id) {
    //   filter = { user_id: req.body.user_id };
    // }
    // let filter;
    // if (req.body.user_id) filter.user_id = req.body.user_id;
    // console.log("filter", filter);

    if (pair) filter.pair_name = pair;
    if (method) filter.method = method;
    if (type) filter.type = type;
    if (fromDate && toDate) filter.createdAt = { $gte: fromDate, $lte: toDate };
    if (status) {
      filter.status = status;
    } else {
      filter.status = 1;
    }
    let orders;
    if (req.body?.user_id) {
      orders = await Orders.find(filter).sort({ createdAt: -1 }).lean();
      orders = orders.filter((item) => {
        return item.user_id != req.body.user_id;
      });
    } else {
      orders = await Orders.find(filter).sort({ createdAt: -1 }).lean();
    }

    return res.json({
      status: "success",
      showableMessage: "success",
      data: orders,
    });
  } catch (err) {
    return res.json({
      status: "fail",
      showableMessage: "fail",
      message: "Error",
    });
  }
};

module.exports = getOrders;
