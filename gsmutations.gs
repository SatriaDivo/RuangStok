/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from StockMovements sheet
 * Pattern: Same as itemGetInventoryItems - returns ARRAY directly
 */

/**
 * Get all stock mutations from StockMovements sheet
 * Returns ARRAY directly like itemGetInventoryItems
 * @param {string} email - User email for session check
 */
function mutGetMutations(email) {
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("StockMovements");
    
    if (!sheet) {
      sheet = ss.insertSheet("StockMovements");
      const headers = ["Date", "Item ID", "Item Name", "Type", "Qty", "Reference", "Notes", "User", "Keterangan"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      return [];
    }
    
    const lastRow = sheet.getLastRow();
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
    const keteranganIndex = headers.indexOf("Keterangan");
    
    const mutations = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (!row[dateIndex] && !row[itemIdIndex]) {
        continue;
      }
      
      mutations.push({
        date: row[dateIndex],
        itemId: String(row[itemIdIndex] || ''),
        itemName: String(row[itemNameIndex] || ''),
        type: String(row[typeIndex] || ''),
        qty: Number(row[qtyIndex]) || 0,
        reference: String(row[referenceIndex] || ''),
        notes: String(row[notesIndex] || ''),
        user: String(row[userIndex] || ''),
        keterangan: String(row[keteranganIndex] || '')
      });
    }
    
    mutations.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
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
function mutGetFilteredMutations(email, filter) {
  let mutations = mutGetMutations(email);
  
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
