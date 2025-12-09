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