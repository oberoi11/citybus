const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingsModel");
const User = require("../models/usersModel");
const Bus = require("../models/busModel");
const stripe = require("stripe")(process.env.stripe_key);
const { v4: uuidv4 } = require("uuid");
const { io } = require("../server");
const nodemailer = require("nodemailer");


//book seat
router.post("/book-seat", authMiddleware, async (req, res) => {
  try {
    const { userId, bus, seats } = req.body;
     const user = await User.findById(userId);
     if (!user) {
       return res.status(400).send({ message: "User not found", success: false });
     }

    const newBooking = new Booking({
      ...req.body,
      user: userId,
    });
    await newBooking.save();

    const busData = await Bus.findById(bus);
    if (!busData) {
      return res.status(400).send({ message: "Bus not found", success: false });
    }
    busData.seatsBooked = [...busData.seatsBooked, ...seats];

    for (let seatNumber of seats) {
      const reservedSeatIndex = busData.reservedSeats.findIndex(
        (seat) => seat.seatNumber === seatNumber && seat.user.toString() === userId
      );
      if (reservedSeatIndex !== -1) {
        busData.reservedSeats.splice(reservedSeatIndex, 1);
      }
    }

    await busData.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: "nodemailer492@gmail.com",
        pass: "osczpunsyilaaosq",
      },
    });

    const userEmail = user.email;

    const mailOptions = {
      from: '"Transit Master"<no-reply@transitmaster.com>',
      to: userEmail,
      subject: "Booking Confirmation - Transit Master",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="background-color: #AC4425; padding: 20px; text-align: center; color: #fff;">
          <h1 style="margin: 0;">Transit Master</h1>
          <h2 style="margin: 5px 0;">Booking Confirmation</h2>
        </div>
        <div style="padding: 20px; background-color: #fff; border: 1px solid #ddd; margin-top: -5px;">
          <p>Dear <strong>${user.name}<strong>,</p>
          <p>Thank you for choosing Transit Master! Your booking has been confirmed. Below are the details of your journey:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Bus Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Bus Number:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.number}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>From:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.from}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>To:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.to}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Journey Date:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.journeyDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Departure Time:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.departure}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Arrival Time:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${busData.arrival}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Seats Booked:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${seats.join(", ")}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Fare (per seat):</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">₹${busData.fare}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Fare:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">₹${busData.fare * seats.length}</td>
            </tr>
          </table>
          <p style="color: #AC4425; font-weight: bold;">We look forward to serving you on your journey.</p>
        </div>
        <div style="background-color: #f8f8f8; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>If you have any questions, please contact us at <a href="mailto:support@transitmaster.com" style="color: #AC4425; text-decoration: none;">support@transitmaster.com</a></p>
          <p>Transit Master &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
      `,
    };
    

    await transporter.sendMail(mailOptions);

    res.status(200).send({
      message: "Booking successful. Confirmation email sent.",
      data: newBooking,
      success: true,
    });
  } catch (error) {
    console.error("Error in /book-seat:", error);
    res.status(500).send({
      message: "Booking failed",
      data: error,
      success: false,
    });
  }
});


// make payment
router.post("/make-payment", authMiddleware, async (req, res) => {
  try {
    const { token, amount, description } = req.body;

    console.log("Incoming payment request:", { token, amount, description });
    
    // create a new customer
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    console.log("Customer created:", customer.id);

    // create a charge
    const payment = await stripe.charges.create(
      {
        amount: amount,
        currency: "inr",
        customer: customer.id,
        receipt_email: token.email,
        description: description,
      },
      {
        idempotencyKey: uuidv4(),
      }
    );

    console.log("Payment response:", payment);

    if (payment) {
      res.status(200).send({
        message: "Payment successful",
        data: {
          transactionId: payment.source.id,
        },
        success: true,
      });
    } else {
      res.status(500).send({
        message: "Payment failed",
        data: "No payment response received",
        success: false,
      });
    }
  } catch (error) {
    console.error("Error in /make-payment:", error);
    res.status(500).send({
      message: "Payment failed",
      data: error.message || error,
      success: false,
    });
  }
});

// get bookings by user id
router.post("/get-bookings-by-user-id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.body.userId })
      .populate("bus")
      .populate("user");
    res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookings,
      success: true,
    });
  } catch (error) {
    console.error("Error in /get-bookings-by-user-id:", error);
    res.status(500).send({
      message: "Bookings fetch failed",
      data: error,
      success: false,
    });
  }
});

// get all bookings
router.post("/get-all-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("bus").populate("user");
    res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookings,
      success: true,
    });
  } catch (error) {
    console.error("Error in /get-all-bookings:", error);
    res.status(500).send({
      message: "Bookings fetch failed",
      data: error,
      success: false,
    });
  }
});

//reserve seat
router.post("/reserve-seat", authMiddleware, async (req, res) => {
  try {
    const { busId, seatNumber } = req.body;
    const userId = req.body.userId;
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(400).send({ message: "Bus not found", success: false });
    }

    const seatIsReserved = bus.reservedSeats.find(
      (seat) => seat.seatNumber === seatNumber
    );
    if (seatIsReserved) {
      return res.status(400).send({
        message: `Seat ${seatNumber} is already reserved.`,
        success: false,
      });
    }

    bus.reservedSeats.push({ seatNumber, user: userId });
    await bus.save();

    io.emit("seat-selected", { busId, seatNumber, user: userId });

    res.status(200).send({
      message: `Seat ${seatNumber} successfully reserved.`,
      success: true,
    });
  } catch (error) {
    console.error("Error in /reserve-seat:", error);
    res.status(500).send({ message: error.message, success: false });
  }
});

//unreserve seat
router.post("/unreserve-seat", authMiddleware, async (req, res) => {
  try {
    const { busId, seatNumber } = req.body;
    const userId = req.body.userId;
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(400).send({ message: "Bus not found", success: false });
    }

    const reservedSeatIndex = bus.reservedSeats.findIndex(
      (seat) => seat.seatNumber === seatNumber && seat.user.toString() === userId.toString()
    );

    if (reservedSeatIndex === -1) {
      return res.status(400).send({
        message: `Seat ${seatNumber} is not reserved by you.`,
        success: false,
      });
    }
    bus.reservedSeats.splice(reservedSeatIndex, 1);

    await bus.save();
    io.emit("seat-unreserved", { busId, seatNumber });

    res.status(200).send({
      message: `Seat ${seatNumber} successfully unreserved.`,
      success: true,
    });
  } catch (error) {
    console.error("Error in /unreserve-seat:", error);
    res.status(500).send({ message: error.message, success: false });
  }
});



module.exports = router;
