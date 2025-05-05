const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware"); // Assuming middleware for checking admin auth

const router = express.Router();

// Middleware to protect all admin routes
router.use(authMiddleware.ensureAdminAuthenticated); // Use the same middleware as for consent

// Admin Dashboard Route
router.get("/dashboard", adminController.renderDashboard);

// Template Management Routes
router.get("/templates", adminController.listTemplates); // List all templates
router.get("/templates/new", adminController.renderNewTemplateForm); // Show form to add new template
router.post("/templates", adminController.createTemplate); // Handle submission of new template form (removed upload middleware)
// router.get("/templates/:id/edit", adminController.renderEditTemplateForm); // Show form to edit existing template (TODO)
// router.put("/templates/:id", adminController.updateTemplate); // Handle submission of edit template form (TODO)
// router.delete("/templates/:id", adminController.deleteTemplate); // Handle template deletion (TODO)
router.post("/templates/:id/test", adminController.testTemplate); // Handle test request
// Data Entry Management Routes (REMOVED)
// router.get("/data-entries", adminController.listDataEntries); // List all data entries
// router.get("/data-entries/new", adminController.renderNewDataEntryForm); // Show form to add new data entry
// router.post("/data-entries", adminController.createDataEntry); // Handle submission of new data entry form
// router.get("/data-entries/:id/edit", adminController.renderEditDataEntryForm); // Show form to edit existing data entry (TODO)
// router.put("/data-entries/:id", adminController.updateDataEntry); // Handle submission of edit data entry form (TODO)
// router.delete("/data-entries/:id", adminController.deleteDataEntry); // Handle data entry deletion (TODO)

// User Management Routes
router.get("/users", adminController.listUsers); // List all users
router.get("/users/new", adminController.renderNewUserForm); // Show form to add new user
router.post("/users", adminController.createUser); // Handle submission of new user form
// router.get("/users/:id/edit", adminController.renderEditUserForm); // Show form to edit existing user (TODO)
// router.put("/users/:id", adminController.updateUser); // Handle submission of edit user form (TODO)
// router.delete("/users/:id", adminController.deleteUser); // Handle user deletion (TODO)

// Service Configuration Routes
router.get("/config", adminController.renderConfigForm); // Show configuration form
router.post("/config", adminController.updateConfig); // Handle submission of configuration form

// Test endpoint for listing content (bypasses OAuth token check)
router.get("/test-content-list", adminController.testContentList);

// Endpoint to generate a secure credential string
router.post("/generate-credential", adminController.generateCredential);

module.exports = router;

