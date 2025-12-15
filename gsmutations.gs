/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from StockMovements log
 * This is a wrapper that calls the new Stock Movements system
 */

/**
 * Simple test function to debug
 */
function testMutations() {
  var result = mutGetAllMutations('stockruang@gmail.com', {});
  Logger.log('Result: ' + JSON.stringify(result));
  return result;
}

/**
 * Get all stock mutations from StockMovements sheet
 * @param {string} email - User email for session check
 * @param {Object} filter - Optional filter {startDate, endDate, itemId, type}
 */
function mutGetAllMutations(email, filter) {
  // Session check - SIMPLE like other features
  const session = checkServerSession(email, false);
  if (!session || !session.active) {
    return { 
      success: false, 
      message: "Sesi berakhir", 
      sessionExpired: true,
      data: [],
      summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
    };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('StockMovements');
    
    if (!sheet) {
      return {
        success: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 },
        message: 'Sheet StockMovements belum ada'
      };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        success: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 },
        message: 'Belum ada data mutasi'
      };
    }
    
    // Read all data - SIMPLE like soGetRangeDataAsObjects
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 9); // Start from row 2, 9 columns
    const values = dataRange.getValues();
    
    var movements = [];
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      
      // Skip empty rows
      if (!row[1]) continue;
      
      var movement = {
        date: row[0],
        itemId: String(row[1]),
        itemName: String(row[2]),
        type: String(row[3]),
        qty: Number(row[4]),
        reference: String(row[5] || ''),
        notes: String(row[6] || ''),
        user: String(row[7] || ''),
        keterangan: String(row[8] || '')
      };
      
      movements.push(movement);
    }
    
    // Apply filters - SIMPLE
    if (filter) {
      if (filter.itemId) {
        var temp1 = [];
        for (var j = 0; j < movements.length; j++) {
          if (movements[j].itemId === filter.itemId) {
            temp1.push(movements[j]);
          }
        }
        movements = temp1;
      }
      
      if (filter.type && filter.type !== 'ALL') {
        var temp2 = [];
        for (var k = 0; k < movements.length; k++) {
          if (movements[k].type === filter.type) {
            temp2.push(movements[k]);
          }
        }
        movements = temp2;
      }
      
      if (filter.startDate) {
        var startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        var temp3 = [];
        for (var l = 0; l < movements.length; l++) {
          var mDate = new Date(movements[l].date);
          if (mDate >= startDate) {
            temp3.push(movements[l]);
          }
        }
        movements = temp3;
      }
      
      if (filter.endDate) {
        var endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        var temp4 = [];
        for (var m = 0; m < movements.length; m++) {
          var mDate2 = new Date(movements[m].date);
          if (mDate2 <= endDate) {
            temp4.push(movements[m]);
          }
        }
        movements = temp4;
      }
    }
    
    // Calculate summary
    var totalIn = 0;
    var totalOut = 0;
    for (var n = 0; n < movements.length; n++) {
      if (movements[n].type === 'IN') {
        totalIn += movements[n].qty;
      } else if (movements[n].type === 'OUT') {
        totalOut += movements[n].qty;
      }
    }
    
    // Sort by date desc
    movements.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Return - SIMPLE like other features
    return {
      success: true,
      data: movements,
      summary: {
        totalIn: totalIn,
        totalOut: totalOut,
        netChange: totalIn - totalOut,
        totalTransactions: movements.length
      }
    };
    
  } catch (e) {
    Logger.log('ERROR in mutGetAllMutations: ' + e.message);
    return {
      success: false,
      message: 'Error: ' + e.message,
      data: [],
      summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
    };
  }
}

/**
 * Get mutations for a specific item
 * @param {string} email - User email for session check
 * @param {string} itemId - Item ID to filter
 */
function mutGetItemMutations(email, itemId) {
  return mutGetAllMutations(email, { itemId: itemId });
}

/**
 * Get inventory items for dropdown filter
 * @param {string} email - User email for session check
 */
function mutGetInventoryItems(email) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const invSheet = ss.getSheetByName('InventoryItems');
    
    if (!invSheet) {
      return { success: true, data: [] };
    }
    
    const data = getSheetDataAsObjects('InventoryItems');
    const items = data.map(row => ({
      id: row['Item ID'] || '',
      name: row['Item Name'] || row['Nama Barang'] || ''
    })).filter(item => item.id);
    
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
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const result = mutGetAllMutations(email, filter);
    
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
        ? (m.supplier ? 'Dari: ' + m.supplier : 'Penerimaan barang')
        : (m.customer ? 'Ke: ' + m.customer : 'Penjualan barang')
    }));
    
    // Add filter dates to summary if provided
    const summary = {
      totalIn: result.summary.totalIn,
      totalOut: result.summary.totalOut,
      totalTransactions: result.summary.totalTransactions,
      filterStartDate: filter && filter.startDate ? filter.startDate : null,
      filterEndDate: filter && filter.endDate ? filter.endDate : null
    };
    
    return {
      error: false,
      summary: summary,
      topInItems: topInItems,
      topOutItems: topOutItems,
      mutations: mutations
    };
    
  } catch (error) {
    Logger.log('Error in generateMutationReport: ' + error.message);
    return {
      error: true,
      message: 'Gagal generate laporan mutasi: ' + error.message
    };
  }
}
