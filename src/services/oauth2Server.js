const oauth2orize = require("oauth2orize");
const passport = require("../config/passport"); // Use the configured passport
const crypto = require("crypto");
const { User, AccessToken } = require("../../models"); // Added AccessToken model
const { Op } = require("sequelize"); // Import Op for token verification

// Create OAuth 2.0 server
const server = oauth2orize.createServer();

// --- Serialization/Deserialization (for oauth2orize) ---

// Register serialization function
server.serializeClient((client, done) => {
  return done(null, client.id);
});

// Register deserialization function
server.deserializeClient(async (id, done) => {
  // Client ID is sufficient for client credentials flow
  console.log("OAuth Deserialize Client:", id);
  return done(null, { id: id });
});

// --- Grant Types ---

// Grant authorization codes (Placeholder - requires DB storage for codes too)
server.grant(oauth2orize.grant.code(async (client, redirectURI, user, ares, done) => {
  const code = crypto.randomBytes(16).toString("hex");
  console.log(`OAuth Grant Code: User=${user.id}, Client=${client.id}, Code=${code}`);
  // TODO: Store code in DB (e.g., AuthorizationCodes table)
  console.warn("Authorization Code Grant not fully implemented with DB storage.");
  return done(null, code); // Return code for now, but it won't be verifiable later without DB
}));

// --- Exchange Types ---

// Exchange authorization codes for access tokens (Placeholder - requires DB storage for codes)
server.exchange(oauth2orize.exchange.code(async (client, code, redirectURI, done) => {
  console.log(`OAuth Exchange Code: Client=${client.id}, Code=${code}`);
  // TODO: Retrieve code details from DB
  console.warn("Authorization Code Exchange not fully implemented with DB storage.");
  return done(null, false); // Cannot verify code without DB storage

  // --- Logic if code DB storage was implemented ---
  /* ... */
}));

// Exchange client credentials for access tokens
server.exchange(oauth2orize.exchange.clientCredentials(async (client, scope, done) => {
  console.log(`[OAuth Server] Exchange Client Credentials: Client=${client.id}, Scope=${scope}`);
  // Client is already authenticated by passport strategy

  const tokenValue = crypto.randomBytes(32).toString("hex");
  const expiresIn = 3600; // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const tokenData = {
      token: tokenValue,
      clientId: client.id,
      userId: null, // No user associated with client credentials
      scope: Array.isArray(scope) ? scope.join(" ") : scope, // Store scope as string
      expiresAt: expiresAt
  };

  try {
    console.log(`[OAuth Server] Attempting to create AccessToken in DB for Client=${client.id}`);
    console.log("[OAuth Server] Token Data:", JSON.stringify(tokenData)); // Log the data being saved
    
    // Store the new token in the database
    const createdToken = await AccessToken.create(tokenData);
    
    console.log(`[OAuth Server] Successfully created AccessToken: ${createdToken.token.substring(0,8)}...`);
    console.log(`[OAuth Server] Generated Token (Client Credentials): Client=${client.id}, Token=${tokenValue}`);

    // Return token, null refresh token, and params (like expires_in)
    return done(null, tokenValue, null, { expires_in: expiresIn });

  } catch (dbError) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("[OAuth Server] CRITICAL ERROR saving access token during client credentials exchange:");
    console.error("Client ID:", client.id);
    console.error("Scope:", scope);
    console.error("Generated Token Value (Not Saved):", tokenValue);
    console.error("Error Details:", dbError); // Log the full error object
    console.error("Stack Trace:", dbError.stack); // Explicitly log stack trace
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    return done(dbError); // Pass error to oauth2orize error handler
  }
}));

// --- Export Server Instance and Middleware ---

// Middleware to verify access tokens for resource endpoints (/api/content)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided");
  }
  const tokenValue = authHeader.substring(7); // Extract token after "Bearer "

  try {
    // Retrieve token details from the database
    const tokenInfo = await AccessToken.findOne({
      where: {
        token: tokenValue,
        expiresAt: { [Op.gt]: new Date() } // Check if token is not expired
      }
    });

    if (!tokenInfo) {
      console.warn(`[OAuth Server] Invalid or expired token presented: ${tokenValue.substring(0, 8)}...`);
      return res.status(401).send("Unauthorized: Invalid or expired token");
    }

    // Attach client/user info to request for downstream use
    req.authInfo = tokenInfo; // Contains clientId, userId, scope, expiresAt etc.
    req.user = { id: tokenInfo.userId }; // Simplification for potential user context
    console.log(`[OAuth Server] Token Verified: Client=${tokenInfo.clientId}, User=${tokenInfo.userId}`);
    next();

  } catch (dbError) {
    console.error("[OAuth Server] Error verifying access token:", dbError);
    return res.status(500).send("Internal Server Error during token verification");
  }
};

module.exports = {
  server: server, // Export the actual server instance
  verifyToken: verifyToken // Export the verification middleware
};

