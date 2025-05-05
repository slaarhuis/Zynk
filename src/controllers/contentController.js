const { Template, Setting } = require("../../models"); // Added Setting model
const templafyService = require("../services/templafyService");
const { Op } = require("sequelize"); // Import Op for search if needed later

// Helper function to get a specific setting from DB
async function getSetting(key, defaultValue = null) {
    const setting = await Setting.findOne({ where: { key: key } });
    if (setting) {
        // Handle boolean/numeric strings
        if (setting.value === 'true') return true;
        if (setting.value === 'false') return false;
        // Check if it's a number (integer or float) but not empty string
        if (!isNaN(setting.value) && setting.value.trim() !== '') {
             // Check if it contains a decimal point
            if (setting.value.includes('.')) {
                return parseFloat(setting.value);
            } else {
                return parseInt(setting.value, 10);
            }
        }
        return setting.value;
    }
    return defaultValue;
}

// GET /content/ - List available Templafy items with pagination
exports.listContent = async (req, res, next) => {
  try {
    console.log(`[ContentCtrl] listContent called. Query: ${JSON.stringify(req.query)}`); // Log incoming query
    // Get pagination parameters from query, providing defaults
    const requestedLimit = parseInt(req.query.limit) || await getSetting('templafyConnector.defaultLimit', 20);
    const skip = parseInt(req.query.skip) || 0;
    const search = req.query.search || null; // Get search term if provided
    // const contentType = req.query.contentType; // Get contentType if needed for filtering
    // const parentId = req.query.parentId; // Get parentId if needed for filtering

    // Ensure limit is reasonable (e.g., max 100)
    const limit = Math.min(requestedLimit, 100);

    // Build query options for Sequelize
    const queryOptions = {
        attributes: ["id", "name", "description"], // Only return needed fields
        limit: limit,
        offset: skip,
        where: {}, // Initialize where clause
        order: [["name", "ASC"]] // Default order
    };

    // Add search condition if search term exists
    if (search) {
        queryOptions.where = {
            [Op.or]: [
                { name: { [Op.iLike]: `%${search}%` } }, // Case-insensitive search on name
                { description: { [Op.iLike]: `%${search}%` } } // Case-insensitive search on description
            ]
        };
    }

    // TODO: Add filtering based on contentType or parentId if needed in the future

    // Use findAndCountAll to get both items and total count for pagination
    const { count, rows } = await Template.findAndCountAll(queryOptions);
    console.log(`[ContentCtrl] Found ${rows.length} items (Total: ${count})`);

    // Format response according to Templafy Content Connector API spec
    const response = {
      content: rows.map(item => ({
        id: item.id.toString(), // ID must be string
        name: item.name,
        description: item.description,
        // *** FIX: Report as PDF since we always generate PDF ***
        mimeType: "application/pdf",
        // previewUrl: "URL_TO_A_PREVIEW_IMAGE", // Optional: Add if you have previews
        // tags: "comma,separated,tags", // Optional: Add if you have tags
        // altText: "Alt text for preview" // Optional
      })),
      contentCount: count, // Total number of items matching the query (ignoring pagination)
      offset: skip // The offset that was applied for this request
    };

    res.json(response);

  } catch (error) {
    console.error("[ContentCtrl] Error listing content:", error);
    res.status(500).json({ message: "Error retrieving content items." });
  }
};

// GET /content/:contentId/download-url - Generate document via Templafy and return PDF download URL
exports.getDownloadUrl = async (req, res, next) => {
  const itemId = req.params.contentId;
  const headers = req.headers;
  let emailForDocGen = null; // Initialize email variable

  console.log(`[ContentCtrl] getDownloadUrl called for item ID: ${itemId}`);
  console.log(`[ContentCtrl] Incoming Headers: ${JSON.stringify(headers)}`);

  if (!itemId) {
      console.error("[ContentCtrl] Item ID not captured from route parameter.");
      return res.status(400).json({ message: "Item ID missing in request path." });
  }

  try {
    // Determine which email to use based on settings
    const useTestEmail = await getSetting('docGenConfig.useTestEmail', false);
    console.log(`[ContentCtrl] Use Test Email setting: ${useTestEmail}`);

    if (useTestEmail) {
        const testEmail = await getSetting('docGenConfig.testEmail', '');
        console.log(`[ContentCtrl] Test Email setting value: ${testEmail}`);
        if (!testEmail) {
            console.error("[ContentCtrl] 'Use Test Email' is checked, but Test Email Address is not configured in settings.");
            return res.status(500).json({ message: "Configuration error: Test email is enabled but not set." });
        }
        emailForDocGen = testEmail;
        console.log(`[ContentCtrl] Using Test Email for DocGen: ${emailForDocGen}`);
    } else {
        // Attempt to get email from header (checking lowercase as Express usually normalizes)
        const headerEmail = req.headers["x-templafyuser"];
        console.log(`[ContentCtrl] Header Email (x-templafyuser): ${headerEmail}`);
        if (!headerEmail) {
            console.error("[ContentCtrl] 'Use Test Email' is unchecked, and user email not found in x-templafyuser header.");
            return res.status(400).json({ message: "User email missing in request header (x-templafyuser) and test email is disabled." });
        }
        emailForDocGen = headerEmail;
        console.log(`[ContentCtrl] Using Header Email for DocGen: ${emailForDocGen}`);
    }

    // Proceed with DocGen using emailForDocGen
    console.log(`[ContentCtrl] Finding template with ID: ${itemId}`);
    const item = await Template.findByPk(itemId);
    if (!item) {
      console.error(`[ContentCtrl] Template with ID ${itemId} not found.`);
      return res.status(404).json({ message: "Item not found." });
    }
    console.log(`[ContentCtrl] Found template: ${JSON.stringify(item)}`);

    // Get Templafy config from DB settings
    console.log("[ContentCtrl] Retrieving Templafy DocGen configuration from settings...");
    const tenantId = await getSetting('templafyConfig.tenantId');
    const apiVersion = await getSetting('templafyConfig.apiVersion', 'v1');
    const bearerToken = await getSetting('templafyConfig.bearerToken');
    console.log(`[ContentCtrl] Config - TenantID: ${tenantId}, APIVersion: ${apiVersion}, BearerToken: ${bearerToken ? bearerToken.substring(0, 5) + '...' : 'Not Set'}`);

    if (!tenantId || !apiVersion || !bearerToken) {
        console.error("[ContentCtrl] Templafy DocGen configuration missing in settings.");
        return res.status(500).json({ message: "Templafy DocGen configuration (Tenant ID, API Version, or Bearer Token) not found in settings." });
    }

    const templafyConfig = { tenantId, apiVersion, bearerToken };

    // Call Templafy Generate API using the determined email
    console.log(`[ContentCtrl] Calling templafyService.generateTemplafyDocument for item ${itemId} and user ${emailForDocGen}`);
    const pdfDownloadUrl = await templafyService.generateTemplafyDocument(item, emailForDocGen, templafyConfig);

    if (!pdfDownloadUrl) {
        console.error("[ContentCtrl] pdfDownloadUrl was null or undefined in Templafy API response.");
        // Note: The error might have been caught and logged inside generateTemplafyDocument already
        return res.status(500).json({ message: "Failed to get PDF download URL from Templafy. Check server logs for details." });
    }
    console.log(`[ContentCtrl] Received pdfDownloadUrl: ${pdfDownloadUrl}`);

    // Respond with the structure Templafy expects for download-url endpoint
    console.log("[ContentCtrl] Sending downloadUrl response to Templafy.");
    res.json({ downloadUrl: pdfDownloadUrl });

  } catch (error) {
    console.error(`[ContentCtrl] !!!!!!!!! ERROR in getDownloadUrl for item ${itemId} !!!!!!!!!`);
    console.error("[ContentCtrl] Error Message:", error.message);
    if (error.response) {
        // Axios error structure
        console.error("[ContentCtrl] Templafy API Error Status:", error.response.status);
        console.error("[ContentCtrl] Templafy API Error Data:", JSON.stringify(error.response.data));
        console.error("[ContentCtrl] Templafy API Error Headers:", JSON.stringify(error.response.headers));
        res.status(error.response.status || 500).json({ message: "Error communicating with Templafy API.", details: error.response.data });
    } else if (error.request) {
        // Axios error - request made but no response received
        console.error("[ContentCtrl] Templafy API No Response Error:", error.request);
        res.status(504).json({ message: "No response received from Templafy API." });
    } else {
        // Other errors (setup issues, etc.)
        console.error("[ContentCtrl] Non-API Error Stack:", error.stack);
        res.status(500).json({ message: "Internal server error during document generation." });
    }
  }
};

