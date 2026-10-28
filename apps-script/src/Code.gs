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
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doTestCredentials(user, pass) {
  var credentialsSheet = SpreadsheetApp.openById("16zAOsI_j2HJnsle44EoU7f7BXOd6UP0lA1Q3mcSpbio");
  var credentialsTab = credentialsSheet.getSheetByName("Data");
  var data = credentialsTab.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    var username = data[i][0].toString();
    if (username == user) {
      if (data[i][1].toString() == pass) {
        return "true";
      }
    }
  }

  return false;
}

function doGetUserLast(user) {
  var credentialsSheet = SpreadsheetApp.openById("16zAOsI_j2HJnsle44EoU7f7BXOd6UP0lA1Q3mcSpbio");
  var credentialsTab = credentialsSheet.getSheetByName("Data");
  var data = credentialsTab.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == user) {
      var name = data[i][2];
      name = (name !== null && name !== undefined) ? String(name).trim() : "";
      return name === "" ? " " : name;
    }
  }

  return null;
}

function doPost(e) {
  var createResponse = function (status, payload) {
    var output = { status: status, message: payload };
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse("error", "No data received in request body.");
    }

    var data;

    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createResponse("error", "Invalid JSON payload: " + parseErr.toString());
    }

    if (data.action === "doTestCredentials") {
      var isValid = doTestCredentials(data.user, data.pass);
      return createResponse(isValid ? "success" : "error", isValid ? "Access Granted" : "Access Denied");
    }

    if (data.action == "doGetUserLast") {
      var userLast = doGetUserLast(data.user);
      return createResponse(userLast !== null ? "success" : "error", userLast);
    }

    var category = data.category;
    var section = data.section;
    var lesson = data.lesson;
    var tocData = data.tocData || [];
    var pageElements = data.pageElements || [];

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

    return createResponse("success", "Data synchronized successfully!");
  } catch (error) {
    return createResponse("error", error.toString());
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
