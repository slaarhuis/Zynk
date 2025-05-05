const bcrypt = require("bcrypt");
const { User } = require("../../models");

// Middleware to ensure an admin user is authenticated
exports.ensureAdminAuthenticated = (req, res, next) => {
  // Using Passport's isAuthenticated()
  if (req.isAuthenticated() /* && req.user.isAdmin */) { // Add isAdmin check if needed
    return next();
  }
  // If not authenticated, redirect to login page
  res.redirect("/auth/login");
};

// Renders the login page (view needs to be created)
exports.renderLogin = (req, res) => {
  // Check if user is already logged in, redirect if so
  if (req.isAuthenticated() /* && req.user.isAdmin */) {
    return res.redirect("/admin/dashboard"); // Or wherever the main admin page is
  }
  // TODO: Create login.ejs view
  res.render("login", { title: "Admin Login", error: req.query.error }); // Pass error message if redirected
};

// Renders the OAuth consent page (view needs to be created)
exports.renderConsent = (req, res) => {
  // TODO: Create consent.ejs view
  // The transactionID and user/client details are typically passed by oauth2orize middleware
  // Need to check how oauth2orize makes these available (often in req.oauth2)
  console.log("Rendering consent page. Req OAuth2 data:", req.oauth2);
  res.render("consent", {
    title: "Grant Access",
    transactionID: req.oauth2.transactionID,
    user: req.user, // Logged-in admin user
    client: req.oauth2.client // Client requesting access (Templafy)
  });
};

// Handles user logout
exports.logout = (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect("/auth/login"); // Redirect to login page after logout
  });
};

// Placeholder for registering a new admin user (could be a separate route/controller)
// This is just an example, might need a more secure way to create initial admin
exports.registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Basic validation
    if (!username || !password) {
      return res.status(400).send("Username and password are required.");
    }
    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).send("Username already exists.");
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10
    // Create user
    const newUser = await User.create({ username, password: hashedPassword /*, isAdmin: true */ });
    res.status(201).json({ message: "Admin user created successfully", userId: newUser.id });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).send("Error creating admin user.");
  }
};

