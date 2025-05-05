const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// Path to the settings file (Keep for other potential settings, but not for DocGen config in generateTemplafyDocument)
const settingsFilePath = path.join(__dirname, "../../config/service_settings.json");

// Function to read settings (Keep for other potential settings)
async function getSettings() {
  try {
    const settingsData = await fs.readFile(settingsFilePath, "utf-8");
    return JSON.parse(settingsData);
  } catch (error) {
    console.error("Error reading settings file:", error);
    // Return default structure if file not found or invalid
    return { templafyConnector: {}, templafyConfig: {} };
  }
}

// Function to call the Templafy Generate API
// *** FIX: Accept templafyConfig object as argument and use its values ***
async function generateTemplafyDocument(templateDetails, userEmail, templafyConfig) {
  // const settings = await getSettings(); // No longer read from file here
  // const config = settings.templafyConfig || {}; // No longer read from file here
  
  // Use values passed directly from the controller
  const tenantId = templafyConfig.tenantId;
  const apiVersion = templafyConfig.apiVersion;
  const bearerToken = templafyConfig.bearerToken;

  console.log(`[Service] generateTemplafyDocument using config: Tenant=${tenantId}, Version=${apiVersion}, Token=${bearerToken ? bearerToken.substring(0,5)+"...":"Not Set"}`);

  if (!tenantId || !apiVersion || !bearerToken) {
    // This error should ideally not happen now if the controller passes valid config
    throw new Error("Templafy Tenant ID, API Version, or Bearer Token not provided to generateTemplafyDocument function.");
  }

  // Determine the correct path based on document type
  const documentTypePath = templateDetails.documentType === "presentation" ? "presentations" : "documents";

  const apiUrl = `https://${tenantId}.api.templafy.com/${apiVersion}/libraries/${templateDetails.spaceId}/${documentTypePath}/assets/${templateDetails.assetId}/generate`;

  const payload = {
    email: userEmail,
    data: {},
    includePdf: true,
  };

  console.log(`[Service] Calling Templafy API: ${apiUrl}`);
  console.log(`[Service] Using Bearer Token: ${bearerToken ? bearerToken.substring(0, 10) + "..." : "Not Set"}`); // Log token existence/prefix
  console.log(`[Service] Payload: ${JSON.stringify(payload)}`);

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[Service] Templafy API Response Status:", response.status);
    console.log("[Service] Templafy API Response Data:", response.data);

    if (!response.data || !response.data.pdfDownloadUrl) {
      console.error("[Service] Invalid response from Templafy API: pdfDownloadUrl missing.");
      throw new Error("Invalid response from Templafy API: pdfDownloadUrl missing.");
    }

    return response.data.pdfDownloadUrl;

  } catch (error) {
    console.error("[Service] Error calling Templafy Generate API:");
    if (error.response) {
        // Axios error structure
        console.error("[Service] Templafy API Error Status:", error.response.status);
        console.error("[Service] Templafy API Error Data:", JSON.stringify(error.response.data));
        console.error("[Service] Templafy API Error Headers:", JSON.stringify(error.response.headers));
        const errorMessage = error.response?.data?.message || JSON.stringify(error.response.data) || "Unknown Templafy API error";
        throw new Error(`Templafy API Error (${error.response.status}): ${errorMessage}`);
    } else if (error.request) {
        // Axios error - request made but no response received
        console.error("[Service] Templafy API No Response Error:", error.request);
        throw new Error("No response received from Templafy API.");
    } else {
        // Other errors (setup issues, etc.)
        console.error("[Service] Non-API Error:", error.message);
        console.error("[Service] Non-API Error Stack:", error.stack);
        throw new Error(error.message || "Unknown error during document generation service call.");
    }
  }
}

// Function to fetch the generated PDF
async function fetchGeneratedPdf(pdfDownloadUrl) {
  try {
    console.log(`[Service] Fetching PDF from: ${pdfDownloadUrl}`);
    const response = await axios.get(pdfDownloadUrl, {
      responseType: "stream", // Important for handling binary data
    });
    console.log("[Service] Successfully fetched PDF stream.");
    return response.data; // Return the stream
  } catch (error) {
    console.error("[Service] Error fetching generated PDF:", error.response ? error.response.status : error.message);
    throw new Error("Could not fetch the generated PDF from Templafy.");
  }
}

module.exports = {
  generateTemplafyDocument,
  fetchGeneratedPdf,
};

