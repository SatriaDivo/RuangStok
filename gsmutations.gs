/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from StockMovements sheet
 * Pattern: Same as gssuppliers.gs, gscustomers.gs, gsinventory.gs
 */

/**
 * Get all stock mutations from StockMovements sheet
 * Pattern same as supGetSuppliers, itemGetInventoryItems
 * @param {string} email - User email for session check
 */
function mutGetMutations(email) {
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
    let sheet = ss.getSheetByName("StockMovements");
    
    // Create sheet if doesn't exist
    if (!sheet) {
      Logger.log("Sheet 'StockMovements' tidak ada, membuat baru...");
      sheet = ss.insertSheet("StockMovements");
      const headers = ["Date", "Item ID", "Item Name", "Type", "Qty", "Reference", "Notes", "User", "Keterangan"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      return {
        success: true,
        message: "Sheet 'StockMovements' baru dibuat",
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
      };
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log("StockMovements sheet - lastRow: " + lastRow + ", lastCol: " + lastCol);
    
    // If empty or only header
    if (lastRow <= 1) {
      Logger.log("Sheet kosong atau hanya header");
      // Ensure header exists
      if (lastRow === 0) {
        const headers = ["Date", "Item ID", "Item Name", "Type", "Qty", "Reference", "Notes", "User", "Keterangan"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      return {
        success: true,
        message: "Belum ada data mutasi",
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
      };
    }
    
    // Read all data
    const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 9)).getValues();
    const headers = data[0];
    
    Logger.log('Mutation headers: ' + JSON.stringify(headers));
    Logger.log('Total rows: ' + data.length);
    
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
    let totalIn = 0;
    let totalOut = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[dateIndex] && !row[itemIdIndex]) {
        continue;
      }
      
      const type = String(row[typeIndex] || '');
      const qty = Number(row[qtyIndex]) || 0;
      
      // Calculate totals
      if (type === 'IN') {
        totalIn += qty;
      } else if (type === 'OUT') {
        totalOut += qty;
      }
      
      const mutation = {
        date: row[dateIndex],
        itemId: String(row[itemIdIndex] || ''),
        itemName: String(row[itemNameIndex] || ''),
        type: type,
        qty: qty,
        reference: String(row[referenceIndex] || ''),
        notes: String(row[notesIndex] || ''),
        user: String(row[userIndex] || ''),
        keterangan: String(row[keteranganIndex] || '')
      };
      
      mutations.push(mutation);
    }
    
    Logger.log('Total mutations found: ' + mutations.length);
    
    // Sort by date desc (newest first)
    mutations.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    return {
      success: true,
      message: "Data berhasil dimuat",
      data: mutations,
      summary: {
        totalIn: totalIn,
        totalOut: totalOut,
        netChange: totalIn - totalOut,
        totalTransactions: mutations.length
      }
    };
    
  } catch (error) {
    Logger.log('Error in mutGetMutations: ' + error.message);
    return {
      success: false,
      message: "Gagal memuat data: " + error.message,
      data: [],
      summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
    };
  }
}

/**
 * Get filtered mutations
 * @param {string} email - User email
 * @param {Object} filter - {startDate, endDate, itemId, type}
 */
function mutGetFilteredMutations(email, filter) {
  // Get all mutations first
  const result = mutGetMutations(email);
  
  if (!result.success || !result.data || result.data.length === 0) {
    return result;
  }
  
  let mutations = result.data;
  
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
  
  // Recalculate summary for filtered data
  let totalIn = 0;
  let totalOut = 0;
  
  mutations.forEach(m => {
    if (m.type === 'IN') {
      totalIn += m.qty;
    } else if (m.type === 'OUT') {
      totalOut += m.qty;
    }
  });
  
  return {
    success: true,
    message: "Data berhasil dimuat",
    data: mutations,
    summary: {
      totalIn: totalIn,
      totalOut: totalOut,
      netChange: totalIn - totalOut,
      totalTransactions: mutations.length
    }
  };
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
