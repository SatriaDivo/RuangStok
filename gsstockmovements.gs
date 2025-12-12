/**
 * ============================================================================
 * STOCK MOVEMENTS MODULE - Track all stock in/out movements
 * ============================================================================
 * This module handles logging and tracking of all stock movements
 * Supports manual stock adjustments and automatic tracking from sales
 */

/**
 * Log stock movement (IN or OUT)
 * @param {Object} movement - Movement data
 * @param {string} movement.itemId - Item ID
 * @param {string} movement.itemName - Item name
 * @param {string} movement.type - 'IN' or 'OUT'
 * @param {number} movement.qty - Quantity (positive number)
 * @param {string} movement.reference - Reference ID (SO ID, PO ID, etc)
 * @param {string} movement.notes - Description/notes
 * @param {string} movement.user - User email who made the change
 */
function logStockMovement(movement) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('StockMovements');
    
    // Create sheet if doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('StockMovements');
      
      // Set headers
      const headers = [
        'Date',
        'Item ID',
        'Item Name',
        'Type',
        'Qty',
        'Reference',
        'Notes',
        'User'
      ];
      sheet.appendRow(headers);
      
      // Format header
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#2c3e50');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      
      Logger.log('StockMovements sheet created');
    }
    
    // Append movement record
    const row = [
      new Date(),
      movement.itemId || '',
      movement.itemName || '',
      movement.type || '',
      Number(movement.qty) || 0,
      movement.reference || '',
      movement.notes || '',
      movement.user || ''
    ];
    
    sheet.appendRow(row);
    Logger.log('Stock movement logged: ' + JSON.stringify(movement));
    
    return { success: true, message: 'Movement logged' };
    
  } catch (error) {
    Logger.log('Error logging stock movement: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Get all stock movements with optional filters
 * @param {string} email - User email for session check
 * @param {Object} filter - Optional filter {startDate, endDate, itemId, type}
 */
function smGetAllMovements(email, filter) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('StockMovements');
    
    // If sheet doesn't exist, return empty data
    if (!sheet) {
      return {
        success: true,
        data: [],
        summary: {
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          totalTransactions: 0
        }
      };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        data: [],
        summary: {
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          totalTransactions: 0
        }
      };
    }
    
    const headers = data[0];
    const movements = [];
    
    // Parse data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[1]) continue; // Skip if no Item ID
      
      movements.push({
        date: row[0],
        itemId: row[1],
        itemName: row[2],
        type: row[3],
        qty: Number(row[4]) || 0,
        reference: row[5],
        notes: row[6],
        user: row[7]
      });
    }
    
    Logger.log('Total movements found: ' + movements.length);
    
    // Apply filters
    let filteredMovements = movements;
    
    if (filter) {
      // Filter by date range
      if (filter.startDate) {
        const startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        filteredMovements = filteredMovements.filter(m => {
          const movDate = new Date(m.date);
          return movDate >= startDate;
        });
      }
      
      if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        filteredMovements = filteredMovements.filter(m => {
          const movDate = new Date(m.date);
          return movDate <= endDate;
        });
      }
      
      // Filter by item
      if (filter.itemId) {
        filteredMovements = filteredMovements.filter(m => 
          m.itemId.toLowerCase().includes(filter.itemId.toLowerCase()) ||
          m.itemName.toLowerCase().includes(filter.itemId.toLowerCase())
        );
      }
      
      // Filter by type
      if (filter.type && filter.type !== 'ALL') {
        filteredMovements = filteredMovements.filter(m => m.type === filter.type);
      }
    }
    
    Logger.log('Filtered movements: ' + filteredMovements.length);
    
    // Sort by date descending
    filteredMovements.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
    
    // Calculate summary
    const totalIn = filteredMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.qty, 0);
    const totalOut = filteredMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.qty, 0);
    
    return {
      success: true,
      data: filteredMovements,
      summary: {
        totalIn: totalIn,
        totalOut: totalOut,
        netChange: totalIn - totalOut,
        totalTransactions: filteredMovements.length
      }
    };
    
  } catch (error) {
    Logger.log('Error in smGetAllMovements: ' + error.message);
    return {
      success: false,
      message: 'Gagal memuat data mutasi: ' + error.message,
      data: [],
      summary: { totalIn: 0, totalOut: 0, netChange: 0, totalTransactions: 0 }
    };
  }
}

/**
 * Manual stock adjustment - for adding stock manually
 * @param {string} email - User email
 * @param {Object} adjustment - {itemId, itemName, qty, notes}
 */
function smAddStockManually(email, adjustment) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    // Validate
    if (!adjustment.itemId || !adjustment.qty || adjustment.qty <= 0) {
      return { success: false, message: 'Data tidak valid' };
    }
    
    // Update inventory quantity
    const service = new InventoryService();
    const itemResult = service.getItemById(adjustment.itemId);
    
    if (!itemResult.success) {
      return { success: false, message: 'Item tidak ditemukan' };
    }
    
    const currentItem = itemResult.data;
    const newQty = (currentItem.quantity || 0) + Number(adjustment.qty);
    
    // Update inventory
    const updateResult = service.update(adjustment.itemId, {
      ...currentItem,
      quantity: newQty
    });
    
    if (!updateResult.success) {
      return updateResult;
    }
    
    // Log movement
    logStockMovement({
      itemId: adjustment.itemId,
      itemName: adjustment.itemName || currentItem.name,
      type: 'IN',
      qty: Number(adjustment.qty),
      reference: 'MANUAL',
      notes: adjustment.notes || 'Penambahan stok manual',
      user: email
    });
    
    return { 
      success: true, 
      message: `Berhasil menambah ${adjustment.qty} unit`,
      newQuantity: newQty
    };
    
  } catch (error) {
    Logger.log('Error in smAddStockManually: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * MIGRATION FUNCTION - Backfill existing sales data to StockMovements
 * Run this ONCE to migrate historical data
 * @param {string} email - User email (admin only)
 */
function smMigrateExistingSalesData(email) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get existing SalesDetails
    const salesSheet = ss.getSheetByName('SalesDetails');
    if (!salesSheet) {
      return { success: false, message: 'Sheet SalesDetails tidak ditemukan' };
    }
    
    const salesData = salesSheet.getDataRange().getValues();
    if (salesData.length < 2) {
      return { success: false, message: 'Tidak ada data penjualan untuk dimigrate' };
    }
    
    const headers = salesData[0];
    let migratedCount = 0;
    
    // Process each sales record
    for (let i = 1; i < salesData.length; i++) {
      const row = salesData[i];
      
      // Skip empty rows
      if (!row[0] && !row[1]) continue;
      
      // Extract data based on column headers
      const getColValue = (colNames) => {
        for (let name of colNames) {
          const idx = headers.indexOf(name);
          if (idx >= 0) return row[idx];
        }
        return '';
      };
      
      const soDate = getColValue(['SO Date', 'Date', 'Tanggal']);
      const itemId = getColValue(['Item ID', 'Kode Barang']);
      const itemName = getColValue(['Item Name', 'Nama Barang']);
      const qtySold = Number(getColValue(['QTY Sold', 'Qty', 'Jumlah Terjual'])) || 0;
      const soId = getColValue(['SO ID']);
      const customerName = getColValue(['Customer Name', 'Customer', 'Pelanggan']);
      
      if (!itemId || qtySold <= 0) continue;
      
      // Log this sale as stock movement
      logStockMovement({
        itemId: itemId,
        itemName: itemName,
        type: 'OUT',
        qty: qtySold,
        reference: soId || 'MIGRATED',
        notes: `[MIGRATED] Penjualan kepada: ${customerName || 'Unknown'}`,
        user: 'SYSTEM-MIGRATION'
      });
      
      migratedCount++;
    }
    
    Logger.log(`Migration completed: ${migratedCount} sales records migrated`);
    
    return {
      success: true,
      message: `Berhasil migrate ${migratedCount} transaksi penjualan`,
      migratedCount: migratedCount
    };
    
  } catch (error) {
    Logger.log('Error in smMigrateExistingSalesData: ' + error.message);
    return { 
      success: false, 
      message: 'Gagal migrate data: ' + error.message 
    };
  }
}
