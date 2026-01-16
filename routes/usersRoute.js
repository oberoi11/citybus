const router = require("express").Router();
const User = require("../models/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");
const Otp = require("../models/otpModel");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// register new user

router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.send({
        message: "User already exists",
        success: false,
        data: null,
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;
    const newUser = new User(req.body);
    await newUser.save();
    res.send({
      message: "User created successfully",
      success: true,
      data: null,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (!userExists) {
      return res.send({
        message: "User does not exist",
        success: false,
        data: null,
      });
    }

    if (userExists.isBlocked) {
      return res.send({
        message: "Your account is blocked, please contact admin",
        success: false,
        data: null,
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      userExists.password
    );

    if (!passwordMatch) {
      return res.send({
        message: "Incorrect password",
        success: false,
        data: null,
      });
    }

  //   const otp = crypto.randomInt(100000, 999999);
  //   const otpExpires = Date.now() + 10 * 60 * 1000;

  //   await Otp.create({
  //     userId: userExists._id,
  //     otp: otp,
  //     expiresAt: otpExpires,
  //   });

  //   const transporter = nodemailer.createTransport({
  //     service: "gmail",
  //     secure: true,
  //     auth: {
  //       user: "nodemailer492@gmail.com",
  //       pass: "osczpunsyilaaosq",
  //     },
  //   });

  //   const mailOptions = {
  //     from: '"Transit Master"<no-reply@transitmaster.com>',
  //     to: userExists.email,
  //     subject: "Your OTP for Login - Transit Master",
  //     html: `
  //     <div style="font-family: Arial, sans-serif; color: #333;">
  //       <div style="background-color: #AC4425; padding: 20px; text-align: center; color: #fff;">
  //         <h1 style="margin: 0;">Transit Master</h1>
  //         <h2 style="margin: 5px 0;">One-Time Password (OTP)</h2>
  //       </div>
  //       <div style="padding: 20px; background-color: #fff; border: 1px solid #ddd; margin-top: -5px;">
  //         <p>Dear <strong>${userExists.name || "User"}<strong>,</p>
  //         <p>Your login request requires verification. Please use the following One-Time Password (OTP) to proceed:</p>
  //         <div style="text-align: center; margin: 20px 0;">
  //           <span style="font-size: 24px; font-weight: bold; color: #AC4425;">${otp}</span>
  //         </div>
  //         <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
  //         <p>If you did not request this OTP, please ignore this email or contact us immediately at <a href="mailto:support@transitmaster.com" style="color: #AC4425; text-decoration: none;">support@Transit Master.com</a>.</p>
  //       </div>
  //       <div style="background-color: #f8f8f8; padding: 10px; text-align: center; font-size: 12px; color: #666;">
  //         <p>Thank you for choosing Transit Master!</p>
  //         <p>Transit Master &copy; ${new Date().getFullYear()}</p>
  //       </div>
  //     </div>
  //     `,
  //   };    

  //   await transporter.sendMail(mailOptions);

  //   res.send({
  //     message: "OTP sent to your email",
  //     success: true,
  //     data: { userId: userExists._id },
  //   });}
  }catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

//verify otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const otpRecord = await Otp.findOne({ userId, otp: parseInt(otp) });

    if (!otpRecord) {
      return res.send({
        message: "Invalid OTP",
        success: false,
        data: null,
      });
    }

    if (Date.now() > otpRecord.expiresAt) {
      return res.send({
        message: "Expired OTP",
        success: false,
        data: null,
      });
    }

    const token = jwt.sign({ userId, email: User.email }, process.env.jwt_secret, {
      expiresIn: "1d",
    });

    await Otp.deleteOne({ _id: otpRecord._id });

    res.send({
      message: "OTP verified successfully",
      success: true,
      data: token,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// get user by id

router.post("/get-user-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    res.send({
      message: "User fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// get all users
router.post("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    res.send({
      message: "Users fetched successfully",
      success: true,
      data: users,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// update user

router.post("/update-user-permissions", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body._id, req.body);
    res.send({
      message: "User permissions updated successfully",
      success: true,
      data: null,
    });
  } catch {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

module.exports = router;
