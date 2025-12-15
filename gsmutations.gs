/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from StockMovements log
 * Uses getSheetDataAsObjects from gsreports.gs for data access
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
 * Direct test - no session check
 */
function testMutationsDirect() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('StockMovements');
    
    if (!sheet) {
      return { error: 'Sheet StockMovements not found' };
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    Logger.log('Last row: ' + lastRow + ', Last col: ' + lastCol);
    
    if (lastRow < 2) {
      return { error: 'No data rows', lastRow: lastRow };
    }
    
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    Logger.log('Headers: ' + JSON.stringify(headers));
    
    var rows = data.slice(1);
    Logger.log('Row count: ' + rows.length);
    Logger.log('First row: ' + JSON.stringify(rows[0]));
    
    return {
      success: true,
      headers: headers,
      rowCount: rows.length,
      firstRow: rows[0]
    };
  } catch (e) {
    return { error: e.message, stack: e.stack };
  }
}

/**
 * Get ALL stock mutations - no filter (for "Tampilkan Semua" button)
 * @param {string} email - User email for session check
 */
function mutGetAllMutationsNoFilter(email) {
  Logger.log('mutGetAllMutationsNoFilter called with email: ' + email);
  return mutGetAllMutations(email, null);
}

/**
 * Get all stock mutations from StockMovements sheet
 * @param {string} email - User email for session check
 * @param {Object} filter - Optional filter {startDate, endDate, itemId, type}
 */
function mutGetAllMutations(email, filter) {
  Logger.log('mutGetAllMutations called');
  Logger.log('Email: ' + email);
  Logger.log('Filter: ' + JSON.stringify(filter));
  // Session check
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
    // Use getSheetDataAsObjects from gsreports.gs (same as other features)
    const rawData = getSheetDataAsObjects('StockMovements');
    
    if (!rawData || rawData.length === 0) {
      return {
        success: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 },
        message: 'Belum ada data mutasi'
      };
    }
    
    // Map to movements array
    var movements = [];
    for (var i = 0; i < rawData.length; i++) {
      var row = rawData[i];
      
      var movement = {
        date: row['Date'],
        itemId: String(row['Item ID'] || ''),
        itemName: String(row['Item Name'] || ''),
        type: String(row['Type'] || ''),
        qty: Number(row['Qty']) || 0,
        reference: String(row['Reference'] || ''),
        notes: String(row['Notes'] || ''),
        user: String(row['User'] || ''),
        keterangan: String(row['Keterangan'] || '')
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
