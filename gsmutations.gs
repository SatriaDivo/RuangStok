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
  Logger.log('=== mutGetAllMutations START ===');
  Logger.log('Email: ' + email);
  Logger.log('Filter: ' + JSON.stringify(filter));
  
  try {
    // Check session
    var session = checkServerSession(email, false);
    if (!session || !session.active) {
      Logger.log('Session not active');
      return { 
        success: false, 
        message: "Sesi berakhir", 
        sessionExpired: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
      };
    }
    
    Logger.log('Session active for user: ' + session.username);
    
    // Get spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('StockMovements');
    
    if (!sheet) {
      Logger.log('Sheet not found');
      return {
        success: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 },
        message: 'Sheet StockMovements belum ada'
      };
    }
    
    // Get all data
    var allData = sheet.getDataRange().getValues();
    Logger.log('Total rows: ' + allData.length);
    
    if (allData.length < 2) {
      return {
        success: true,
        data: [],
        summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 },
        message: 'Belum ada data mutasi'
      };
    }
    
    // Parse data - simple array
    var movements = [];
    for (var i = 1; i < allData.length; i++) {
      var row = allData[i];
      if (!row[1]) continue;
      
      var movement = {
        date: row[0],
        itemId: row[1] ? String(row[1]) : '',
        itemName: row[2] ? String(row[2]) : '',
        type: row[3] ? String(row[3]) : '',
        qty: row[4] ? Number(row[4]) : 0,
        reference: row[5] ? String(row[5]) : '',
        notes: row[6] ? String(row[6]) : '',
        user: row[7] ? String(row[7]) : '',
        keterangan: row[8] ? String(row[8]) : ''
      };
      movements.push(movement);
    }
    
    Logger.log('Parsed: ' + movements.length + ' movements');
    if (movements.length > 0) {
      Logger.log('First movement: ' + JSON.stringify(movements[0]));
      Logger.log('First movement date type: ' + typeof movements[0].date);
      Logger.log('First movement date value: ' + movements[0].date);
    }
    
    // Apply itemId filter if provided
    if (filter && filter.itemId) {
      var temp0 = [];
      for (var n = 0; n < movements.length; n++) {
        if (movements[n].itemId === filter.itemId) {
          temp0.push(movements[n]);
        }
      }
      movements = temp0;
      Logger.log('After itemId filter: ' + movements.length);
    }
    
    // Apply date filter if provided
    if (filter && filter.startDate) {
      var startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      var temp = [];
      for (var j = 0; j < movements.length; j++) {
        var mDate = new Date(movements[j].date);
        if (mDate >= startDate) {
          temp.push(movements[j]);
        }
      }
      movements = temp;
      Logger.log('After startDate filter: ' + movements.length);
    }
    
    if (filter && filter.endDate) {
      var endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      var temp2 = [];
      for (var k = 0; k < movements.length; k++) {
        var mDate2 = new Date(movements[k].date);
        if (mDate2 <= endDate) {
          temp2.push(movements[k]);
        }
      }
      movements = temp2;
      Logger.log('After endDate filter: ' + movements.length);
    }
    
    // Type filter
    if (filter && filter.type && filter.type !== 'ALL') {
      var temp3 = [];
      for (var l = 0; l < movements.length; l++) {
        if (movements[l].type === filter.type) {
          temp3.push(movements[l]);
        }
      }
      movements = temp3;
      Logger.log('After type filter: ' + movements.length);
    }
    
    Logger.log('After all filters: ' + movements.length);
    
    // Calculate summary
    var totalIn = 0;
    var totalOut = 0;
    for (var m = 0; m < movements.length; m++) {
      if (movements[m].type === 'IN') {
        totalIn += movements[m].qty;
      } else if (movements[m].type === 'OUT') {
        totalOut += movements[m].qty;
      }
    }
    
    // Sort by date desc
    movements.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    var result = {
      success: true,
      data: movements,
      summary: {
        totalIn: totalIn,
        totalOut: totalOut,
        netChange: totalIn - totalOut,
        totalTransactions: movements.length
      }
    };
    
    Logger.log('=== END - success ===');
    return result;
    
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
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
