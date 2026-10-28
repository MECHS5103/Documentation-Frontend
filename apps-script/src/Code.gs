function doGet(e) {
  try {
    var TOC_SPREADSHEET_ID = "1NwXxIsuYAzM44GuAqOUeq6vMNNY1HXX-MynpLd7smVQ";
    var PAGES_SPREADSHEET_ID = "159ATSwxFAs1NEoyuTmnSrpDPMCHZUaQK8SMT1Ayf1X4";

    var category = e.parameter.category;
    var section = e.parameter.section;
    var lesson = e.parameter.lesson;
    var isTocRequest = e.parameter.toc === "true";

    if (!category || category === 'Landing Page') {
      return ContentService.createTextOutput(JSON.stringify({ data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var targetCategoryClean = String(category).trim().toLowerCase();
    var responseArray = [];

    if (isTocRequest) {
      var targetSpreadsheet = SpreadsheetApp.openById(TOC_SPREADSHEET_ID);
      var sheets = targetSpreadsheet.getSheets();
      var targetSheet = null;

      for (var s = 0; s < sheets.length; s++) {
        var sheetNameClean = sheets[s].getName().trim().toLowerCase();
        if (sheetNameClean === targetCategoryClean) {
          targetSheet = sheets[s];
          break;
        }
      }

      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          error: "TOC sheet matching '" + category + "' was not found."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var data = targetSheet.getDataRange().getValues();
      for (var i = 0; i < data.length; i++) {
        var type = data[i][0];
        var text = data[i][1];
        if (!type) continue;

        if (type === 'SubjectText' || type === 'LessonText') {
          responseArray.push({ type: type, text: text });
        }
      }
    } else {
      var targetSpreadsheet = SpreadsheetApp.openById(PAGES_SPREADSHEET_ID);
      var sheets = targetSpreadsheet.getSheets();
      var targetSheet = null;

      for (var s = 0; s < sheets.length; s++) {
        var tempSheet = sheets[s];
        if (tempSheet.getLastRow() >= 1) {
          var headerRow = tempSheet.getRange(1, 1, 1, 3).getValues()[0];

          var sheetCategory = String(headerRow[0]).trim().toLowerCase();
          var sheetSection = String(headerRow[1]).trim().toLowerCase();
          var sheetLesson = String(headerRow[2]).trim().toLowerCase();

          if (
            sheetCategory === targetCategoryClean &&
            (!section || sheetSection === String(section).trim().toLowerCase()) &&
            (!lesson || sheetLesson === String(lesson).trim().toLowerCase())
          ) {
            targetSheet = tempSheet;
            break;
          }
        }
      }

      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          error: "No matching page found for Category: " + category + ", Section: " + section + ", Lesson: " + lesson
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var data = targetSheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        var type = data[i][0];
        var colB = data[i][1];
        var colC = data[i][2];
        if (!type) continue;

        if (type === 'VideoPill' || type === 'Video') {
          var titleVal = '';
          var captionVal = '';

          try {
            var parsedJson = JSON.parse(colB);
            titleVal = parsedJson.title || '';
            captionVal = parsedJson.caption || '';
          } catch (e) {
            titleVal = colB || '';
          }

          responseArray.push({
            type: 'VideoPill',
            title: titleVal,
            caption: captionVal,
            videoUrl: colC || ''
          });
        } else {
          responseArray.push({
            type: type,
            text: colB,
            language: colC || ''
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ data: responseArray }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("Content read failed", err);
    return ContentService.createTextOutput(JSON.stringify({
      error: "The requested content could not be loaded.",
      code: "INTERNAL_ERROR"
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getRequiredScriptProperty(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error("Missing required server configuration.");
  return value;
}

function decodeFirebaseTokenPayload(idToken) {
  var parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Unauthorized");

  try {
    var decoded = Utilities.base64DecodeWebSafe(parts[1]);
    return JSON.parse(Utilities.newBlob(decoded).getDataAsString());
  } catch (error) {
    throw new Error("Unauthorized");
  }
}

function verifyEditorToken(idToken) {
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 8192) {
    throw new Error("Unauthorized");
  }

  var apiKey = getRequiredScriptProperty("FIREBASE_WEB_API_KEY");
  var projectId = getRequiredScriptProperty("FIREBASE_PROJECT_ID");
  var response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) throw new Error("Unauthorized");

  var body = JSON.parse(response.getContentText());
  if (!body.users || body.users.length !== 1) throw new Error("Unauthorized");

  var user = body.users[0];
  var claims = decodeFirebaseTokenPayload(idToken);
  var provider = claims.firebase && claims.firebase.sign_in_provider;

  if (
    user.disabled === true ||
    user.emailVerified !== true ||
    !user.localId ||
    claims.sub !== user.localId ||
    claims.aud !== projectId ||
    claims.iss !== "https://securetoken.google.com/" + projectId ||
    claims.editor !== true ||
    provider !== "google.com"
  ) {
    throw new Error("Unauthorized");
  }

  return {
    uid: user.localId,
    email: String(user.email || ""),
    displayName: String(user.displayName || user.email || "Editor")
  };
}

function readExistingContributors(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === "Credits") {
      return String(values[i][1] || "")
        .split(",")
        .map(function (name) { return name.trim(); })
        .filter(Boolean);
    }
  }
  return [];
}

function applyAuthenticatedContributor(pageElements, existingContributors, principal) {
  var contributors = existingContributors.slice();
  var authenticatedName = principal.displayName || principal.email || principal.uid;
  var alreadyPresent = contributors.some(function (name) {
    return name.toLowerCase() === authenticatedName.toLowerCase();
  });

  if (!alreadyPresent) contributors.push(authenticatedName);

  var withoutClientCredits = pageElements.filter(function (item) {
    return item && item.type !== "Credits";
  });
  withoutClientCredits.push({ type: "Credits", text: contributors.join(", ") });
  return withoutClientCredits;
}

function invalidPayload(message) {
  var error = new Error(message);
  error.code = "INVALID_PAYLOAD";
  throw error;
}

function requireString(value, field, maxLength, allowEmpty) {
  if (typeof value !== "string") invalidPayload(field + " must be a string.");
  var normalized = value.trim();
  if (!allowEmpty && normalized === "") invalidPayload(field + " is required.");
  if (value.length > maxLength) invalidPayload(field + " is too long.");
  return normalized;
}

function validateSavePayload(data) {
  if (!data || Object.prototype.toString.call(data) !== "[object Object]") {
    invalidPayload("The request body must be an object.");
  }
  if (!Array.isArray(data.tocData) || !Array.isArray(data.pageElements)) {
    invalidPayload("tocData and pageElements must be arrays.");
  }
  if (data.tocData.length > 500 || data.pageElements.length > 200) {
    invalidPayload("The request contains too many elements.");
  }

  var category = requireString(data.category, "category", 80, false);
  var section = requireString(data.section, "section", 160, false);
  var lesson = requireString(data.lesson, "lesson", 160, false);
  if (/[\\/:*?\[\]]/.test(category)) {
    invalidPayload("category contains unsupported characters.");
  }

  var tocTypes = { SubjectText: true, LessonText: true };
  var pageTypes = {
    Title: true,
    HeaderText: true,
    Paragraph: true,
    VideoPill: true,
    Video: true,
    TipPill: true,
    WarningPill: true,
    CodePill: true,
    ImportantPill: true,
    SuccessPill: true,
    VocabularyPill: true,
    Credits: true
  };

  var tocData = data.tocData.map(function (item) {
    if (!item || Object.prototype.toString.call(item) !== "[object Object]") {
      invalidPayload("Every TOC item must be an object.");
    }
    var type = requireString(item.type, "tocData.type", 40, false);
    if (!tocTypes[type]) invalidPayload("Unsupported TOC item type.");
    return {
      type: type,
      text: requireString(item.text, "tocData.text", 300, false)
    };
  });

  var pageElements = data.pageElements.map(function (item) {
    if (!item || Object.prototype.toString.call(item) !== "[object Object]") {
      invalidPayload("Every page element must be an object.");
    }
    var type = requireString(item.type, "pageElements.type", 40, false);
    if (!pageTypes[type]) invalidPayload("Unsupported page element type.");

    var normalized = { type: type };
    if (type === "VideoPill" || type === "Video") {
      normalized.title = requireString(item.title || "", "video.title", 300, true);
      normalized.caption = requireString(item.caption || "", "video.caption", 2000, true);
      normalized.videoUrl = requireString(
        item.videoUrl || item.url || "",
        "video.videoUrl",
        2048,
        true
      );
      if (normalized.videoUrl && !/^https:\/\//i.test(normalized.videoUrl)) {
        invalidPayload("Video URLs must use HTTPS.");
      }
    } else {
      normalized.text = requireString(
        item.text !== undefined ? item.text : (item.description || ""),
        "pageElements.text",
        20000,
        true
      );
      normalized.language = requireString(item.language || "", "pageElements.language", 80, true);
    }
    return normalized;
  });

  return {
    category: category,
    section: section,
    lesson: lesson,
    tocData: tocData,
    pageElements: pageElements
  };
}

function doPost(e) {
  var createResponse = function (status, payload, code) {
    var output = { status: status, message: payload };
    if (code) output.code = code;
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse("error", "No data received in request body.", "EMPTY_BODY");
    }
    if (e.postData.contents.length > 1000000) {
      return createResponse("error", "Request body is too large.", "PAYLOAD_TOO_LARGE");
    }

    var data;

    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createResponse("error", "Invalid JSON payload.", "INVALID_JSON");
    }

    if (data.action !== "saveContent") {
      return createResponse("error", "Unsupported action.", "UNSUPPORTED_ACTION");
    }

    var principal;
    try {
      principal = verifyEditorToken(data.idToken);
    } catch (authError) {
      console.warn("Denied content mutation", authError.message);
      return createResponse("error", "Access Denied", "ACCESS_DENIED");
    }

    var payload;
    try {
      payload = validateSavePayload(data);
    } catch (validationError) {
      if (validationError.code === "INVALID_PAYLOAD") {
        return createResponse("error", validationError.message, "INVALID_PAYLOAD");
      }
      throw validationError;
    }

    var category = payload.category;
    var section = payload.section;
    var lesson = payload.lesson;
    var tocData = payload.tocData;
    var pageElements = payload.pageElements;

    var TOC_SPREADSHEET_ID = "1NwXxIsuYAzM44GuAqOUeq6vMNNY1HXX-MynpLd7smVQ";
    var PAGES_SPREADSHEET_ID = "159ATSwxFAs1NEoyuTmnSrpDPMCHZUaQK8SMT1Ayf1X4";

    if (category && section && lesson) {
      var pagesSs = SpreadsheetApp.openById(PAGES_SPREADSHEET_ID);
      var sheets = pagesSs.getSheets();
      var targetSheet = null;

      var targetCategoryClean = String(category).trim().toLowerCase();
      var targetSectionClean = String(section).trim().toLowerCase();
      var targetLessonClean = String(lesson).trim().toLowerCase();

      for (var s = 0; s < sheets.length; s++) {
        var tempSheet = sheets[s];
        if (tempSheet.getLastRow() >= 1) {
          var headerRow = tempSheet.getRange(1, 1, 1, 3).getValues()[0];
          if (
            String(headerRow[0]).trim().toLowerCase() === targetCategoryClean &&
            String(headerRow[1]).trim().toLowerCase() === targetSectionClean &&
            String(headerRow[2]).trim().toLowerCase() === targetLessonClean
          ) {
            targetSheet = tempSheet;
            break;
          }
        }
      }

      if (!targetSheet) {
        targetSheet = pagesSs.insertSheet(category.substring(0, 3) + "_" + lesson.substring(0, 10) + "_" + Date.now());
      }

      pageElements = applyAuthenticatedContributor(
        pageElements,
        readExistingContributors(targetSheet),
        principal
      );

      targetSheet.clear();
      targetSheet.getRange(1, 1, 1, 3).setValues([[category, section, lesson]]);
      targetSheet.appendRow(["Title", "", ""]);

      pageElements.forEach(function (item) {
        if (item.type === "Title") return;

        var itemType = item.type || "";
        var contentText = "";
        var extraValue = "";

        if (itemType === "VideoPill" || itemType === "Video") {
          contentText = JSON.stringify({
            title: item.title || "",
            caption: item.caption || ""
          });
          extraValue = item.videoUrl || item.url || "";
        } else {
          contentText = item.text !== undefined ? item.text : (item.description !== undefined ? item.description : "");
          extraValue = item.language || "";
        }

        targetSheet.appendRow([itemType, contentText, extraValue]);
      });
    }

    if (category && tocData.length > 0) {
      var tocSs = SpreadsheetApp.openById(TOC_SPREADSHEET_ID);
      var tocSheet = tocSs.getSheetByName(category) || tocSs.insertSheet(category);
      tocSheet.clear();

      tocData.forEach(function (tocItem) {
        tocSheet.appendRow([tocItem.type || "", tocItem.text || ""]);
      });
    }

    return createResponse("success", "Data synchronized successfully!", "OK");
  } catch (error) {
    console.error("Unhandled request failure", error);
    return createResponse("error", "The request could not be completed.", "INTERNAL_ERROR");
  }
}

function replaceVideoUrl(oldFirebaseUrl, driveFileId) {
  var PAGES_SPREADSHEET_ID = "159ATSwxFAs1NEoyuTmnSrpDPMCHZUaQK8SMT1Ayf1X4";
  var newDriveUrl = "https://drive.google.com/uc?export=download&id=" + driveFileId;

  var ss = SpreadsheetApp.openById(PAGES_SPREADSHEET_ID);
  var sheets = ss.getSheets();

  sheets.forEach(function (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] === oldFirebaseUrl) {
        sheet.getRange(i + 1, 3).setValue(newDriveUrl);
        Logger.log("Updated video link in sheet: " + sheet.getName());
      }
    }
  });
}
