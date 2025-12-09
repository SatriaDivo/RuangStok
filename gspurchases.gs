// Get all suppliers
function poGetSuppliers(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return [];
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Suppliers");
  const range = ss.getRangeByName("RANGESUPPLIERS");

  if (!range) {
    console.log("poGetSuppliers: RANGESUPPLIERS named range not found.");
    return [];
  }

  try {
    const data = range.getValues();
    if (!data || data.length === 0) {
      console.log("poGetSuppliers: No data found in RANGESUPPLIERS.");
      return [];
    }
    const headers = data[0];
    const suppliers = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.every(cell => cell === '' || cell === null || typeof cell === 'undefined')) continue;

      suppliers.push({
        id: row[headers.indexOf("Supplier ID")],
        name: row[headers.indexOf("Supplier Name")],
        state: row[headers.indexOf("State")],
        city: row[headers.indexOf("City")]
      });
    }
    return suppliers;
  } catch (e) {
    console.error("Error in poGetSuppliers: " + e.message + " Stack: " + e.stack);
    return [];
  }
}

// Get all inventory items
function poGetInventoryItems(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return [];
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("InventoryItems");
  const range = ss.getRangeByName("RANGEINVENTORYITEMS");

  if (!range) {
    console.log("poGetInventoryItems: RANGEINVENTORYITEMS named range not found.");
    return [];
  }

  try {
    const data = range.getValues();
    if (!data || data.length === 0) {
      console.log("poGetInventoryItems: No data found in RANGEINVENTORYITEMS.");
      return [];
    }
    const headers = data[0];
    const items = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.every(cell => cell === '' || cell === null || typeof cell === 'undefined')) continue;

      const getIdx = (idName, enName) => {
        const idIdx = headers.indexOf(idName);
        const enIdx = headers.indexOf(enName);
        return idIdx !== -1 ? idIdx : enIdx;
      };

      const itemId = row[getIdx("Kode Barang", "Item ID")];
      const itemName = row[getIdx("Nama Barang", "Item Name")];
      
      // Skip items without valid ID
      if (!itemId || itemId === '') continue;

      items.push({
        id: itemId,
        name: itemName || itemId, // Use ID as fallback if name is empty
        type: row[getIdx("Tipe Barang", "Item Type")],
        category: row[getIdx("Kategori Barang", "Item Category")],
        subcategory: row[getIdx("Sub Kategori Barang", "Item Subcategory")]
      });
    }
    console.log("poGetInventoryItems: Returning items:", items); // DEBUG
    return items;
  } catch (e) {
    console.error("Error in poGetInventoryItems: " + e.message + " Stack: " + e.stack);
    return [];
  }
}

// Generate PO ID
function poGeneratePOID(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return "ERROR_SESSION";
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseDetails");
  const range = ss.getRangeByName("RANGEPD");

  if (!range) {
    console.log("poGeneratePOID: RANGEPD named range not found. Generating simple ID.");
    return "PO" + Math.floor(10000 + Math.random() * 90000);
  }

  try {
    const data = range.getValues();
    const headers = data[0];
    const idIndex = headers.indexOf("PO ID");
    const existingIds = new Set();

    if (idIndex === -1) {
      console.warn("poGeneratePOID: 'PO ID' header not found in PurchaseDetails. Generating simple ID.");
      return "PO" + Math.floor(10000 + Math.random() * 90000);
    }

    for (let i = 1; i < data.length; i++) {
      const id = data[i][idIndex];
      if (id && id !== '') {
        existingIds.add(String(id)); // Ensure string for consistency
      }
    }

    let newId;
    do {
      newId = "PO" + Math.floor(10000 + Math.random() * 90000);
    } while (existingIds.has(newId));

    console.log("Generated new PO ID: " + newId);
    return newId;
  } catch (e) {
    console.error("Error in poGeneratePOID: " + e.message + " Stack: " + e.stack);
    throw new Error("Failed to generate PO ID: " + e.message);
  }
}

// Get all purchase orders
function poGetPOs(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return [];
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseOrders");
  const range = ss.getRangeByName("RANGEPO");

  if (!range) {
    console.log("poGetPOs: RANGEPO named range not found. Returning empty array.");
    return []; // Ensure an empty array is returned if range is not found
  }

  try {
    const data = range.getValues();

    // If data is empty or only contains an empty row
    if (!data || data.length === 0 || (data.length === 1 && data[0].every(cell => cell === ''))) {
      return [];
    }

    const headers = data[0];
    // Check if headers are valid
    if (!headers || headers.length === 0 || !headers.includes("PO ID")) {
      console.error("poGetPOs: Headers not found, empty, or missing 'PO ID' in RANGEPO data.");
      return [];
    }

    const pos = [];

    // Helper function to safely get a value by header name
    const getVal = (h, row) => {
      const index = headers.indexOf(h);
      return index !== -1 ? row[index] : null;
    };

    // Start from 1 to skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip completely empty rows or rows without valid PO ID
      const poId = getVal("PO ID", row);
      if (row.every(cell => cell === '' || cell === null || typeof cell === 'undefined') || !poId || poId === '') {
        continue;
      }

      // Retrieve date value
      let dateValue = getVal("Date", row);
      if (dateValue instanceof Date) {
        dateValue = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "MMM/dd/yyyy");
      }


      pos.push({
        date: dateValue,
        id: getVal("PO ID", row),
        supplierId: getVal("Supplier ID", row),
        supplierName: getVal("Supplier Name", row),
        state: getVal("State", row),
        city: getVal("City", row),
        totalAmount: getVal("Total Amount", row)
      });
    }
    return pos;
  } catch (e) {
    // This catch block should prevent null from being returned on unexpected errors
    console.error("CRITICAL ERROR in poGetPOs: " + e.message + " Stack: " + e.stack);
    return []; // Always return an array on error
  }
}

// Get PO details
function poGetPODetails(poId, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return [];
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseDetails");
  const range = ss.getRangeByName("RANGEPD");

  if (!range) {
    console.log("poGetPODetails: RANGEPD named range not found. Returning empty array.");
    return [];
  }

  try {
    const data = range.getValues();
    if (!data || data.length === 0) {
      console.log("poGetPODetails: No data found in RANGEPD.");
      return [];
    }

    const headers = data[0];
    const details = [];

    // Helper to get value by header name
    const getVal = (h, row) => {
      const index = headers.indexOf(h);
      return index !== -1 ? row[index] : null;
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows or those that don’t match the given PO ID
      if (row.every(cell => cell === '' || cell === null || typeof cell === 'undefined') || getVal("PO ID", row) !== poId) {
        continue;
      }

      // Format the date consistently
      let dateVal = getVal("Date", row);
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "MMM/dd/yyyy");
      } else if (typeof dateVal === "string" || typeof dateVal === "number") {
        const parsedDate = new Date(dateVal);
        if (!isNaN(parsedDate)) {
          dateVal = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "MMM/dd/yyyy");
        } else {
          console.warn(`Invalid date for row ${i}:`, dateVal);
        }
      }

      details.push({
        date: dateVal,
        poId: getVal("PO ID", row),
        detailId: getVal("Detail ID", row),
        supplierId: getVal("Supplier ID", row),
        supplierName: getVal("Supplier Name", row),
        state: getVal("State", row),
        city: getVal("City", row),
        itemId: getVal("Kode Barang", row),
        itemName: getVal("Nama Barang", row),
        itemCategory: getVal("Kategori Barang", row),
        qtyPurchased: getVal("Jumlah Barang", row),
        unitType: getVal("Satuan Barang", row),
        totalPrice: getVal("Total Harga", row)
      });
    }

    console.log(`poGetPODetails: Retrieved ${details.length} details for PO ID: ${poId}`);
    return details;
  } catch (e) {
    console.error("Error in poGetPODetails: " + e.message + " Stack: " + e.stack);
    return [];
  }
}


// Save new PO
function poSaveNewPO(items, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Session expired");
  }

  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    console.error("poSaveNewPO: 'items' is not a valid array or is empty. Received:", items);
    throw new Error("No items provided to save.");
  }

  // Validate each item has required fields
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.poId || !item.detailId || !item.itemId || !item.qtyPurchased) {
      console.error(`poSaveNewPO: Item ${i} missing required fields:`, item);
      throw new Error(`Item ${i + 1} is missing required information (PO ID, Detail ID, Item ID, or Quantity).`);
    }
    if (item.qtyPurchased <= 0) {
      console.error(`poSaveNewPO: Item ${i} has invalid values:`, item);
      throw new Error(`Item ${i + 1} has invalid quantity (must be greater than 0).`);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailsSheet = ss.getSheetByName("PurchaseDetails");
  const ordersSheet = ss.getSheetByName("PurchaseOrders");

  // Save to PurchaseDetails
  const detailsRange = ss.getRangeByName("RANGEPD");
  if (!detailsRange) {
    console.error("poSaveNewPO: RANGEPD named range not found.");
    throw new Error("Purchase Details range not found.");
  }

  try {
    const detailsData = detailsRange.getValues();
    const detailsHeaders = detailsData[0];
    
    console.log("poSaveNewPO: detailsHeaders =", detailsHeaders); // DEBUG
    console.log("poSaveNewPO: items =", items); // DEBUG

    // Prepare new rows
    const newRows = items.map(item => {
      const newRow = [];
      detailsHeaders.forEach(header => {
        switch(header) {
          case "Date": newRow.push(item.date); break;
          case "PO ID": newRow.push(item.poId); break;
          case "Detail ID": newRow.push(item.detailId); break;
          case "Supplier ID": newRow.push(item.supplierId); break;
          case "Supplier Name": newRow.push(item.supplierName); break;
          case "State": newRow.push(item.state); break;
          case "City": newRow.push(item.city); break;
          case "Kode Barang": newRow.push(item.itemId); break;
          case "Nama Barang": newRow.push(item.itemName); break;
          case "Kategori Barang": newRow.push(item.itemCategory); break;
          case "Jumlah Barang": newRow.push(item.qtyPurchased); break;
          case "Satuan Barang": newRow.push(item.unitType); break;
          case "Total Harga": newRow.push(item.totalPrice); break;
          default: newRow.push(''); break;
        }
      });
      return newRow;
    });
    
    console.log("poSaveNewPO: newRows =", newRows); // DEBUG

    // Append to sheet
    detailsSheet.getRange(detailsSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    console.log(`poSaveNewPO: Successfully saved ${newRows.length} item details.`);
    
    // Force flush to ensure data is written before recalculation
    SpreadsheetApp.flush();

    // Update related data
    poUpdateTotalPO(items[0].poId);
    // revisetotalinventory(); // REMOVED - Inventory stock is now manually managed
    // poUpdateRemainingQty(); // REMOVED - columns not exist
    // poUpdateReorderRequired(); // REMOVED - columns not exist
    poUpdateTotalPurchases();
    poUpdateBalancePayable();
    console.log("poSaveNewPO: Related data updates triggered.");
  } catch (e) {
    console.error("Error in poSaveNewPO: " + e.message + " Stack: " + e.stack);
    throw new Error("Failed to save new PO: " + e.message);
  }
}

// Update total PO
function poUpdateTotalPO(poId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailsSheet = ss.getSheetByName("PurchaseDetails");
  const ordersSheet  = ss.getSheetByName("PurchaseOrders");
  const detailsRange = ss.getRangeByName("RANGEPD");
  const ordersRange  = ss.getRangeByName("RANGEPO");

  if (!detailsRange || !ordersRange) {
    console.warn("poUpdateTotalPO: Named ranges RANGEPD or RANGEPO not found. Skipping.");
    return;
  }

  // 1) Gather PO Details and compute totalAmount, keep firstRow for meta
  const detailsData    = detailsRange.getValues();
  const detailsHeaders = detailsData[0];
  const poIdIndex      = detailsHeaders.indexOf("PO ID");
  const totalPriceIdx  = detailsHeaders.indexOf("Total Harga");

  let totalAmount = 0;
  let firstRow    = null;

  for (let i = 1; i < detailsData.length; i++) {
    if (detailsData[i][poIdIndex] === poId) {
      totalAmount += Number(detailsData[i][totalPriceIdx]) || 0;
      if (!firstRow) firstRow = detailsData[i];
    }
  }

  if (!firstRow) {
    console.warn(`poUpdateTotalPO: No details found for PO ID ${poId}. Nothing to update.`);
    return;
  }

  // 2) Build the new row array in the exact order of your PurchaseOrders headers
  const ordersData    = ordersRange.getValues();
  const ordersHeaders = ordersData[0];

  const newRow = ordersHeaders.map(header => {
    switch (header) {
      case "Date":               return firstRow[ detailsHeaders.indexOf("Date") ];
      case "PO ID":              return poId;
      case "Supplier ID":        return firstRow[ detailsHeaders.indexOf("Supplier ID") ];
      case "Supplier Name":      return firstRow[ detailsHeaders.indexOf("Supplier Name") ];
      case "State":              return firstRow[ detailsHeaders.indexOf("State") ];
      case "City":               return firstRow[ detailsHeaders.indexOf("City") ];
      case "Total Amount":       return totalAmount;
      default:                   return "";
    }
  });

  // (3) Find existing PO row in ordersData
  const poIdCol  = ordersHeaders.indexOf("PO ID");
  const existing = ordersData.findIndex((r, i) => i > 0 && r[poIdCol] == poId);

  if (existing > 0) {
    // Overwrite in place
    const writeRow    = ordersRange.getRow() + existing;
    const writeCol    = ordersRange.getColumn();
    const writeRange  = ordersSheet.getRange(writeRow, writeCol, 1, newRow.length);
    writeRange.setValues([ newRow ]);
    console.log(`poUpdateTotalPO: Updated existing row ${writeRow} for PO ID ${poId}.`);
  } else {
    // Fallback: append if not found
    ordersSheet.appendRow(newRow);
    console.log(`poUpdateTotalPO: Appended new row for PO ID ${poId}.`);
  }
}


// Update total purchases for suppliers
function poUpdateTotalPurchases() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const suppliersSheet = ss.getSheetByName("Suppliers");
  const detailsSheet = ss.getSheetByName("PurchaseDetails");

  const suppliersRange = ss.getRangeByName("RANGESUPPLIERS");
  const detailsRange = ss.getRangeByName("RANGEPD");

  if (!suppliersRange || !detailsRange) {
    console.warn("poUpdateTotalPurchases: One or more named ranges not found. Skipping update.");
    return;
  }

  try {
    const suppliersData = suppliersRange.getValues();
    const suppliersHeaders = suppliersData[0];
    const detailsData = detailsRange.getValues();
    const detailsHeaders = detailsData[0];

    const supplierIdIndex = suppliersHeaders.indexOf("Supplier ID");
    const totalPurchasesIndex = suppliersHeaders.indexOf("Total Purchases");
    const detailsSupplierIdIndex = detailsHeaders.indexOf("Supplier ID");
    const detailsTotalPriceIndex = detailsHeaders.indexOf("Total Harga");

    // Validate column indices
    if (supplierIdIndex === -1 || detailsSupplierIdIndex === -1 || detailsTotalPriceIndex === -1) {
      console.warn("poUpdateTotalPurchases: Required columns not found. Skipping update.");
      console.warn(`Columns - SupplierID: ${supplierIdIndex}, DetailsSupplierID: ${detailsSupplierIdIndex}, TotalPrice: ${detailsTotalPriceIndex}`);
      return;
    }

    // If Total Purchases column doesn't exist in Suppliers, skip this update
    if (totalPurchasesIndex === -1) {
      console.warn("poUpdateTotalPurchases: 'Total Purchases' column not found in Suppliers sheet. Skipping update.");
      return;
    }

    // Create a map of supplier totals
    const supplierTotals = {};

    for (let i = 1; i < detailsData.length; i++) {
      const supplierId = detailsData[i][detailsSupplierIdIndex];
      const totalPrice = detailsData[i][detailsTotalPriceIndex] || 0;

      if (supplierId) {
        if (!supplierTotals[supplierId]) supplierTotals[supplierId] = 0;
        supplierTotals[supplierId] += totalPrice;
      }
    }

    // Update suppliers - only rows with valid Supplier ID
    for (let i = 1; i < suppliersData.length; i++) {
      const supplierId = suppliersData[i][supplierIdIndex];
      if (!supplierId || supplierId === '') continue; // Skip empty rows
      
      const totalPurchase = supplierTotals[supplierId] || 0;
      suppliersSheet.getRange(suppliersRange.getRow() + i, totalPurchasesIndex + 1).setValue(totalPurchase);
    }
    console.log("poUpdateTotalPurchases: Total purchases for suppliers updated.");
  } catch (e) {
    console.error("Error in poUpdateTotalPurchases: " + e.message + " Stack: " + e.stack);
    throw new Error("Failed to update total purchases: " + e.message);
  }
}

// Update balance payable for suppliers
function poUpdateBalancePayable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const suppliersSheet = ss.getSheetByName("Suppliers");
  const suppliersRange = ss.getRangeByName("RANGESUPPLIERS");

  if (!suppliersRange) {
    console.warn("poUpdateBalancePayable: RANGESUPPLIERS named range not found. Skipping update.");
    return;
  }

  try {
    const suppliersData = suppliersRange.getValues();
    const suppliersHeaders = suppliersData[0];

    const supplierIdIndex = suppliersHeaders.indexOf("Supplier ID");
    const totalPurchasesIndex = suppliersHeaders.indexOf("Total Purchases");
    const totalPaymentsIndex = suppliersHeaders.indexOf("Total Payments");
    const balancePayableIndex = suppliersHeaders.indexOf("Balance Payable");

    // Validate column indices
    if (totalPurchasesIndex === -1 || totalPaymentsIndex === -1 || balancePayableIndex === -1) {
      console.warn("poUpdateBalancePayable: Required columns not found in Suppliers sheet. Skipping update.");
      console.warn(`Columns - TotalPurchases: ${totalPurchasesIndex}, TotalPayments: ${totalPaymentsIndex}, BalancePayable: ${balancePayableIndex}`);
      return;
    }

    for (let i = 1; i < suppliersData.length; i++) {
      // Skip rows without valid Supplier ID
      const supplierId = suppliersData[i][supplierIdIndex];
      if (!supplierId || supplierId === '') continue;
      
      const totalPurchases = suppliersData[i][totalPurchasesIndex] || 0;
      const totalPayments = suppliersData[i][totalPaymentsIndex] || 0;
      const balance = totalPurchases - totalPayments;

      suppliersSheet.getRange(suppliersRange.getRow() + i, balancePayableIndex + 1).setValue(balance);
    }
    console.log("poUpdateBalancePayable: Balance payable for suppliers updated.");
  } catch (e) {
    console.error("Error in poUpdateBalancePayable: " + e.message + " Stack: " + e.stack);
    throw new Error("Failed to update balance payable: " + e.message);
  }
}

function poDeletePODetail(detailId, poId, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return;
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseDetails");
  const range = ss.getRangeByName("RANGEPD");
  const data  = range.getValues();      // data[0] is header row

  // Find the Detail ID column index
  const headers = data[0];
  const idCol   = headers.indexOf("Detail ID");

  // Loop through data rows (i=1 → first data row)
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == detailId) {
      // range.getRow() is the sheet row of the header,
      // so data[i] lives at sheetRow = range.getRow() + i.
      const sheetRow = range.getRow() + i;
      sheet.deleteRow(sheetRow);
      break;
    }
  }

  // recalc
  revisetotalpo();
  // revisetotalinventory(); // REMOVED - Inventory stock is now manually managed
  // poUpdateRemainingQty(); // REMOVED - columns not exist
  // poUpdateReorderRequired(); // REMOVED - columns not exist
  poUpdateTotalPurchases();
  poUpdateBalancePayable();
  
  // Check if this was the last detail for this PO, if yes delete the PO row
  const poRange = ss.getRangeByName("RANGEPO");
  if (poRange) {
    const poData = poRange.getValues();
    const poHeaders = poData[0];
    const poIdColIndex = poHeaders.indexOf("PO ID");
    const poSheet = ss.getSheetByName("PurchaseOrders");
    
    // Check if there are any remaining details for this PO
    const remainingDetails = data.filter((row, idx) => idx > 0 && row[headers.indexOf("PO ID")] === poId);
    
    if (remainingDetails.length === 1) { // Only the deleted row exists (before actual deletion)
      // Find and delete the PO row
      for (let p = 1; p < poData.length; p++) {
        if (poData[p][poIdColIndex] == poId) {
          const poSheetRow = poRange.getRow() + p;
          poSheet.deleteRow(poSheetRow);
          console.log(`poDeletePODetail: Deleted PO row for ${poId} as it has no more details`);
          break;
        }
      }
    }
  }
  
  // Clear any leftover values in empty rows within named ranges
  clearEmptyRowsInNamedRange("RANGEPO");
  clearEmptyRowsInNamedRange("RANGESUPPLIERS");
}

// Edit PO Detail
function poEditPODetail(detailId, updatedData, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Session expired" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseDetails");
  const range = ss.getRangeByName("RANGEPD");
  const data = range.getValues();
  const headers = data[0];

  // Find column indices
  const idCol = headers.indexOf("Detail ID");
  const itemIdCol = headers.indexOf("Kode Barang") !== -1 ? headers.indexOf("Kode Barang") : headers.indexOf("Item ID");
  const itemNameCol = headers.indexOf("Nama Barang") !== -1 ? headers.indexOf("Nama Barang") : headers.indexOf("Item Name");
  const itemCategoryCol = headers.indexOf("Kategori Barang") !== -1 ? headers.indexOf("Kategori Barang") : headers.indexOf("Item Category");
  const qtyCol = headers.indexOf("Jumlah Barang") !== -1 ? headers.indexOf("Jumlah Barang") : headers.indexOf("QTY Purchased");
  const unitTypeCol = headers.indexOf("Satuan Barang") !== -1 ? headers.indexOf("Satuan Barang") : headers.indexOf("Unit Type");
  const totalPriceCol = headers.indexOf("Total Harga");

  // Find row with matching Detail ID
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == detailId) {
      const sheetRow = range.getRow() + i;
      
      // Update fields
      if (itemIdCol !== -1 && updatedData.itemId !== undefined) {
        sheet.getRange(sheetRow, itemIdCol + 1).setValue(updatedData.itemId);
      }
      if (itemNameCol !== -1 && updatedData.itemName !== undefined) {
        sheet.getRange(sheetRow, itemNameCol + 1).setValue(updatedData.itemName);
      }
      if (itemCategoryCol !== -1 && updatedData.itemCategory !== undefined) {
        sheet.getRange(sheetRow, itemCategoryCol + 1).setValue(updatedData.itemCategory);
      }
      if (qtyCol !== -1 && updatedData.qty !== undefined) {
        sheet.getRange(sheetRow, qtyCol + 1).setValue(updatedData.qty);
      }
      if (unitTypeCol !== -1 && updatedData.unitType !== undefined) {
        sheet.getRange(sheetRow, unitTypeCol + 1).setValue(updatedData.unitType);
      }
      
      break;
    }
  }

  // Recalculate totals
  revisetotalpo();
  // revisetotalinventory(); // REMOVED - Inventory stock is now manually managed
  // poUpdateRemainingQty(); // REMOVED - columns not exist
  // poUpdateReorderRequired(); // REMOVED - columns not exist
  poUpdateTotalPurchases();
  poUpdateBalancePayable();
  
  return { success: true, message: "Detail updated successfully" };
}

/**
 * Save all edited detail rows, then recalc in order.
 */
function poSavePODetails(updates, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Session expired" };
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PurchaseDetails");
  const range = ss.getRangeByName("RANGEPD");
  const data  = range.getValues();
  const hdr   = data[0];

  // helper to find column index by name with dual language support
  const ci = name => {
    let idx = hdr.indexOf(name);
    if (idx !== -1) return idx;
    
    // Fallback to Indonesian names
    const nameMap = {
      "Item ID": "Kode Barang",
      "Item Name": "Nama Barang",
      "QTY Purchased": "Jumlah Barang",
      "Unit Type": "Satuan Barang"
    };
    
    if (nameMap[name]) {
      idx = hdr.indexOf(nameMap[name]);
    }
    return idx;
  };

  updates.forEach(u => {
    // find the row in RANGEPD by Detail ID
    const rowIdx = data.findIndex((r,i) => i>0 && r[ci("Detail ID")] == u.detailId);
    if (rowIdx < 1) throw new Error("Detail ID not found: " + u.detailId);
    const sheetRow = range.getRow() + rowIdx;

    // write back editable fields
    sheet.getRange(sheetRow, range.getColumn() + ci("Kode Barang") ).setValue(u.itemId);
    sheet.getRange(sheetRow, range.getColumn() + ci("Nama Barang") ).setValue(u.itemName);
    sheet.getRange(sheetRow, range.getColumn() + ci("Jumlah Barang")).setValue(u.qtyPurchased);
    sheet.getRange(sheetRow, range.getColumn() + ci("Satuan Barang") ).setValue(u.unitType);
    sheet.getRange(sheetRow, range.getColumn() + ci("Total Harga")).setValue(u.totalPrice);
  });

  // then recalc
  revisetotalpo();
  poUpdateTotalPurchases();
  poUpdateBalancePayable();
  
  return { success: true, message: "PO details updated successfully" };
}

/**
 * Loop through every PO in PurchaseOrders and SUMIF from PurchaseDetails.
 */
function revisetotalpo() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const pdRng   = ss.getRangeByName("RANGEPD");
  const poRng   = ss.getRangeByName("RANGEPO");
  const pdVals  = pdRng.getValues();
  const poVals  = poRng.getValues();
  const pdHdr   = pdVals[0];
  const poHdr   = poVals[0];
  const pdPoCol = pdHdr.indexOf("PO ID");
  const pdTotCol= pdHdr.indexOf("Total Harga");
  const poPoCol = poHdr.indexOf("PO ID");
  const poTotCol= poHdr.indexOf("Total Amount");
  const ssheet  = ss.getSheetByName(poRng.getSheet().getName());

  // build sum map
  const sums = {};
  for(let i=1;i<pdVals.length;i++){
    const id = pdVals[i][pdPoCol];
    if (!id || id === '') continue; // Skip empty rows
    const val= Number(pdVals[i][pdTotCol])||0;
    sums[id]=(sums[id]||0)+val;
  }

  // write back per PO - only for rows with valid PO ID
  for(let r=1;r<poVals.length;r++){
    const id = poVals[r][poPoCol];
    if (!id || id === '') continue; // Skip empty rows
    const newSum  = sums[id]||0;
    const rowNum  = poRng.getRow()+r;
    const colNum  = poRng.getColumn()+poTotCol;
    ssheet.getRange(rowNum,colNum).setValue(newSum);
  }
}


function revisetotalinventory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get named ranges
  const inventoryRange = ss.getRangeByName("RANGEINVENTORYITEMS");
  const purchaseRange = ss.getRangeByName("RANGEPD");

  const inventoryData = inventoryRange.getValues();
  const purchaseData = purchaseRange.getValues();

  console.log("revisetotalinventory: Total rows in PurchaseDetails =", purchaseData.length);

  // Get headers
  const inventoryHeaders = inventoryData[0];
  const purchaseHeaders = purchaseData[0];

  console.log("revisetotalinventory: inventoryHeaders =", inventoryHeaders);
  console.log("revisetotalinventory: purchaseHeaders =", purchaseHeaders);

  // Find column indexes - InventoryItems uses Indonesian names
  const invItemIdIndex = inventoryHeaders.indexOf("Kode Barang") !== -1
    ? inventoryHeaders.indexOf("Kode Barang")
    : inventoryHeaders.indexOf("Item ID");
  const invQtyPurchasedIndex = inventoryHeaders.indexOf("Jumlah Barang") !== -1
    ? inventoryHeaders.indexOf("Jumlah Barang")
    : inventoryHeaders.indexOf("QTY Purchased");
  const invUnitCostIndex = inventoryHeaders.indexOf("Harga Satuan") !== -1
    ? inventoryHeaders.indexOf("Harga Satuan")
    : inventoryHeaders.indexOf("Unit Cost");
  const invTotalPriceIndex = inventoryHeaders.indexOf("Total Harga") !== -1
    ? inventoryHeaders.indexOf("Total Harga")
    : inventoryHeaders.indexOf("Total Price");

  const pdItemIdIndex = purchaseHeaders.indexOf("Kode Barang") !== -1 
    ? purchaseHeaders.indexOf("Kode Barang")
    : purchaseHeaders.indexOf("Item ID");
  const pdQtyIndex = purchaseHeaders.indexOf("Jumlah Barang") !== -1
    ? purchaseHeaders.indexOf("Jumlah Barang")
    : purchaseHeaders.indexOf("QTY Purchased");

  console.log("revisetotalinventory: invItemIdIndex =", invItemIdIndex);
  console.log("revisetotalinventory: invQtyPurchasedIndex =", invQtyPurchasedIndex);
  console.log("revisetotalinventory: invUnitCostIndex =", invUnitCostIndex);
  console.log("revisetotalinventory: invTotalPriceIndex =", invTotalPriceIndex);
  console.log("revisetotalinventory: pdItemIdIndex =", pdItemIdIndex);
  console.log("revisetotalinventory: pdQtyIndex =", pdQtyIndex);

  if (invItemIdIndex === -1 || invQtyPurchasedIndex === -1 ||
      pdItemIdIndex === -1 || pdQtyIndex === -1) {
    const errorMsg = `Missing columns - Inventory: ItemID=${invItemIdIndex}, QtyPurchased=${invQtyPurchasedIndex}, Purchase: ItemID=${pdItemIdIndex}, Qty=${pdQtyIndex}`;
    console.error("revisetotalinventory: " + errorMsg);
    throw new Error("One or more required columns not found. " + errorMsg);
  }

  // Create a map of Item ID to total QTY Purchased from PurchaseDetails
  const qtyMap = {};
  for (let i = 1; i < purchaseData.length; i++) {
    const itemId = purchaseData[i][pdItemIdIndex];
    const qty = Number(purchaseData[i][pdQtyIndex]) || 0;
    
    // Skip rows without valid Item ID (but allow qty=0 for valid items)
    if (!itemId || itemId === '') {
      console.log(`revisetotalinventory: Skipping row ${i} - no itemId`);
      continue;
    }
    
    qtyMap[itemId] = (qtyMap[itemId] || 0) + qty;
    console.log(`revisetotalinventory: Item ${itemId} - adding qty ${qty}, total now = ${qtyMap[itemId]}`);
  }
  
  console.log("revisetotalinventory: Final qtyMap =", JSON.stringify(qtyMap));

  // Update QTY Purchased and Total Harga in InventoryItems sheet
  const inventorySheet = ss.getSheetByName("InventoryItems");
  for (let j = 1; j < inventoryData.length; j++) {
    const itemId = inventoryData[j][invItemIdIndex];
    
    // Skip rows without valid Item ID
    if (!itemId || itemId === '') {
      console.log(`revisetotalinventory: Skipping inventory row ${j} - no itemId`);
      continue;
    }
    
    const oldQty = inventoryData[j][invQtyPurchasedIndex];
    const qty = qtyMap[itemId] || 0;
    inventoryData[j][invQtyPurchasedIndex] = qty;
    
    console.log(`revisetotalinventory: Updating ${itemId} - old qty=${oldQty}, new qty=${qty}`);
    
    // Calculate Total Harga = Jumlah Barang × Harga Satuan
    if (invUnitCostIndex !== -1 && invTotalPriceIndex !== -1) {
      const unitCost = Number(inventoryData[j][invUnitCostIndex]) || 0;
      const totalPrice = qty * unitCost;
      inventoryData[j][invTotalPriceIndex] = totalPrice;
      console.log(`revisetotalinventory: ${itemId} - unitCost=${unitCost}, totalPrice=${totalPrice}`);
    }
  }

  // Write updated data back to sheet
  inventoryRange.setValues(inventoryData);
  console.log("revisetotalinventory: Successfully updated inventory");
}

/**
 * Delete empty rows within a named range to prevent spam 0.00 values
 * This version actually deletes rows instead of just clearing content
 */
function clearEmptyRowsInNamedRange(namedRangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName(namedRangeName);
  
  if (!range) {
    console.warn(`clearEmptyRowsInNamedRange: Named range ${namedRangeName} not found.`);
    return;
  }
  
  const data = range.getValues();
  const sheet = range.getSheet();
  const headers = data[0];
  
  // Collect row numbers to delete (in reverse order to avoid index shifting)
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0]; // First column is usually the ID
    
    // If no ID, mark for deletion
    if (!id || id === '') {
      const rowNum = range.getRow() + i;
      rowsToDelete.push(rowNum);
    }
  }
  
  // Delete rows in reverse order (from bottom to top) to avoid index shifting
  if (rowsToDelete.length > 0) {
    console.log(`clearEmptyRowsInNamedRange: Found ${rowsToDelete.length} empty rows in ${namedRangeName}`);
    
    for (let r = rowsToDelete.length - 1; r >= 0; r--) {
      try {
        sheet.deleteRow(rowsToDelete[r]);
        console.log(`clearEmptyRowsInNamedRange: Deleted row ${rowsToDelete[r]} in ${namedRangeName}`);
      } catch (e) {
        // If delete fails (e.g., frozen rows), just clear content
        console.warn(`clearEmptyRowsInNamedRange: Cannot delete row ${rowsToDelete[r]}, clearing content instead: ${e.message}`);
        const clearRange = sheet.getRange(rowsToDelete[r], range.getColumn(), 1, range.getNumColumns());
        clearRange.clearContent();
      }
    }
  }
}

/**
 * Delete entire PO including all its details
 * @param {string} poId - The PO ID to delete
 */
function poDeleteEntirePO(poId, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Delete all PO details first
  const detailsRange = ss.getRangeByName("RANGEPD");
  const detailsSheet = ss.getSheetByName("PurchaseDetails");
  const detailsData = detailsRange.getValues();
  const detailsHeaders = detailsData[0];
  const pdPoIdIndex = detailsHeaders.indexOf("PO ID");
  
  // Collect row numbers to delete (in reverse order)
  const detailRowsToDelete = [];
  for (let i = 1; i < detailsData.length; i++) {
    if (detailsData[i][pdPoIdIndex] == poId) {
      detailRowsToDelete.push(detailsRange.getRow() + i);
    }
  }
  
  // Delete detail rows from bottom to top
  for (let r = detailRowsToDelete.length - 1; r >= 0; r--) {
    detailsSheet.deleteRow(detailRowsToDelete[r]);
  }
  
  console.log(`poDeleteEntirePO: Deleted ${detailRowsToDelete.length} detail rows for PO ${poId}`);
  
  // 2. Delete the PO row
  const poRange = ss.getRangeByName("RANGEPO");
  const poSheet = ss.getSheetByName("PurchaseOrders");
  const poData = poRange.getValues();
  const poHeaders = poData[0];
  const poIdIndex = poHeaders.indexOf("PO ID");
  
  for (let p = 1; p < poData.length; p++) {
    if (poData[p][poIdIndex] == poId) {
      const poSheetRow = poRange.getRow() + p;
      poSheet.deleteRow(poSheetRow);
      console.log(`poDeleteEntirePO: Deleted PO row for ${poId}`);
      break;
    }
  }
  
  // 3. Recalculate all totals
  revisetotalpo();
  poUpdateTotalPurchases();
  poUpdateBalancePayable();
  
  // 4. Clean up any remaining empty rows
  clearEmptyRowsInNamedRange("RANGEPO");
  clearEmptyRowsInNamedRange("RANGESUPPLIERS");
  
  console.log(`poDeleteEntirePO: Successfully deleted PO ${poId}`);
}