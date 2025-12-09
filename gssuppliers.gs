// Setup named ranges and sheets
function supSetupNamedRanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create Suppliers sheet
  let sheet = ss.getSheetByName("Suppliers");
  if (!sheet) {
    sheet = ss.insertSheet("Suppliers");
  }
  
  // Check if header exists, if not create it
  if (sheet.getLastRow() === 0) {
    const headers = ["Supplier ID", "Supplier Name", "Supplier Contact", "Supplier Email", "State", "City", "Supplier Address", "No Rek"];
    sheet.appendRow(headers);
  }
  
  // Create or update RANGESUPPLIERS named range
  try {
    ss.removeNamedRange("RANGESUPPLIERS");
  } catch (e) {
    // Range doesn't exist, which is fine
  }
  
  const range = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  ss.setNamedRange("RANGESUPPLIERS", range);
  
  Logger.log("Named ranges setup complete");
  return true;
}

// Test function - verify backend is working
function supTest() {
  return {
    success: true,
    message: "Backend is working!",
    timestamp: new Date().toString()
  };
}

// Setup suppliers sheet on first load or manual trigger
function supInitializeSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Suppliers");
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet("Suppliers");
      Logger.log("Created new 'Suppliers' sheet");
    }
    
    // Check if sheet has data
    const lastRow = sheet.getLastRow();
    
    if (lastRow === 0) {
      // Create headers
      const headers = ["Supplier ID", "Supplier Name", "Supplier Contact", "Supplier Email", "State", "City", "Supplier Address", "No Rek"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log("Added headers to Suppliers sheet");
    }
    
    // Force update named range to include all columns
    supForceUpdateNamedRange();
    
    // Create or update named range
    const result = supEnsureNamedRanges();
    Logger.log("Named range result:", result);
    
    return {
      success: true,
      message: "Suppliers sheet initialized successfully",
      sheetExists: true,
      hasData: lastRow > 1,
      headerRow: lastRow > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : []
    };
    
  } catch (error) {
    Logger.log("Error initializing suppliers sheet:", error.message);
    return {
      success: false,
      message: "Error initializing suppliers sheet: " + error.message,
      error: error.message
    };
  }
}

// Force update named range to include all columns (run this manually if needed)
function supForceUpdateNamedRange() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Suppliers");
    
    if (!sheet) {
      Logger.log("Sheet 'Suppliers' tidak ditemukan");
      return {
        success: false,
        message: "Sheet 'Suppliers' tidak ditemukan"
      };
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log("Force updating named range - Last Row:", lastRow, "Last Col:", lastCol);
    
    if (lastRow > 0 && lastCol > 0) {
      // Delete old named range if exists
      try {
        ss.removeNamedRange("RANGESUPPLIERS");
        Logger.log("Removed old RANGESUPPLIERS");
      } catch (e) {
        Logger.log("No existing RANGESUPPLIERS to remove");
      }
      
      // Create new named range with all columns
      const range = sheet.getRange(1, 1, lastRow, lastCol);
      ss.setNamedRange("RANGESUPPLIERS", range);
      
      Logger.log("Created new RANGESUPPLIERS: A1:" + String.fromCharCode(64 + lastCol) + lastRow);
      
      return {
        success: true,
        message: "Named range updated successfully",
        range: "A1:" + String.fromCharCode(64 + lastCol) + lastRow
      };
    } else {
      Logger.log("Sheet is empty or has no columns");
      return {
        success: false,
        message: "Sheet is empty"
      };
    }
    
  } catch (error) {
    Logger.log("Error force updating named range:", error.message);
    return {
      success: false,
      message: "Error: " + error.message
    };
  }
}

// Create named range if not exists
function supEnsureNamedRanges() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Suppliers");
    
    if (!sheet) {
      Logger.log("Sheet 'Suppliers' tidak ditemukan");
      return {
        success: false,
        message: "Sheet 'Suppliers' tidak ditemukan"
      };
    }
    
    // Check if named range already exists
    const existingRange = ss.getRangeByName("RANGESUPPLIERS");
    
    if (existingRange) {
      Logger.log("Named range 'RANGESUPPLIERS' sudah ada");
      return {
        success: true,
        message: "Named range 'RANGESUPPLIERS' sudah ada"
      };
    }
    
    // Get the last row with data
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow < 2) {
      Logger.log("Sheet 'Suppliers' masih kosong atau hanya memiliki header");
      // Create header row if not exists
      const headers = ["Supplier ID", "Supplier Name", "Supplier Contact", "Supplier Email", "State", "City", "Supplier Address", "No Rek"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Create named range for just the header
      const range = sheet.getRange(1, 1, 1, headers.length);
      ss.setNamedRange("RANGESUPPLIERS", range);
      
      return {
        success: true,
        message: "Sheet 'Suppliers' dibuat dengan header dan named range 'RANGESUPPLIERS' dibuat"
      };
    }
    
    // Create named range for all data including header
    const range = sheet.getRange(1, 1, lastRow, lastCol);
    ss.setNamedRange("RANGESUPPLIERS", range);
    
    Logger.log("Named range 'RANGESUPPLIERS' berhasil dibuat untuk range: A1:" + String.fromCharCode(64 + lastCol) + lastRow);
    
    return {
      success: true,
      message: "Named range 'RANGESUPPLIERS' berhasil dibuat"
    };
    
  } catch (error) {
    Logger.log("Error creating named range: " + error.message);
    return {
      success: false,
      message: "Error membuat named range: " + error.message
    };
  }
}

// Get all suppliers
function supGetSuppliers(email) {
  // 1. Server-side Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan login kembali.",
      sessionExpired: true
    };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Suppliers");
    
    // Create sheet if doesn't exist
    if (!sheet) {
      Logger.log("Sheet 'Suppliers' tidak ada, membuat baru...");
      sheet = ss.insertSheet("Suppliers");
      const headers = ["Supplier ID", "Supplier Name", "Supplier Contact", "Supplier Email", "State", "City", "Supplier Address", "No Rek"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      return {
        success: true,
        message: "Sheet 'Suppliers' baru dibuat",
        data: []
      };
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log("Suppliers sheet - lastRow:", lastRow, "lastCol:", lastCol);
    
    // If empty or only header
    if (lastRow <= 1) {
      Logger.log("Sheet kosong atau hanya header");
      // Ensure header exists
      if (lastRow === 0) {
        const headers = ["Supplier ID", "Supplier Name", "Supplier Contact", "Supplier Email", "State", "City", "Supplier Address", "No Rek"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      return {
        success: true,
        message: "Belum ada data supplier",
        data: []
      };
    }
    
    // Read all data
    const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 8)).getValues();
    const headers = data[0];
    
    Logger.log('Supplier headers:', headers);
    Logger.log('Total rows:', data.length);
    
    // Get column indices
    const idIndex = headers.indexOf("Supplier ID");
    const nameIndex = headers.indexOf("Supplier Name");
    const contactIndex = headers.indexOf("Supplier Contact");
    const emailIndex = headers.indexOf("Supplier Email");
    const stateIndex = headers.indexOf("State");
    const cityIndex = headers.indexOf("City");
    const addressIndex = headers.indexOf("Supplier Address");
    const noRekIndex = headers.indexOf("No Rek");
    
    const suppliers = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[0] || row[0].toString().trim() === '') continue;
      
      const supplier = {
        id: idIndex >= 0 ? row[idIndex] : '',
        name: nameIndex >= 0 ? row[nameIndex] : '',
        contact: contactIndex >= 0 ? row[contactIndex] : '',
        email: emailIndex >= 0 ? row[emailIndex] : '',
        state: stateIndex >= 0 ? row[stateIndex] : '',
        city: cityIndex >= 0 ? row[cityIndex] : '',
        address: addressIndex >= 0 ? row[addressIndex] : '',
        noRek: noRekIndex >= 0 ? row[noRekIndex] : ''
      };
      
      suppliers.push(supplier);
    }
    
    Logger.log('Total suppliers found:', suppliers.length);
    return {
      success: true,
      message: "Data supplier berhasil dimuat",
      data: suppliers
    };
    
  } catch (error) {
    Logger.log('Error getting suppliers:', error.message);
    return {
      success: false,
      message: "Error mengambil data supplier: " + error.message,
      data: []
    };
  }
}

// Add new supplier
function supAddNewSupplier(supplier, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Suppliers");
    
    if (!sheet) {
      return {
        success: false,
        message: "Sheet 'Suppliers' tidak ditemukan"
      };
    }
    
    // First ensure named range exists
    supEnsureNamedRanges();
    
    const range = ss.getRangeByName("RANGESUPPLIERS");
    
    if (!range) {
      return {
        success: false,
        message: "Named range 'RANGESUPPLIERS' tidak dapat dibuat"
      };
    }
    
    const data = range.getValues();
    const headers = data[0];
    
    const newRow = [];
    headers.forEach(header => {
      switch(header) {
        case "Supplier ID": newRow.push(supplier.id); break;
        case "Supplier Name": newRow.push(supplier.name); break;
        case "Supplier Contact": newRow.push(supplier.contact); break;
        case "Supplier Email": newRow.push(supplier.email); break;
        case "State": newRow.push(supplier.state); break;
        case "City": newRow.push(supplier.city); break;
        case "Supplier Address": newRow.push(supplier.address); break;
        case "No Rek": newRow.push(supplier.noRek || ''); break;
        case "Total Purchases": newRow.push(0); break;
        case "Total Payments": newRow.push(0); break;
        case "Balance Payable": newRow.push(0); break;
        default: newRow.push(''); break;
      }
    });
    
    // Append to sheet
    sheet.appendRow(newRow);
    
    // Update named range to include new row
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const updatedRange = sheet.getRange(1, 1, lastRow, lastCol);
    ss.setNamedRange("RANGESUPPLIERS", updatedRange);
    
    Logger.log("Named range RANGESUPPLIERS updated to include new row");
    
    return {
      success: true,
      message: "Supplier berhasil ditambahkan",
      data: {
        name: supplier.name
      }
    };
    
  } catch (error) {
    Logger.log('Error adding supplier:', error.message);
    return {
      success: false,
      message: "Error menambahkan supplier: " + error.message
    };
  }
}

// Update supplier
function supUpdateSupplier(supplier, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Suppliers");
    
    // First ensure named range exists
    supEnsureNamedRanges();
    
    const range = ss.getRangeByName("RANGESUPPLIERS");
    
    if (!range) {
      return {
        success: false,
        message: "Named range 'RANGESUPPLIERS' tidak ditemukan"
      };
    }
    
    const data = range.getValues();
    const headers = data[0];
    
    // Get all column indices once (same pattern as supGetSuppliers)
    const idIndex = headers.indexOf("Supplier ID");
    const nameIndex = headers.indexOf("Supplier Name");
    const contactIndex = headers.indexOf("Supplier Contact");
    const emailIndex = headers.indexOf("Supplier Email");
    const stateIndex = headers.indexOf("State");
    const cityIndex = headers.indexOf("City");
    const addressIndex = headers.indexOf("Supplier Address");
    const noRekIndex = headers.indexOf("No Rek");
    
    // Validate that name column exists
    if (nameIndex === -1) {
      Logger.log("ERROR: Supplier Name column not found in headers:", headers);
      return {
        success: false,
        message: "Kolom 'Supplier Name' tidak ditemukan di sheet"
      };
    }
    
    // Find row index by original name
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIndex] === supplier.originalName) {
        const rowNum = range.getRow() + i;
        
        Logger.log("Found supplier at row:", rowNum, "Original name:", supplier.originalName);
        
        // Update fields using the indices we found
        if (idIndex >= 0) sheet.getRange(rowNum, idIndex + 1).setValue(supplier.id);
        if (nameIndex >= 0) sheet.getRange(rowNum, nameIndex + 1).setValue(supplier.name);
        if (contactIndex >= 0) sheet.getRange(rowNum, contactIndex + 1).setValue(supplier.contact);
        if (emailIndex >= 0) sheet.getRange(rowNum, emailIndex + 1).setValue(supplier.email);
        if (stateIndex >= 0) sheet.getRange(rowNum, stateIndex + 1).setValue(supplier.state);
        if (cityIndex >= 0) sheet.getRange(rowNum, cityIndex + 1).setValue(supplier.city);
        if (addressIndex >= 0) sheet.getRange(rowNum, addressIndex + 1).setValue(supplier.address);
        if (noRekIndex >= 0) sheet.getRange(rowNum, noRekIndex + 1).setValue(supplier.noRek || '');
        
        Logger.log("Supplier updated at row: " + rowNum);
        
        return {
          success: true,
          message: "Supplier berhasil diupdate",
          data: {
            name: supplier.name
          }
        };
      }
    }
    
    Logger.log("Supplier not found with name:", supplier.originalName);
    Logger.log("Available rows in data:", data.length);
    
    return {
      success: false,
      message: "Supplier dengan nama '" + supplier.originalName + "' tidak ditemukan"
    };
    
  } catch (error) {
    Logger.log('Error updating supplier:', error.message);
    Logger.log('Error stack:', error.stack);
    return {
      success: false,
      message: "Error mengupdate supplier: " + error.message
    };
  }
}

// Delete supplier
function supDeleteSupplier(supplierName, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Suppliers");
    
    // First ensure named range exists
    supEnsureNamedRanges();
    
    const range = ss.getRangeByName("RANGESUPPLIERS");
    
    if (!range) {
      return {
        success: false,
        message: "Named range 'RANGESUPPLIERS' tidak ditemukan"
      };
    }
    
    const data = range.getValues();
    const headers = data[0];
    
    // Get column indices
    const nameIndex = headers.indexOf("Supplier Name");
    const balanceIndex = headers.indexOf("Balance Payable");
    
    // Validate that name column exists
    if (nameIndex === -1) {
      Logger.log("ERROR: Supplier Name column not found in headers:", headers);
      return {
        success: false,
        message: "Kolom 'Supplier Name' tidak ditemukan di sheet"
      };
    }
    
    // Find row index
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIndex] === supplierName) {
        const balance = balanceIndex >= 0 ? (data[i][balanceIndex] || 0) : 0;
        
        Logger.log("Found supplier:", supplierName, "Balance:", balance);
        
        // Check balance
        if (balance > 0) {
          return {
            success: false,
            message: "Tidak dapat menghapus supplier dengan saldo hutang: " + balance
          };
        }
        
        // Delete row
        const rowNum = range.getRow() + i;
        sheet.deleteRow(rowNum);
        
        Logger.log("Deleted row:", rowNum);
        
        // Update named range after deletion
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow > 0) {
          const updatedRange = sheet.getRange(1, 1, lastRow, lastCol);
          ss.setNamedRange("RANGESUPPLIERS", updatedRange);
          Logger.log("Named range RANGESUPPLIERS updated after deletion");
        }
        
        Logger.log("Supplier deleted: " + supplierName);
        
        return {
          success: true,
          message: "Supplier berhasil dihapus",
          data: {
            name: supplierName
          }
        };
      }
    }
    
    Logger.log("Supplier not found:", supplierName);
    return {
      success: false,
      message: "Supplier dengan nama '" + supplierName + "' tidak ditemukan"
    };
    
  } catch (error) {
    Logger.log('Error deleting supplier:', error.message);
    Logger.log('Error stack:', error.stack);
    return {
      success: false,
      message: "Error menghapus supplier: " + error.message
    };
  }
}