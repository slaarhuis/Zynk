const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const OAuth2Strategy = require("passport-oauth2").Strategy;
const OAuth2ClientPasswordStrategy = require("passport-oauth2-client-password").Strategy;
const bcrypt = require("bcrypt");
const { User, Setting } = require("../../models"); // Added Setting model
require("dotenv").config();

// --- Admin Authentication (Local Strategy) ---
passport.use("local-admin", new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username: username } });
      if (!user) {
        return done(null, false, { message: "Incorrect admin username." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect admin password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// --- Templafy Connector Authentication (OAuth 2.0) ---

// 1. Client Credentials Strategy
passport.use("oauth2-client-password", new OAuth2ClientPasswordStrategy(
  async (clientId, clientSecret, done) => {
    try {
      console.log("OAuth2 Client Credentials Attempt:", clientId);
      // Fetch credentials from the database
      const storedClientIdSetting = await Setting.findOne({ where: { key: "templafyConnector.clientId" } });
      const storedClientSecretSetting = await Setting.findOne({ where: { key: "templafyConnector.clientSecret" } });

      const storedClientId = storedClientIdSetting ? storedClientIdSetting.value : null;
      const storedClientSecret = storedClientSecretSetting ? storedClientSecretSetting.value : null;

      // Check if credentials exist and match
      if (storedClientId && storedClientSecret && clientId === storedClientId && clientSecret === storedClientSecret) {
        // If valid, return client information
        return done(null, { id: clientId });
      } else {
        console.warn("Invalid client credentials provided or not configured in DB.");
        return done(null, false, { message: "Invalid client credentials." });
      }
    } catch (err) {
      console.error("Error during client credential validation:", err);
      return done(err);
    }
  }
));

// 2. Authorization Code Strategy (Less relevant for typical connector, but kept for potential future use)
passport.use("oauth2-authorization-code", new OAuth2Strategy({
    authorizationURL: process.env.OAUTH_AUTH_URL || "/auth/oauth/authorize",
    tokenURL: process.env.OAUTH_TOKEN_URL || "/auth/oauth/token",
    // These clientID/Secret are for *this service* acting as a client, not relevant here
    clientID: "placeholder-client-id",
    clientSecret: "placeholder-client-secret",
    callbackURL: "placeholder-callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    console.log("OAuth2 Authorization Code Verify Callback Triggered (Check Logic)");
    return done(null, { id: req.user?.id || "temp_user" });
  }
));

// --- User/Client Serialization/Deserialization (for sessions) ---
passport.serializeUser((entity, done) => {
  const id = entity.id;
  const type = entity.username ? 'user' : 'client';
  done(null, { id, type });
});

passport.deserializeUser(async (sessionData, done) => {
  try {
    if (sessionData.type === 'user') {
      const user = await User.findByPk(sessionData.id);
      done(null, user);
    } else if (sessionData.type === 'client') {
      done(null, { id: sessionData.id });
    } else {
      done(new Error("Unknown session entity type"));
    }
  } catch (err) {
    done(err);
  }
});

module.exports = passport;

