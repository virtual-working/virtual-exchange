const User = require("../../models/User");
const Referral = require("../../models/Referral");
const RegisterMail = require("../../models/RegisterMail");
const RegisterSMS = require("../../models/RegisterSMS");
const UserRef = require("../../models/UserRef");
const utilities = require("../../utilities");
const {
  generateFromEmail,
  generateUsername,
} = require("unique-username-generator");

const checkUser = async (req, res) => {
  try {
    var registerType = req.body.registerType;
    var data = req.body.data;
    if (registerType == "email") {
      if (!data || data == undefined || data == null || data == "") {
        return res.json({
          status: "fail",
          message: "email_required",
          showableMessage: "Email is required",
        });
      }
      let checkEmailUnique = await User.findOne({
        email: data,
      }).exec();

      if (!checkEmailUnique) {
        return res.json({
          status: "fail",
          message: "email_not_registered",
          showableMessage: "Email not registered",
        });
      }

      let checkEmaipasslUnique = await User.findOne({
        email: data,
        password: utilities.hashData(req.body.password),
      }).exec();

      if (!checkEmaipasslUnique) {
        return res.json({
          status: "fail",
          message: "email_password_incorrect",
          showableMessage: "Email or password are Incorrect",
        });
      }

      return res.json({
        status: "success",
        message: "email_registered",
        showableMessage: "Email registered",
      });
    }

    if (registerType == "phone") {
      if (
        !req.body.country_code ||
        req.body.country_code == undefined ||
        req.body.country_code == null ||
        req.body.country_code == "" ||
        !req.body.data ||
        req.body.data == undefined ||
        req.body.data == null ||
        req.body.data == ""
      ) {
        return res.json({
          status: "fail",
          message: "phone and country code required",
          showableMessage: "Phone and Country Code is required",
        });
      }

      let checkPhoneUnique = await User.findOne({
        country_code: req.body.country_code,
        phone_number: req.body.data,
      }).exec();

      if (!checkPhoneUnique) {
        return res.json({
          status: "fail",
          message: "phone_not_registered",
          showableMessage: "Phone not registered",
        });
      }

      return res.json({
        status: "success",
        message: "phone_registered",
        showableMessage: "Phone registered",
      });
    }
  } catch (error) {
    return res.json({
      status: "fail",
      message: error.message,
      showableMessage: error.message,
    });
  }
};

module.exports = checkUser;
