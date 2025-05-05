// Middleware to ensure an admin user is authenticated
exports.ensureAdminAuthenticated = (req, res, next) => {
  // Using Passport's isAuthenticated() method provided by session middleware
  if (req.isAuthenticated()) {
    // Optional: Add role/permission check if needed
    // if (req.user && req.user.isAdmin) { return next(); }
    return next();
  }
  // If not authenticated, redirect to login page
  console.log("User not authenticated, redirecting to login.");
  res.redirect("/auth/login");
};

// Placeholder for other potential middleware

