const express = require("express");
const contentController = require("../controllers/contentController");
const { verifyToken } = require("../services/oauth2Server"); // Import only verifyToken

const router = express.Router();

// Middleware to protect content routes with OAuth 2.0 Bearer token
router.use(verifyToken);

// GET / - Retrieve content listing (folders/assets)
// Mounted at /content, so this handles GET /content/
router.get("/", contentController.listContent);

// GET /:contentId/download-url - Get download URL for an asset
// Mounted at /content, so this handles GET /content/:contentId/download-url
router.get("/:contentId/download-url", contentController.getDownloadUrl);

module.exports = router;

