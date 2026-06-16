/**
 * Angaria Small Business Co-Society
 * Google Sheets Backend API (Serverless)
 */

const REQUIRED_SHEETS = [
  "Products", "StockMovement", "Customers", "Guarantors",
  "EMISales", "EMICollections", "Suppliers", "Expenses",
  "Users", "Settings"
];

// Helper: Run this to instantly create all tables/sheets in your document
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  REQUIRED_SHEETS.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      ss.insertSheet(sheetName);
    }
  });
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    return handleRequest(params);
  } catch (error) {
    return respond({ success: false, error: "Invalid POST Body: " + error.message });
  }
}

function doGet(e) {
  return handleRequest(e.parameter);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(params) {
  try {
    const action = params.action;
    const sheetName = params.sheetName;
    
    if (action === 'backup') {
      return respond({ success: true, data: createBackup() });
    }

    if (!action || !sheetName) {
      throw new Error("Missing 'action' or 'sheetName'");
    }

    let result;
    switch (action) {
      case 'create':
        result = createRecord(sheetName, params.data);
        break;
      case 'readAll':
        result = readAll(sheetName);
        break;
      case 'readById':
        result = readById(sheetName, params.id);
        break;
      case 'update':
        result = updateRecord(sheetName, params.id, params.data);
        break;
      case 'delete':
        result = deleteRecord(sheetName, params.id);
        break;
      case 'search':
        result = searchRecord(sheetName, params.query);
        break;
      default:
        throw new Error("Unknown action: " + action);
    }

    return respond({ success: true, data: result });
  } catch (error) {
    return respond({ success: false, error: error.message || String(error) });
  }
}

function validateDuplicates(sheetName, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if(lastRow < 2) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const idIdx = headers.indexOf('id');
  
  if (sheetName === 'Products') {
    const imei1Idx = headers.indexOf('imei1');
    if (imei1Idx !== -1 && data.imei1) {
      if (allData.some(row => String(row[imei1Idx]) === String(data.imei1) && (!data.id || String(row[idIdx]) !== String(data.id)))) {
        throw new Error(`Duplicate validation failed: IMEI 1 (${data.imei1}) already exists.`);
      }
    }
  }
  
  if (sheetName === 'Customers') {
    const nidIdx = headers.indexOf('nidObject');
    const mobileIdx = headers.indexOf('mobile');
    
    if (nidIdx !== -1 && data.nidObject) {
      if (allData.some(row => String(row[nidIdx]) === String(data.nidObject) && (!data.id || String(row[idIdx]) !== String(data.id)))) {
        throw new Error(`Duplicate validation failed: NID (${data.nidObject}) already exists.`);
      }
    }
    if (mobileIdx !== -1 && data.mobile) {
      if (allData.some(row => String(row[mobileIdx]) === String(data.mobile) && (!data.id || String(row[idIdx]) !== String(data.id)))) {
        throw new Error(`Duplicate validation failed: Mobile Number (${data.mobile}) already exists.`);
      }
    }
  }
}

function getHeaders(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function ensureHeadersAndGetDataArray(sheetName, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  
  let headers = getHeaders(sheet);
  
  if (headers.length === 0) {
    if (!data.id) data.id = Utilities.getUuid();
    headers = Object.keys(data);
    if (!headers.includes('id')) headers.unshift('id');
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (!data.id) {
    data.id = Utilities.getUuid();
  }

  for (const key of Object.keys(data)) {
    if (!headers.includes(key)) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
    }
  }
  
  const rowArray = headers.map(header => {
    let val = data[header];
    if (val === undefined || val === null) val = '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });
  
  return { sheet, headers, rowArray, record: data };
}

function createRecord(sheetName, data) {
  validateDuplicates(sheetName, data);
  const { sheet, rowArray, record } = ensureHeadersAndGetDataArray(sheetName, data);
  sheet.appendRow(rowArray);
  return record;
}

function readAll(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const headers = getHeaders(sheet);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      try {
          if(typeof val === 'string' && val.startsWith('{')) val = JSON.parse(val);
      } catch(e) {}
      obj[header] = val;
    });
    return obj;
  });
}

function readById(sheetName, id) {
   const records = readAll(sheetName);
   const record = records.find(r => String(r.id) === String(id));
   if (!record) throw new Error("Record not found");
   return record;
}

function updateRecord(sheetName, id, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("Sheet empty or missing");
  
  const headers = getHeaders(sheet);
  const idIdx = headers.indexOf('id');
  if (idIdx === -1) throw new Error("No 'id' column found");
  
  const ids = sheet.getRange(2, idIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  const rowIndex = ids.findIndex(row => String(row[0]) === String(id));
  
  if (rowIndex === -1) throw new Error("Record not found: " + id);
  const targetRow = rowIndex + 2; 
  
  const currentRowValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  let currentObj = {};
  headers.forEach((header, i) => { currentObj[header] = currentRowValues[i]; });
  
  const updatedObj = { ...currentObj, ...updates };
  
  validateDuplicates(sheetName, updatedObj);
  
  const newRowValues = headers.map(header => updatedObj[header] !== undefined ? updatedObj[header] : '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRowValues]);
  return updatedObj;
}

function deleteRecord(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = getHeaders(sheet);
  const idIdx = headers.indexOf('id');
  const ids = sheet.getRange(2, idIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  const rowIndex = ids.findIndex(row => String(row[0]) === String(id));
  if (rowIndex === -1) throw new Error("Record not found");
  sheet.deleteRow(rowIndex + 2);
  return { success: true, deletedId: id };
}

function searchRecord(sheetName, queryObj) {
  let records = readAll(sheetName);
  return records.filter(record => {
    return Object.keys(queryObj).every(key => String(record[key]) === String(queryObj[key]));
  });
}

function createBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupName = "Angaria_Backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const ssId = ss.getId();
  const file = DriveApp.getFileById(ssId);
  
  // Check if we can find parent folders
  let folder = DriveApp.getRootFolder();
  const parents = file.getParents();
  if (parents.hasNext()) {
    folder = parents.next();
  }
  
  file.makeCopy(backupName, folder);
  return { backupName: backupName, timestamp: new Date().toISOString() };
}
