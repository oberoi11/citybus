const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingsModel");
const Bus = require("../models/busModel");
const stripe = require("stripe")(process.env.stripe_key);
const { v4: uuidv4 } = require("uuid");

// book a seat
router.post("/book-seat", authMiddleware, async (req, res) => {
  try {
    const newBooking = new Booking({
      ...req.body,
      user: req.body.userId,
    });
    await newBooking.save();
    const bus = await Bus.findById(req.body.bus);
    bus.seatsBooked = [...bus.seatsBooked, ...req.body.seats];
    await bus.save();
    res.status(200).send({
      message: "Booking successful",
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

module.exports = router;
