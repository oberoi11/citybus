const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
require("dotenv").config();
const dbConfig = require("./config/dbConfig");
const port = process.env.PORT || 5000;
const path = require("path");

// ------------------
// Proper CORS setup
// ------------------
const allowedOrigins = [
  "http://localhost:3000", // React dev
  "https://your-frontend-url.netlify.app", // production frontend
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Preflight for all routes
app.options("*", cors());

app.use(express.json());

// ------------------
// Routes
// ------------------
const usersRoute = require("./routes/usersRoute");
const busesRoute = require("./routes/busesRoute");
const bookingsRoute = require("./routes/bookingsRoute");

app.use("/api/users", usersRoute);
app.use("/api/buses", busesRoute);
app.use("/api/bookings", bookingsRoute);

// ------------------
// Socket.IO
// ------------------
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("seat-selected", (data) => {
    io.emit("seat-selected", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

module.exports = { io };

// ------------------
// Production setup (optional)
// ------------------
// Serve React build if in production
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static("client/build"));
//   app.get("*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "client/build/index.html"));
//   });
// }

// ------------------
// Keep Render free tier alive
// ------------------
if (process.env.NODE_ENV === "production") {
  const https = require("https");

  setInterval(() => {
    https.get("https://citybus-hjup.onrender.com"); // 👈 your backend URL
  }, 1000 * 60 * 14); // every 14 minutes
}

// ------------------
// Start server
// ------------------
server.listen(port, () => console.log(`Server running on port ${port}!`));
