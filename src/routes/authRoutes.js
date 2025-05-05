const express = require("express");
const passport = require("../config/passport");
const authController = require("../controllers/authController");
const { server: oauth2ServerInstance, verifyToken } = require("../services/oauth2Server"); // Import server instance and verifyToken

const router = express.Router();

// --- Admin Authentication Routes ---
router.get("/login", authController.renderLogin);
// *** FIX: Use the registered 'local-admin' strategy ***
router.post("/login", passport.authenticate("local-admin", {
  successRedirect: "/admin/dashboard",
  failureRedirect: "/auth/login",
  failureFlash: true // Make sure connect-flash middleware is used if you want flash messages
}));
router.get("/logout", authController.logout);

// --- Templafy OAuth 2.0 Routes ---

// Authorization Endpoint (GET - Placeholder)
router.get("/oauth/authorize",
  // TODO: Add user login check middleware
  oauth2ServerInstance.authorization((clientID, redirectURI, done) => {
    console.log(`OAuth Authorize Request: Client=${clientID}, Redirect=${redirectURI}`);
    // TODO: Validate clientID against database
    // TODO: Fetch client details from DB
    // For now, assume client is valid
    return done(null, { id: clientID, name: "Test Client" }, redirectURI);
  }),
  (req, res) => {
    // TODO: Render an authorization form to the user
    res.send("Authorization form placeholder");
  }
);

// Decision Endpoint (POST - Placeholder)
router.post("/oauth/decision",
  // TODO: Add user login check middleware
  oauth2ServerInstance.decision()
);

// Token Endpoint (POST)
router.post("/oauth/token",
  (req, res, next) => {
    console.log(`[Auth Route - Step 1] POST /auth/oauth/token received. Grant Type: ${req.body.grant_type}`);
    console.log(`[Auth Route - Step 1] Request Body: ${JSON.stringify(req.body)}`);
    next();
  },
  (req, res, next) => {
    console.log("[Auth Route - Step 2] Calling passport.authenticate(\"oauth2-client-password\")...");
    passport.authenticate(["oauth2-client-password"], { session: false }, (err, client, info) => {
      if (err) {
        console.error("[Auth Route - Step 2] Error from passport.authenticate:", err);
        return next(err); // Pass error to the main error handler
      }
      if (!client) {
        console.warn("[Auth Route - Step 2] passport.authenticate failed. Info:", info);
        const authError = new Error(info?.message || "Invalid client credentials");
        authError.status = 401;
        return next(authError);
      }
      console.log("[Auth Route - Step 2] passport.authenticate succeeded.");
      console.log("[Auth Route - Step 2] Authenticated Client (client object):", JSON.stringify(client));
      req.user = client; // Manually attach client info to req.user for the next middleware
      next();
    })(req, res, next);
  },
  (req, res, next) => {
    console.log("[Auth Route - Step 3] Reached middleware after successful passport.authenticate.");
    console.log("[Auth Route - Step 3] req.user:", JSON.stringify(req.user));
    console.log("[Auth Route - Step 3] Calling oauth2ServerInstance.token()...");
    next();
  },
  // Use the token exchange middleware from the imported server instance
  oauth2ServerInstance.token(),
  (req, res, next) => {
      console.log("[Auth Route - Step 4] Reached middleware AFTER oauth2ServerInstance.token(). This is unexpected if token was sent.");
      next();
  },
  // Use the error handler middleware from the imported server instance
  (err, req, res, next) => {
      console.error("[Auth Route - Step 5] Error caught by final error handler in /oauth/token route:");
      console.error("Error Status:", err.status);
      console.error("Error Message:", err.message);
      console.error("Full Error Stack:", err.stack);
      console.log("[Auth Route - Step 5] Passing error to oauth2ServerInstance.errorHandler()...");
      // Ensure the errorHandler middleware is invoked correctly
      oauth2ServerInstance.errorHandler()(err, req, res, next);
  }
);

module.exports = router;

