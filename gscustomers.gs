// Setup named ranges and sheets
function custSetupNamedRanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create Customers sheet
  let sheet = ss.getSheetByName("Customers");
  if (!sheet) {
    sheet = ss.insertSheet("Customers");
  }
  
  // Check if header exists, if not create it
  if (sheet.getLastRow() === 0) {
    const headers = ["Customer ID", "Customer Name", "Customer Contact", "Customer Email", "State", "City", "Customer Address", "No Rek"];
    sheet.appendRow(headers);
  }
  
  // Create or update RANGECUSTOMERS named range
  try {
    ss.removeNamedRange("RANGECUSTOMERS");
  } catch (e) {
    // Range doesn't exist, which is fine
  }
  
  const range = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  ss.setNamedRange("RANGECUSTOMERS", range);
  
  // Get or create CState sheet
  let stateSheet = ss.getSheetByName("CState");
  if (!stateSheet) {
    stateSheet = ss.insertSheet("CState");
    stateSheet.appendRow(["State"]);
  }
  
  // Get or create CCity sheet
  let citySheet = ss.getSheetByName("CCity");
  if (!citySheet) {
    citySheet = ss.insertSheet("CCity");
    citySheet.appendRow(["City"]);
  }
  
  Logger.log("Named ranges setup complete");
  return true;
}

// Get all customers
function custGetCustomers(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return []; // Return empty array or handle error appropriately
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Customers");
  const range = ss.getRangeByName("RANGECUSTOMERS");
  
  if (!range) {
    return [];
  }
  
  const data = range.getValues();
  const headers = data[0];
  const customers = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === '') continue; // Skip empty rows
    
    customers.push({
      id: row[headers.indexOf("Customer ID")],
      name: row[headers.indexOf("Customer Name")],
      contact: row[headers.indexOf("Customer Contact")],
      email: row[headers.indexOf("Customer Email")],
      state: row[headers.indexOf("State")],
      city: row[headers.indexOf("City")],
      address: row[headers.indexOf("Customer Address")],
      noRek: row[headers.indexOf("No Rek")] || ''
    });
  }
  
  return customers;
}

// Get states from CState sheet
function custGetStates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("CState");
  
  if (!sheet) {
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return [];
  }
  
  // Get states from column A, starting from row 2
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const states = [];
  
  for (let i = 0; i < data.length; i++) {
    const state = data[i][0].toString().trim();
    if (state) {
      states.push(state);
    }
  }
  
  return states;
}

// Get cities from CCity
function custGetCities() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("CCity");
  
  if (!sheet) {
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return [];
  }
  
  // Get all data from column A, skip header (row 1)
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const cities = [];
  
  for (let i = 0; i < data.length; i++) {
    const city = data[i][0].toString().trim();
    if (city && !cities.includes(city)) {
      cities.push(city);
    }
  }
  
  return cities;
}

// Add new state to CState
function custAddNewState(stateName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    if (!stateName || stateName.trim() === '') {
      return false;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CState");
    
    if (!sheet) {
      Logger.log("CState sheet not found");
      return false;
    }
    
    const trimmedName = stateName.trim();
    const lastRow = sheet.getLastRow();
    
    // Check for duplicates if data exists
    if (lastRow >= 2) {
      const existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i][0].toString().trim() === trimmedName) {
          Logger.log("Duplicate state: " + trimmedName);
          return false;
        }
      }
    }
    
    // Append to next row
    const nextRow = lastRow + 1;
    sheet.getRange(nextRow, 1).setValue(trimmedName);
    
    // Verify write
    const written = sheet.getRange(nextRow, 1).getValue().toString().trim();
    if (written === trimmedName) {
      Logger.log("Successfully added state: " + trimmedName + " at row " + nextRow);
      return true;
    } else {
      Logger.log("Failed to verify write for state: " + trimmedName);
      return false;
    }
    
  } catch (e) {
    Logger.log("Error in custAddNewState: " + e.toString());
    return false;
  }
}

// Add new city to CCity
function custAddNewCity(cityName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    if (!cityName || cityName.trim() === '') {
      return false;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CCity");
    
    if (!sheet) {
      Logger.log("CCity sheet not found");
      return false;
    }
    
    const trimmedName = cityName.trim();
    const lastRow = sheet.getLastRow();
    
    // Check for duplicates if data exists
    if (lastRow >= 2) {
      const existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i][0].toString().trim() === trimmedName) {
          Logger.log("Duplicate city: " + trimmedName);
          return false;
        }
      }
    }
    
    // Append to next row
    const nextRow = lastRow + 1;
    sheet.getRange(nextRow, 1).setValue(trimmedName);
    
    // Verify write
    const written = sheet.getRange(nextRow, 1).getValue().toString().trim();
    if (written === trimmedName) {
      Logger.log("Successfully added city: " + trimmedName + " at row " + nextRow);
      return true;
    } else {
      Logger.log("Failed to verify write for city: " + trimmedName);
      return false;
    }
    
  } catch (e) {
    Logger.log("Error in custAddNewCity: " + e.toString());
    return false;
  }
}

// Update state in CState
function custUpdateState(oldStateName, newStateName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    if (!oldStateName || !newStateName) {
      Logger.log("Invalid parameters: oldStateName=" + oldStateName + ", newStateName=" + newStateName);
      return false;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CState");
    
    if (!sheet) {
      Logger.log("CState sheet not found");
      return false;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("CState sheet is empty");
      return false;
    }
    
    const trimmedOld = String(oldStateName).trim();
    const trimmedNew = String(newStateName).trim();
    
    Logger.log("=== custUpdateState ===");
    Logger.log("Looking for: [" + trimmedOld + "] to update to [" + trimmedNew + "]");
    
    // Find and update
    for (let row = 2; row <= lastRow; row++) {
      const cellValue = String(sheet.getRange(row, 1).getValue()).trim();
      Logger.log("Row " + row + ": [" + cellValue + "]");
      
      if (cellValue === trimmedOld) {
        Logger.log("Found match at row " + row + ", updating...");
        sheet.getRange(row, 1).setValue(trimmedNew);
        
        // Verify update
        const updated = String(sheet.getRange(row, 1).getValue()).trim();
        Logger.log("After update, cell value: [" + updated + "]");
        
        if (updated === trimmedNew) {
          Logger.log("SUCCESS: Updated state from [" + trimmedOld + "] to [" + trimmedNew + "]");
          return true;
        } else {
          Logger.log("VERIFY FAILED: Expected [" + trimmedNew + "] but got [" + updated + "]");
          return false;
        }
      }
    }
    
    Logger.log("ERROR: State not found: [" + trimmedOld + "]");
    return false;
  } catch (e) {
    Logger.log("Exception in custUpdateState: " + e.toString());
    return false;
  }
}

// Delete state from CState - using rebuild approach
function custDeleteState(stateName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    Logger.log("=== START custDeleteState ===");
    
    if (!stateName) {
      Logger.log("custDeleteState: stateName is empty");
      return false;
    }
    
    Logger.log("Input stateName: [" + stateName + "]");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CState");
    
    if (!sheet) {
      Logger.log("CState sheet not found");
      return false;
    }
    
    const lastRow = sheet.getLastRow();
    Logger.log("Last row: " + lastRow);
    
    if (lastRow < 2) {
      Logger.log("CState sheet is empty");
      return false;
    }
    
    const trimmedName = String(stateName).trim();
    Logger.log("Trimmed name: [" + trimmedName + "]");
    
    // Read all data
    Logger.log("Reading data from row 2 to " + lastRow);
    const allData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    Logger.log("Read " + allData.length + " rows");
    
    let found = false;
    const newData = [];
    
    // Keep only rows that don't match the delete target
    for (let i = 0; i < allData.length; i++) {
      const cellValue = String(allData[i][0]).trim();
      Logger.log("  Row " + (i + 2) + ": [" + cellValue + "]");
      
      if (cellValue === trimmedName) {
        found = true;
        Logger.log("    MATCH FOUND!");
      } else if (cellValue) {
        newData.push([cellValue]);
      }
    }
    
    if (!found) {
      Logger.log("State not found: [" + trimmedName + "]");
      return false;
    }
    
    Logger.log("Found state to delete. Clearing rows...");
    
    // Clear and rewrite
    if (lastRow > 1) {
      Logger.log("Clearing range from row 2 to " + lastRow);
      sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
      Logger.log("Cleared successfully");
    }
    
    if (newData.length > 0) {
      Logger.log("Writing " + newData.length + " rows back");
      sheet.getRange(2, 1, newData.length, 1).setValues(newData);
      Logger.log("Wrote successfully");
    }
    
    Logger.log("SUCCESS: Deleted [" + trimmedName + "]");
    return true;
  } catch (e) {
    Logger.log("EXCEPTION in custDeleteState");
    Logger.log("Error: " + e.toString());
    Logger.log("Stack: " + e.stack);
    Logger.log("Line: " + e.lineNumber);
    return false;
  }
}

// Update city in CCity
function custUpdateCity(oldCityName, newCityName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    if (!oldCityName || !newCityName) {
      Logger.log("Invalid parameters: oldCityName=" + oldCityName + ", newCityName=" + newCityName);
      return false;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CCity");
    
    if (!sheet) {
      Logger.log("CCity sheet not found");
      return false;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("CCity sheet is empty");
      return false;
    }
    
    const trimmedOld = String(oldCityName).trim();
    const trimmedNew = String(newCityName).trim();
    
    Logger.log("=== custUpdateCity ===");
    Logger.log("Looking for: [" + trimmedOld + "] to update to [" + trimmedNew + "]");
    
    // Find and update
    for (let row = 2; row <= lastRow; row++) {
      const cellValue = String(sheet.getRange(row, 1).getValue()).trim();
      Logger.log("Row " + row + ": [" + cellValue + "]");
      
      if (cellValue === trimmedOld) {
        Logger.log("Found match at row " + row + ", updating...");
        sheet.getRange(row, 1).setValue(trimmedNew);
        
        // Verify update
        const updated = String(sheet.getRange(row, 1).getValue()).trim();
        Logger.log("After update, cell value: [" + updated + "]");
        
        if (updated === trimmedNew) {
          Logger.log("SUCCESS: Updated city from [" + trimmedOld + "] to [" + trimmedNew + "]");
          return true;
        } else {
          Logger.log("VERIFY FAILED: Expected [" + trimmedNew + "] but got [" + updated + "]");
          return false;
        }
      }
    }
    
    Logger.log("ERROR: City not found: [" + trimmedOld + "]");
    return false;
  } catch (e) {
    Logger.log("Exception in custUpdateCity: " + e.toString());
    return false;
  }
}

// Delete city from CCity - using rebuild approach
function custDeleteCity(cityName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    Logger.log("=== START custDeleteCity ===");
    
    if (!cityName) {
      Logger.log("custDeleteCity: cityName is empty");
      return false;
    }
    
    Logger.log("Input cityName: [" + cityName + "]");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Got spreadsheet");
    
    // Try multiple sheet name variations
    let sheet = ss.getSheetByName("CCity");
    if (!sheet) {
      Logger.log("CCity not found, trying ccity...");
      sheet = ss.getSheetByName("ccity");
    }
    if (!sheet) {
      Logger.log("ccity not found, trying City...");
      sheet = ss.getSheetByName("City");
    }
    
    Logger.log("Got sheet: " + (sheet ? sheet.getName() : "NOT FOUND"));
    
    if (!sheet) {
      Logger.log("Could not find city sheet with any name variant");
      return false;
    }
    
    const lastRow = sheet.getLastRow();
    Logger.log("Last row: " + lastRow);
    
    if (lastRow < 2) {
      Logger.log("City sheet is empty");
      return false;
    }
    
    const trimmedName = String(cityName).trim();
    Logger.log("Trimmed name: [" + trimmedName + "]");
    
    // Read all data
    Logger.log("Reading data from row 2 to " + lastRow);
    const allData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    Logger.log("Read " + allData.length + " rows");
    
    let found = false;
    const newData = [];
    
    // Keep only rows that don't match the delete target
    for (let i = 0; i < allData.length; i++) {
      const cellValue = String(allData[i][0]).trim();
      Logger.log("  Row " + (i + 2) + ": [" + cellValue + "]");
      
      if (cellValue === trimmedName) {
        found = true;
        Logger.log("    MATCH FOUND!");
      } else if (cellValue) {
        newData.push([cellValue]);
      }
    }
    
    if (!found) {
      Logger.log("City not found: [" + trimmedName + "]");
      return false;
    }
    
    Logger.log("Found city to delete. Clearing rows...");
    
    // Clear and rewrite
    if (lastRow > 1) {
      Logger.log("Clearing range from row 2 to " + lastRow);
      sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
      Logger.log("Cleared successfully");
    }
    
    if (newData.length > 0) {
      Logger.log("Writing " + newData.length + " rows back");
      sheet.getRange(2, 1, newData.length, 1).setValues(newData);
      Logger.log("Wrote successfully");
    }
    
    Logger.log("SUCCESS: Deleted [" + trimmedName + "]");
    return true;
  } catch (e) {
    Logger.log("EXCEPTION in custDeleteCity");
    Logger.log("Error: " + e.toString());
    Logger.log("Stack: " + e.stack);
    Logger.log("Line: " + e.lineNumber);
    return false;
  }
}

function custGenerateCustomerId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Customers");
  const range = ss.getRangeByName("RANGECUSTOMERS");
  
  if (!range) {
    return "C" + Math.floor(10000 + Math.random() * 90000);
  }
  
  const data = range.getValues();
  const headers = data[0];
  const idIndex = headers.indexOf("Customer ID");
  const existingIds = new Set();
  
  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIndex];
    if (id && id !== '') {
      existingIds.add(id);
    }
  }
  
  let newId;
  do {
    newId = "C" + Math.floor(10000 + Math.random() * 90000);
  } while (existingIds.has(newId));
  
  return newId;
}

// Add new customer
function custAddNewCustomer(customer, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Customers");
    const range = ss.getRangeByName("RANGECUSTOMERS");
    
    if (!range) {
      console.log('RANGECUSTOMERS not found');
      return false;
    }
    
    const data = range.getValues();
    const headers = data[0];
    
    const newRow = [];
    headers.forEach(header => {
      switch(header) {
        case "Customer ID": newRow.push(customer.id); break;
        case "Customer Name": newRow.push(customer.name); break;
        case "Customer Contact": newRow.push(customer.contact); break;
        case "Customer Email": newRow.push(customer.email); break;
        case "State": newRow.push(customer.state); break;
        case "City": newRow.push(customer.city); break;
        case "Customer Address": newRow.push(customer.address); break;
        case "No Rek": newRow.push(customer.noRek || ''); break;
        default: newRow.push(''); break;
      }
    });
    
    // Append to sheet
    sheet.appendRow(newRow);
    console.log('Customer added:', customer.id);
    return true;
  } catch (error) {
    console.error('Error adding customer:', error);
    return false;
  }
}

// Update customer
function custUpdateCustomer(customer, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return false;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Customers");
    const range = ss.getRangeByName("RANGECUSTOMERS");
    
    if (!range) {
      console.log('RANGECUSTOMERS not found');
      return false;
    }
    
    const data = range.getValues();
    const headers = data[0];
    const idIndex = headers.indexOf("Customer ID");
    
    // Find row index
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === customer.id) {
        const rowNum = range.getRow() + i;
        
        // Update editable fields
        sheet.getRange(rowNum, headers.indexOf("Customer Name") + 1).setValue(customer.name);
        sheet.getRange(rowNum, headers.indexOf("Customer Contact") + 1).setValue(customer.contact);
        sheet.getRange(rowNum, headers.indexOf("Customer Email") + 1).setValue(customer.email);
        sheet.getRange(rowNum, headers.indexOf("State") + 1).setValue(customer.state);
        sheet.getRange(rowNum, headers.indexOf("City") + 1).setValue(customer.city);
        sheet.getRange(rowNum, headers.indexOf("Customer Address") + 1).setValue(customer.address);
        
        // Update No Rek if header exists
        const noRekIndex = headers.indexOf("No Rek");
        if (noRekIndex !== -1) {
          sheet.getRange(rowNum, noRekIndex + 1).setValue(customer.noRek || '');
        }
        
        console.log('Customer updated:', customer.id);
        return true;
      }
    }
    
    console.log('Customer not found:', customer.id);
    return false;
  } catch (error) {
    console.error('Error updating customer:', error);
    return false;
  }
}

// Delete customer - using rebuild approach
function custDeleteCustomer(customerId, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return "error"; // Or handle error appropriately
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Customers");
    const range = ss.getRangeByName("RANGECUSTOMERS");
    
    if (!range) {
      console.log('RANGECUSTOMERS not found');
      return "error";
    }
    
    const data = range.getValues();
    const headers = data[0];
    const idIndex = headers.indexOf("Customer ID");
    
    // Find and collect rows to keep
    let found = false;
    const newData = [headers];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === customerId) {
        found = true;
        console.log("Found customer to delete: " + customerId);
      } else if (data[i][0] !== '') { // Skip empty rows
        newData.push(data[i]);
      }
    }
    
    if (!found) {
      console.log("Customer not found: " + customerId);
      return "not_found";
    }
    
    // Clear all data rows and rewrite
    const dataRowCount = data.length - 1;
    if (dataRowCount > 0) {
      sheet.getRange(range.getRow() + 1, 1, dataRowCount, headers.length).clearContent();
    }
    
    if (newData.length > 1) {
      sheet.getRange(range.getRow() + 1, 1, newData.length - 1, headers.length).setValues(newData.slice(1));
    }
    
    console.log("Customer deleted successfully: " + customerId);
    return true;
  } catch (e) {
    console.log("Error in custDeleteCustomer: " + e.toString());
    return false;
  }
}