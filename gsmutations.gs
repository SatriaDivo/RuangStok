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
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("StockMovements");
    
    // Create sheet if doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet("StockMovements");
      const headers = ["Date", "Item ID", "Item Name", "Type", "Qty", "Reference", "Notes", "User", "Keterangan"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      return []; // Return empty array
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    // If empty or only header
    if (lastRow <= 1) {
      return []; // Return empty array
    }
    
    // Read all data
    const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 9)).getValues();
    const headers = data[0];
    
    // Get column indices
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
      
      // Skip empty rows
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
    
    // Sort by date desc (newest first)
    mutations.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    return mutations; // Return ARRAY directly!
    
  } catch (error) {
    Logger.log('Error in mutGetMutations: ' + error.message);
    return []; // Return empty array on error
  }
}

/**
 * Get filtered mutations - returns ARRAY
 * @param {string} email - User email
 * @param {Object} filter - {startDate, endDate, itemId, type}
 */
function mutGetFilteredMutations(email, filter) {
  // Get all mutations first (returns array)
  let mutations = mutGetMutations(email);
  
  // If session expired, return the error object
  if (mutations && mutations.sessionExpired) {
    return mutations;
  }
  
  // If empty array or not array, return as is
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return mutations;
  }
  
  // Apply filters
  if (filter) {
    // Filter by item ID
    if (filter.itemId) {
      mutations = mutations.filter(m => m.itemId === filter.itemId);
    }
    
    // Filter by type
    if (filter.type && filter.type !== 'ALL') {
      mutations = mutations.filter(m => m.type === filter.type);
    }
    
    // Filter by start date
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      mutations = mutations.filter(m => new Date(m.date) >= startDate);
    }
    
    // Filter by end date
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      mutations = mutations.filter(m => new Date(m.date) <= endDate);
    }
  }
  
  return mutations; // Return ARRAY
}

/**
 * Get inventory items for dropdown filter
 * @param {string} email - User email for session check
 */
function mutGetInventoryItems(email) {
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const invSheet = ss.getSheetByName('InventoryItems');
    
    if (!invSheet) {
      return { success: true, data: [] };
    }
    
    const lastRow = invSheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }
    
    const data = invSheet.getRange(1, 1, lastRow, invSheet.getLastColumn()).getValues();
    const headers = data[0];
    
    const idIndex = headers.indexOf('Item ID');
    const nameIndex = headers.indexOf('Item Name') !== -1 ? headers.indexOf('Item Name') : headers.indexOf('Nama Barang');
    
    const items = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[idIndex]) {
        items.push({
          id: String(row[idIndex]),
          name: String(row[nameIndex] || '')
        });
      }
    }
    
    return { success: true, data: items };
    
  } catch (error) {
    Logger.log('Error in mutGetInventoryItems: ' + error.message);
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * Generate Mutation Report for Reports page
 * @param {string} email - User email for session check
 * @param {Object} filter - Filter options
 */
function generateMutationReport(email, filter) {
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const result = filter ? mutGetFilteredMutations(email, filter) : mutGetMutations(email);
    
    if (!result.success) {
      return { error: true, message: result.message };
    }
    
    // Group mutations by item for top items
    const itemInCounts = {};
    const itemOutCounts = {};
    
    result.data.forEach(m => {
      if (m.type === 'IN') {
        if (!itemInCounts[m.itemId]) {
          itemInCounts[m.itemId] = { itemId: m.itemId, itemName: m.itemName, totalQty: 0 };
        }
        itemInCounts[m.itemId].totalQty += m.qty;
      } else {
        if (!itemOutCounts[m.itemId]) {
          itemOutCounts[m.itemId] = { itemId: m.itemId, itemName: m.itemName, totalQty: 0 };
        }
        itemOutCounts[m.itemId].totalQty += m.qty;
      }
    });
    
    // Get top 5 items with most IN
    const topInItems = Object.values(itemInCounts)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
    
    // Get top 5 items with most OUT
    const topOutItems = Object.values(itemOutCounts)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
    
    // Format mutations for display
    const mutations = result.data.map(m => ({
      date: m.date,
      itemId: m.itemId,
      itemName: m.itemName,
      type: m.type,
      qty: m.qty,
      reference: m.reference || '',
      description: m.type === 'IN' 
        ? 'Penerimaan barang'
        : 'Penjualan barang'
    }));
    
    return {
      error: false,
      summary: {
        totalIn: result.summary.totalIn,
        totalOut: result.summary.totalOut,
        totalTransactions: result.summary.totalTransactions,
        filterStartDate: filter && filter.startDate ? filter.startDate : null,
        filterEndDate: filter && filter.endDate ? filter.endDate : null
      },
      topInItems: topInItems,
      topOutItems: topOutItems,
      mutations: mutations
    };
    
  } catch (error) {
    Logger.log('Error in generateMutationReport: ' + error.message);
    return { error: true, message: error.message };
  }
}

/**
 * Test function for debugging
 */
function testMutGetMutations() {
  const result = mutGetMutations('stockruang@gmail.com');
  Logger.log('Result: ' + JSON.stringify(result));
  return result;
}
