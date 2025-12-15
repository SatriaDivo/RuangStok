/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from StockMovements sheet
 * Pattern: Same as itemGetInventoryItems - returns ARRAY directly
 */

/**
 * Get all stock mutations - NEW NAME to avoid caching issues
 * @param {string} email - User email for session check
 */
function mutLoadAllData(email) {
  Logger.log('mutLoadAllData called with email: ' + email);
  
  const session = checkServerSession(email);
  if (!session.active) {
    Logger.log('Session not active');
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('Got spreadsheet');
    
    let sheet = ss.getSheetByName("StockMovements");
    Logger.log('Sheet found: ' + (sheet ? 'YES' : 'NO'));
    
    if (!sheet) {
      sheet = ss.insertSheet("StockMovements");
      const headers = ["Date", "Item ID", "Item Name", "Type", "Qty", "Reference", "Notes", "User"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log('Created new sheet, returning empty array');
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    Logger.log('Last row: ' + lastRow);
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      return [];
    }
    
    const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 9)).getValues();
    const headers = data[0];
    
    const dateIndex = headers.indexOf("Date");
    const itemIdIndex = headers.indexOf("Item ID");
    const itemNameIndex = headers.indexOf("Item Name");
    const typeIndex = headers.indexOf("Type");
    const qtyIndex = headers.indexOf("Qty");
    const referenceIndex = headers.indexOf("Reference");
    const notesIndex = headers.indexOf("Notes");
    const userIndex = headers.indexOf("User");
    
    const mutations = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (!row[dateIndex] && !row[itemIdIndex]) {
        continue;
      }
      
      // Convert date to ISO string for proper serialization
      let dateValue = row[dateIndex];
      if (dateValue instanceof Date) {
        dateValue = dateValue.toISOString();
      } else if (dateValue) {
        dateValue = String(dateValue);
      } else {
        dateValue = '';
      }
      
      mutations.push({
        date: dateValue,
        itemId: String(row[itemIdIndex] || ''),
        itemName: String(row[itemNameIndex] || ''),
        type: String(row[typeIndex] || ''),
        qty: Number(row[qtyIndex]) || 0,
        reference: String(row[referenceIndex] || ''),
        notes: String(row[notesIndex] || ''),
        user: String(row[userIndex] || '')
      });
    }
    
    mutations.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    Logger.log('Returning ' + mutations.length + ' mutations');
    return mutations;
    
  } catch (error) {
    Logger.log('Error in mutGetMutations: ' + error.message);
    return [];
  }
}

/**
 * Get filtered mutations - returns ARRAY
 * @param {string} email - User email
 * @param {Object} filter - {startDate, endDate, itemId, type}
 */
function mutLoadFilteredData(email, filter) {
  let mutations = mutLoadAllData(email);
  
  if (mutations && mutations.sessionExpired) {
    return mutations;
  }
  
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return mutations;
  }
  
  if (filter) {
    if (filter.itemId) {
      const searchTerm = filter.itemId.toLowerCase();
      mutations = mutations.filter(m => 
        m.itemId.toLowerCase().includes(searchTerm) || 
        m.itemName.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filter.type && filter.type !== 'ALL') {
      mutations = mutations.filter(m => m.type === filter.type);
    }
    
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      mutations = mutations.filter(m => new Date(m.date) >= startDate);
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      mutations = mutations.filter(m => new Date(m.date) <= endDate);
    }
  }
  
  return mutations;
}

/**
 * Test function - run this from Apps Script Editor to test
 */
function testMutLoadAllData() {
  const email = 'stockruang@gmail.com'; // Your email
  const result = mutLoadAllData(email);
  Logger.log('Test result:');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * ============================================================================
 * MIGRATION FUNCTIONS - Run from Apps Script Editor
 * ============================================================================
 */

/**
 * Migrate existing sales data to StockMovements
 * Run this function from Apps Script Editor (Run > migrateSalesDataToStockMovements)
 */
function migrateSalesDataToStockMovements() {
  Logger.log('=== Starting Sales Data Migration ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get SalesDetails sheet
    const salesDetailsSheet = ss.getSheetByName('SalesDetails');
    if (!salesDetailsSheet) {
      Logger.log('ERROR: Sheet SalesDetails tidak ditemukan');
      return { success: false, message: 'Sheet SalesDetails tidak ditemukan' };
    }
    
    // Get or create StockMovements sheet
    let stockSheet = ss.getSheetByName('StockMovements');
    if (!stockSheet) {
      stockSheet = ss.insertSheet('StockMovements');
      const headers = ['Date', 'Item ID', 'Item Name', 'Type', 'Qty', 'Reference', 'Notes', 'User'];
      stockSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log('Created StockMovements sheet');
    }
    
    // Get sales data
    const salesData = salesDetailsSheet.getDataRange().getValues();
    const salesHeaders = salesData[0];
    Logger.log('Sales headers: ' + JSON.stringify(salesHeaders));
    
    // Find column indexes
    const dateIndex = salesHeaders.findIndex(h => h.toString().toLowerCase().includes('date') || h.toString().toLowerCase().includes('tanggal'));
    const itemIdIndex = salesHeaders.findIndex(h => h.toString().toLowerCase().includes('item id') || h.toString().toLowerCase().includes('kode'));
    const itemNameIndex = salesHeaders.findIndex(h => h.toString().toLowerCase().includes('name') || h.toString().toLowerCase().includes('nama'));
    const qtyIndex = salesHeaders.findIndex(h => h.toString().toLowerCase().includes('qty') || h.toString().toLowerCase().includes('jumlah') || h.toString().toLowerCase().includes('quantity'));
    const orderIdIndex = salesHeaders.findIndex(h => h.toString().toLowerCase().includes('order') || h.toString().toLowerCase().includes('so'));
    
    Logger.log('Indexes - Date: ' + dateIndex + ', ItemID: ' + itemIdIndex + ', Name: ' + itemNameIndex + ', Qty: ' + qtyIndex + ', OrderID: ' + orderIdIndex);
    
    // Get existing stock movements to avoid duplicates
    const existingData = stockSheet.getDataRange().getValues();
    const existingRefs = new Set();
    for (let i = 1; i < existingData.length; i++) {
      const ref = existingData[i][5]; // Reference column
      if (ref) existingRefs.add(ref.toString());
    }
    Logger.log('Existing references count: ' + existingRefs.size);
    
    // Migrate data
    let migratedCount = 0;
    let skippedCount = 0;
    const newRows = [];
    
    for (let i = 1; i < salesData.length; i++) {
      const row = salesData[i];
      
      // Skip empty rows
      if (!row[itemIdIndex]) continue;
      
      const orderId = orderIdIndex >= 0 ? row[orderIdIndex] : 'SO' + i;
      
      // Skip if already migrated
      if (existingRefs.has(orderId.toString())) {
        skippedCount++;
        continue;
      }
      
      const date = dateIndex >= 0 ? row[dateIndex] : new Date();
      const itemId = row[itemIdIndex];
      const itemName = itemNameIndex >= 0 ? row[itemNameIndex] : itemId;
      const qty = qtyIndex >= 0 ? Number(row[qtyIndex]) || 0 : 0;
      
      if (qty <= 0) continue;
      
      newRows.push([
        date,                           // Date
        itemId,                         // Item ID
        itemName,                       // Item Name
        'OUT',                          // Type (sales = stock out)
        qty,                            // Qty
        orderId,                        // Reference
        '[MIGRATED] Penjualan',         // Notes
        'SYSTEM-MIGRATION'              // User
      ]);
      
      migratedCount++;
    }
    
    // Write new rows
    if (newRows.length > 0) {
      const lastRow = stockSheet.getLastRow();
      stockSheet.getRange(lastRow + 1, 1, newRows.length, 8).setValues(newRows);
    }
    
    Logger.log('=== Migration Complete ===');
    Logger.log('Migrated: ' + migratedCount + ' records');
    Logger.log('Skipped (already exists): ' + skippedCount + ' records');
    
    return { 
      success: true, 
      message: 'Migration berhasil', 
      migratedCount: migratedCount,
      skippedCount: skippedCount
    };
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    return { success: false, message: error.toString() };
  }
}

/**
 * Clear all stock movements data (use with caution!)
 * Run this function from Apps Script Editor
 */
function clearAllStockMovements() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Konfirmasi Hapus',
    'Apakah Anda yakin ingin menghapus SEMUA data di StockMovements?\n\nTindakan ini tidak dapat dibatalkan!',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    Logger.log('Operation cancelled by user');
    return { success: false, message: 'Dibatalkan oleh user' };
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stockSheet = ss.getSheetByName('StockMovements');
    
    if (!stockSheet) {
      Logger.log('Sheet StockMovements tidak ditemukan');
      return { success: false, message: 'Sheet tidak ditemukan' };
    }
    
    const lastRow = stockSheet.getLastRow();
    if (lastRow > 1) {
      stockSheet.deleteRows(2, lastRow - 1);
      Logger.log('Deleted ' + (lastRow - 1) + ' rows');
    }
    
    return { success: true, message: 'Berhasil menghapus ' + (lastRow - 1) + ' baris data' };
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    return { success: false, message: error.toString() };
  }
}
