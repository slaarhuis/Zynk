const express = require("express");
const session = require("express-session");
const passport = require("./src/config/passport"); // Use the configured passport
const path = require("path");
const bcrypt = require("bcrypt"); // Import bcrypt
const expressLayouts = require("express-ejs-layouts"); // Import express-ejs-layouts
const cors = require("cors"); // Import cors
require("dotenv").config();

// Import models to ensure they are registered with Sequelize
const { User, Template } = require("./models");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes"); // Import admin routes
const contentRoutes = require("./src/routes/contentRoutes"); // Import content routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "src/public")));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "a_very_secure_secret_key_replace_me", // Use environment variable in production
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: process.env.NODE_ENV === "production" } // Enable secure cookies in production (requires HTTPS)
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine setup (using EJS for admin interface)
app.use(expressLayouts); // Use express-ejs-layouts middleware
app.set("layout", "./layout"); // Specify the default layout file (optional, defaults to layout.ejs)
app.set("views", path.join(__dirname, "src/views"));
app.set("view engine", "ejs");

// Routes
app.use("/auth", authRoutes); // Mount authentication routes (admin login/logout, OAuth)
app.use("/admin", adminRoutes); // Mount admin interface routes
// Mount content routes under /content as required by Templafy
app.use("/content", contentRoutes); // Mount Templafy connector routes (/content, /content/:id/download-url)

// Simple root route for checking if service is running
app.get("/", (req, res) => {
  res.send("Zynk Service for Templafy is running. Admin interface at /admin/dashboard (requires login).");
});

// Basic Error Handling (can be improved)
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || "Something broke!");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
  // Create a default admin user if none exists (for initial setup)
  // Consider moving this to a separate setup script or seeding process
  User.findOrCreate({
    where: { username: process.env.ADMIN_USER || "admin" },
    defaults: {
      password: bcrypt.hashSync(process.env.ADMIN_PASS || "password", 10),
      // isAdmin: true // if using an isAdmin flag
    }
  }).then(([user, created]) => {
    if (created) {
      console.log(`Default admin user created: ${user.username}`);
    } else {
      console.log(`Admin user ${user.username} already exists.`);
    }
  }).catch(error => {
    console.error("Error creating/finding admin user:", error);
  });
});

