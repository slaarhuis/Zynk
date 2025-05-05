const { User, Template, Setting } = require("../../models"); // Added Setting model
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs").promises; // Keep for potential future use, but not for settings
const crypto = require("crypto"); // Needed for generating credentials
const { Op } = require("sequelize"); // Import Op for search

// Helper function to get all settings from DB as an object
async function getAllSettings() {
    const settingsArray = await Setting.findAll();
    const settings = {};
    settingsArray.forEach(setting => {
        // Attempt to parse boolean/numeric values when retrieving
        let value = setting.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value.trim() !== '' && value.indexOf('.') === -1) value = parseInt(value);
        // Keep numbers with decimals as strings for now, or use parseFloat if needed
        settings[setting.key] = value;
    });
    return settings;
}

// Helper function to get a specific setting from DB
async function getSetting(key, defaultValue = null) {
    const setting = await Setting.findOne({ where: { key: key } });
    if (setting) {
        // Handle boolean/numeric strings
        if (setting.value === 'true') return true;
        if (setting.value === 'false') return false;
        if (!isNaN(setting.value) && setting.value.trim() !== '' && value.indexOf('.') === -1) return parseInt(setting.value);
        return setting.value;
    }
    return defaultValue;
}

// Helper function to save a setting to DB
async function saveSetting(key, value) {
    // Convert non-string values to string for DB storage
    let stringValue;
    if (typeof value === 'boolean') {
        stringValue = String(value);
    } else if (typeof value === 'number') {
        stringValue = String(value);
    } else if (typeof value === 'object' && value !== null) {
        stringValue = JSON.stringify(value);
    } else {
        stringValue = value || ''; // Default to empty string if null/undefined
    }
    await Setting.upsert({ key: key, value: stringValue });
}


// --- Controller Functions ---

// Renders the main admin dashboard
exports.renderDashboard = (req, res) => {
  res.render("dashboard", { title: "Admin Dashboard", user: req.user });
};

// --- Template/Item Management ---

exports.listTemplates = async (req, res, next) => {
  try {
    const templates = await Template.findAll();
    res.render("templates_list", {
      title: "Manage Templafy Items",
      templates: templates,
      user: req.user
    });
  } catch (error) {
    console.error("Error listing templates:", error);
    next(error);
  }
};

exports.renderNewTemplateForm = (req, res) => {
  res.render("template_form", {
    title: "Add New Templafy Item",
    template: null,
    user: req.user,
    error: null
  });
};

exports.createTemplate = async (req, res, next) => {
  try {
    const { name, description, spaceId, assetId, documentType } = req.body;
    if (!name || !spaceId || !assetId || !documentType) {
      return res.status(400).render("template_form", {
        title: "Add New Templafy Item",
        template: { name, description, spaceId, assetId, documentType },
        user: req.user,
        error: "Item Name, Space ID, Asset ID, and Document Type are required."
      });
    }
    await Template.create({ name, description, spaceId, assetId, documentType });
    res.redirect("/admin/templates");
  } catch (error) {
    console.error("Error creating template item:", error);
    res.status(400).render("template_form", {
        title: "Add New Templafy Item",
        template: req.body,
        user: req.user,
        error: `Error saving item: ${error.message}`
      });
  }
};

// --- User Management ---

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ["id", "username", "createdAt", "updatedAt"] });
    res.render("users_list", {
      title: "Manage Users",
      users: users,
      user: req.user
    });
  } catch (error) {
    console.error("Error listing users:", error);
    next(error);
  }
};

exports.renderNewUserForm = (req, res) => {
  res.render("user_form", {
    title: "Add New User",
    editUser: null,
    user: req.user,
    error: null
  });
};

exports.createUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).render("user_form", {
        title: "Add New User",
        editUser: { username },
        user: req.user,
        error: "Username and password are required."
      });
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).render("user_form", {
        title: "Add New User",
        editUser: { username },
        user: req.user,
        error: "Username already exists."
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword });
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error creating user:", error);
    next(error);
  }
};

// --- Service Configuration ---

exports.renderConfigForm = async (req, res, next) => {
  try {
    const settings = await getAllSettings();

    // Provide default values if settings don't exist in DB yet
    const defaults = {
        "templafyConnector.defaultLimit": 20,
        "templafyConnector.allowSearch": false,
        "templafyConnector.clientId": "",
        "templafyConnector.clientSecret": "",
        "templafyConfig.tenantId": "",
        "templafyConfig.apiVersion": "v1",
        "templafyConfig.bearerToken": "",
        "docGenConfig.useTestEmail": false, // Added default
        "docGenConfig.testEmail": "" // Added default
    };

    const combinedSettings = { ...defaults, ...settings };

    res.render("config_form", {
      title: "Service Configuration",
      settings: combinedSettings, // Pass combined settings
      user: req.user,
      error: null,
      success: req.query.success
    });
  } catch (error) {
    console.error("Error rendering config form:", error);
    next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  const settingKeys = [
      "templafyConnector.defaultLimit",
      "templafyConnector.allowSearch",
      "templafyConnector.clientId",
      "templafyConnector.clientSecret",
      "templafyConfig.tenantId",
      "templafyConfig.apiVersion",
      "templafyConfig.bearerToken",
      "docGenConfig.useTestEmail", // Added key
      "docGenConfig.testEmail" // Added key
  ];
  try {
    // Process and save each setting
    for (const key of settingKeys) {
        let value = req.body[key];

        // Handle checkboxes specifically (value is 'on' if checked, undefined if not)
        if (key === "templafyConnector.allowSearch" || key === "docGenConfig.useTestEmail") {
            value = (value === "on"); // Convert to boolean
        }
        // Handle numbers
        if (key === "templafyConnector.defaultLimit") {
            value = parseInt(value) || 20; // Default to 20 if parsing fails
        }

        // Save to DB using helper
        await saveSetting(key, value);
    }

    res.redirect("/admin/config?success=true");

  } catch (error) {
    console.error("Error updating settings:", error);
    // Re-render form with submitted values and error
    const submittedSettings = {};
    settingKeys.forEach(key => {
        submittedSettings[key] = req.body[key];
        // Handle checkboxes
        if (key === "templafyConnector.allowSearch" || key === "docGenConfig.useTestEmail") {
            submittedSettings[key] = (req.body[key] === "on");
        }
    });

    res.status(400).render("config_form", {
      title: "Service Configuration",
      settings: submittedSettings,
      user: req.user,
      error: `Error saving settings: ${error.message}`,
      success: null
    });
  }
};

const templafyService = require("../services/templafyService");

// Test a template item
exports.testTemplate = async (req, res, next) => {
  const templateId = req.params.id;
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required for testing." });
  }
  try {
    const template = await Template.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template item not found." });
    }

    // Get Templafy config from DB settings
    const tenantId = await getSetting('templafyConfig.tenantId');
    const apiVersion = await getSetting('templafyConfig.apiVersion', 'v1');
    const bearerToken = await getSetting('templafyConfig.bearerToken');

    if (!tenantId || !apiVersion || !bearerToken) {
        return res.status(500).json({ message: "Templafy DocGen configuration (Tenant ID, API Version, or Bearer Token) not found in settings." });
    }

    const templafyConfig = { tenantId, apiVersion, bearerToken };

    // Call service to generate document
    const pdfDownloadUrl = await templafyService.generateTemplafyDocument(template, email, templafyConfig);

    res.json({ message: "Test initiated successfully.", pdfDownloadUrl });
  } catch (error) {
    console.error(`Error testing template ${templateId}:`, error);
    // Improved error response
    if (error.response) {
        console.error("Templafy API Error:", error.response.status, error.response.data);
        res.status(error.response.status || 500).json({ message: "Error communicating with Templafy API during test.", details: error.response.data });
    } else {
        res.status(500).json({ message: error.message || "Internal server error during test." });
    }
  }
};

// Test endpoint for listing content (bypasses OAuth)
// Mirrors the logic of contentController.listContent
exports.testContentList = async (req, res, next) => {
  try {
    // Get pagination parameters from query, providing defaults
    const requestedLimit = parseInt(req.query.limit) || await getSetting('templafyConnector.defaultLimit', 20);
    const skip = parseInt(req.query.skip) || 0;
    const search = req.query.search || null; // Get search term if provided

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

    // Use findAndCountAll to get both items and total count for pagination
    const { count, rows } = await Template.findAndCountAll(queryOptions);

    // Format response according to Templafy Content Connector API spec
    const response = {
      content: rows.map(item => ({
        id: item.id.toString(), // ID must be string
        name: item.name,
        description: item.description,
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", // Assuming PPTX for now, adjust if needed
        // previewUrl: "URL_TO_A_PREVIEW_IMAGE", // Optional: Add if you have previews
        // tags: "comma,separated,tags", // Optional: Add if you have tags
        // altText: "Alt text for preview" // Optional
      })),
      contentCount: count, // Total number of items matching the query (ignoring pagination)
      offset: skip // The offset that was applied for this request
    };

    res.json(response);

  } catch (error) {
    console.error("Error in testContentList:", error);
    res.status(500).json({ message: "Error retrieving content items for test." });
  }
};

// Function to generate credentials
function generateSecureRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Endpoint to generate a secure credential string
exports.generateCredential = (req, res) => {
  try {
    const credential = generateSecureRandomString(32);
    res.json({ credential: credential });
  } catch (error) {
    console.error("Error generating credential:", error);
    res.status(500).json({ message: "Failed to generate credential." });
  }
};

