const User = require("../../models/User");
const MailVerification = require("../../models/MailVerification");
const SMSVerification = require("../../models/SMSVerification");
var authFile = require("../../auth.js");
var utilities = require("../../utilities.js");
const ChangeLogsModel = require("../../models/ChangeLogs");
const mailer = require("../../mailer");
const UserNotifications = require("../../models/UserNotifications");
const SiteNotifications = require("../../models/SiteNotifications");

const forgotPassword = async function (req, res) {
  var user_id = req.body.user_id;
  var password = req.body.password;
  var api_key_result = req.body.api_key;
  let result = await authFile.apiKeyChecker(api_key_result);
  console.log("req.body", req.body);
  if (result === true) {
    let user = await User.findOne({
      _id: user_id,
      status: 1,
    }).exec();
    if (user != null) {
      user.password = utilities.hashData(password);
      console.log("user", user, utilities.hashData(password));
      await user.save();

      let changeLog = new ChangeLogsModel({
        user_id: user_id,
        type: "Change Password",
        device: req.body.device ?? "Unknown",
        ip: req.body.ip ?? "Unknown",
        city: req.body.city ?? "Unknown",
        deviceOS: req.body.deviceOS ?? "Unknown",
      });
      changeLog.save();

      let userNotification = new UserNotifications({
        user_id: user_id,
        title: "Password Changed",
        message:
          "Your password has been changed. If you did not do this, please contact us immediately.",
        read: false,
      });

      await userNotification.save();

      let notificationCheck = SiteNotifications.findOne({
        user_id: user_id,
      }).exec();

      if (notificationCheck != null) {
        if (
          notificationCheck.system_messages == 1 ||
          notificationCheck.system_messages == "1"
        ) {
          mailer.sendMail(
            user.email,
            "Password Changed",
            "Password Changed",
            "Your password has been changed. If you did not do this, please contact us immediately."
          );
        }
      }

      return res.json({
        status: "success",
        message: "password_changed",
        showableMessage: "Password Changed",
      });
    } else {
      return res.json({
        status: "fail",
        message: "user_not_found",
        showableMessage: "User not found",
      });
    }
  } else {
    res.json({
      status: "fail",
      message: "403 Forbidden",
      showableMessage: "403 Forbidden",
    });
  }
};
const forgetPinCheck = async function (req, res) {
  var user_id = req.body.user_id;
  var api_key_result = req.body.api_key;
  let result = await authFile.apiKeyChecker(api_key_result);
  if (result === true) {
    let user = await User.findOne({
      _id: user_id,
      status: 1,
    }).exec();
    if (user != null) {
      var email = user["email"];
      var phone = user["phone_number"];

      if (email != undefined && email != null && email != "") {
        check1 = await MailVerification.findOne({
          user_id: user_id,
          reason: "change_password",
          pin: req.body.mailPin,
          status: 0,
        }).exec();
        if (!check1)
          return res.json({
            status: "fail",
            message: "verification_failed",
            showableMessage: "Wrong Mail Pin",
          });
      }

      if (phone != undefined && phone != null && phone != "") {
        check3 = await SMSVerification.findOne({
          user_id: user_id,
          reason: "change_password",
          pin: req.body.smsPin,
          status: 0,
        }).exec();

        if (!check3)
          return res.json({
            status: "fail",
            message: "verification_failed",
            showableMessage: "Wrong SMS Pin",
          });
      }

      return res.json({
        status: "success",
        message: "Your are good to go",
        showableMessage: "You are good to go",
      });
    } else {
      return res.json({
        status: "fail",
        message: "user_not_found",
        showableMessage: "User not found",
      });
    }
  } else {
    res.json({
      status: "fail",
      message: "403 Forbidden",
      showableMessage: "403 Forbidden",
    });
  }
};

module.exports = { forgotPassword, forgetPinCheck };
