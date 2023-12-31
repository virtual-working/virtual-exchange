const User = require("../models/User");
const MailVerification = require("../models/MailVerification");
var authFile = require("../auth.js");
var mailer = require("../mailer.js");
const sendMail = async function (req, res) {
  let newMail = "";
  if (
    req.body.newMail != null &&
    req.body.newMail != "" &&
    req.body.newMail != undefined
  ) {
    newMail = req.body.newMail;
    let user = await User.findOne({
      email: newMail,
    }).exec();

    if (user != null) {
      res.json({
        status: "fail",
        message: "email_already_exist",
        showableMessage: "Email already exist",
      });
      return;
    }
  }
  var user_id = req.body.user_id;
  var api_key_result = req.body.api_key;
  var reason = req.body.reason;

  var result = await authFile.apiKeyChecker(api_key_result);

  if (result === true) {
    let user = await User.findOne({
      _id: user_id,
    }).exec();

    if (user != null) {
      if (user.status == "1" || user.status == "5") {
      } else {
        return res.json({
          status: "fail",
          message: "user_not_found",
          showableMessage: "User not found",
        });
      }
      var pin = Math.floor(100000 + Math.random() * 900000);
      let expireTime = Date.now() + 3 * 60 * 1000;
      if (reason == "change_email_new") {
        if (
          req.body.newMail == "" ||
          req.body.newMail == null ||
          req.body.newMail == undefined
        ) {
          return res.json({
            status: "fail",
            message: "email_not_found",
            showableMessage: "Email not found",
          });
        }

        let check = await MailVerification.findOne({
          user_id: user_id,
          reason: "change_email_new",
        }).exec();

        mailer.sendMail(
          newMail,
          "Virtual verification",
          "Pin : " + pin,
          function (err, data) {
            if (err) {
              console.log("Error " + err);
            } else {
              console.log("sms sent");
            }
          }
        );

        if (check != null) {
          await MailVerification.findOneAndUpdate(
            { user_id: user["_id"], reason: "change_email_new" },
            { pin: pin, status: 0, expiryTime: expireTime }
          );
        } else {
          newPin = new MailVerification({
            user_id: user["_id"],
            pin: pin,
            reason: "change_email_new",
            status: 0,
            expiryTime: expireTime,
          });
          newPin.save();
        }

        res.json({
          status: "success",
          data: "mail_send",
          showableMessage: "Mail send",
        });
      } else {
        console.log("in else");
        mailer
          .sendMail(
            user["email"],
            "Virtual verification",
            "Pin : " + pin,
            function (err, data) {
              if (err) {
                console.log("Error " + err);
              } else {
                console.log("sms sent");
              }
            }
          )
          .then((response) => {
            console.log("response", response);
          });
        let check = await MailVerification.findOne({
          user_id: user_id,
          reason: reason,
        }).exec();
        if (check != null) {
          MailVerification.updateOne(
            { user_id: user["_id"], reason: reason },
            { pin: pin, status: "0", expiryTime: expireTime },
            function (err, result) {
              if (err) {
                res.json({ status: "fail", message: err });
              } else {
                res.json({ status: "success", data: "mail_sendd" });
              }
            }
          );
        } else {
          const newPin = new MailVerification({
            user_id: user["_id"],
            pin: pin,
            reason: reason,
            expiryTime: expireTime,
            status: 0,
          });
          newPin.save(function (err) {
            if (err) {
              res.json({ status: "fail", message: err });
            } else {
              res.json({ status: "success", data: "mail_send" });
            }
          });
        }
      }
    } else {
      res.json({ status: "fail", message: "user_not_found" });
    }
  } else {
    res.json({ status: "fail", message: "403 Forbidden" });
  }
};

module.exports = sendMail;
