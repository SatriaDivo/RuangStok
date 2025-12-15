/**
 * ============================================================================
 * STOCK MOVEMENTS MODULE - Track all stock in/out movements
 * ============================================================================
 * This module handles logging and tracking of all stock movements
 * Supports manual stock adjustments and automatic tracking from sales
 */

/**
 * Initialize StockMovements sheet if it doesn't exist
 * @param {string} email - User email for session check
 */
function smInitializeStockMovements(email) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

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
      headerRange.setHorizontalAlignment('center');
      
      // Set column widths
      sheet.setColumnWidth(1, 120); // Date
      sheet.setColumnWidth(2, 100); // Item ID
      sheet.setColumnWidth(3, 200); // Item Name
      sheet.setColumnWidth(9, 200); // Keterangan
      sheet.setColumnWidth(4, 80);  // Type
      sheet.setColumnWidth(5, 80);  // Qty
      sheet.setColumnWidth(6, 120); // Reference
      sheet.setColumnWidth(7, 250); // Notes
      sheet.setColumnWidth(8, 150); // User
      
      Logger.log('StockMovements sheet created successfully');
      
      return { 
        success: true, 
        message: 'Sheet StockMovements berhasil dibuat!' 
      };
    } else {
      return { 
        success: true, 
        message: 'Sheet StockMovements sudah ada' 
      };
    }
    
  } catch (error) {
    Logger.log('Error initializing StockMovements sheet: ' + error.message);
    return { 
      success: false, 
      message: 'Error: ' + error.message 
    };
  }
}

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
    const sheet = ss.getSheetByName('StockMovements');
    
    if (!sheet) {
      Logger.log('StockMovements sheet not found');
      return {
        success: true,
        data: [],
        summary: {
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          totalTransactions: 0
        },
        message: 'Sheet StockMovements belum ada. Silakan buat sheet terlebih dahulu.'
      };
    }
    
    const allData = sheet.getDataRange().getValues();
    Logger.log('Raw data rows: ' + allData.length);
    
    if (allData.length < 2) {
      Logger.log('StockMovements is empty');
      return {
        success: true,
        data: [],
        summary: {
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          totalTransactions: 0
        },
        message: 'Belum ada data mutasi stok'
      };
    }
    const headers = allData[0];
    const movements = [];
    
    // Parse data with limit to prevent timeout
    const maxRows = Math.min(allData.length, 10000); // Limit to 10k rows
    
    for (let i = 1; i < maxRows; i++) {
      const row = allData[i];
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
/**
 * Migrate existing sales, purchases, and receipts data to StockMovements
 * @param {string} email - User email for session check
 */
function smMigrateExistingSalesData(email) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let totalMigrated = 0;
    const results = {
      sales: 0,
      purchases: 0,
      receipts: 0
    };
    
    // 1. MIGRATE SALES DATA (OUT movements)
    const salesSheet = ss.getSheetByName('SalesDetails');
    if (salesSheet) {
      const salesData = salesSheet.getDataRange().getValues();
      if (salesData.length > 1) {
        const headers = salesData[0];
        
        for (let i = 1; i < salesData.length; i++) {
          const row = salesData[i];
          if (!row[0] && !row[1]) continue;
          
          const getColValue = (colNames) => {
            for (let name of colNames) {
              const idx = headers.indexOf(name);
              if (idx >= 0) return row[idx];
            }
            return '';
          };
          
          const itemId = getColValue(['Item ID', 'Kode Barang']);
          const itemName = getColValue(['Item Name', 'Nama Barang']);
          const qtySold = Number(getColValue(['QTY Sold', 'Qty', 'Jumlah Terjual'])) || 0;
          const soId = getColValue(['SO ID']);
          const customerName = getColValue(['Customer Name', 'Customer', 'Pelanggan']);
          
          if (!itemId || qtySold <= 0) continue;
          
          logStockMovement({
            itemId: itemId,
            itemName: itemName,
            type: 'OUT',
            qty: qtySold,
            reference: soId || 'MIGRATED-SALES',
            notes: `[MIGRATED] Penjualan kepada: ${customerName || 'Unknown'}`,
            user: 'SYSTEM-MIGRATION'
          });
          
          results.sales++;
        }
      }
    }
    
    // 2. MIGRATE PURCHASE DATA (IN movements)
    const purchaseSheet = ss.getSheetByName('PurchaseDetails');
    if (purchaseSheet) {
      const purchaseData = purchaseSheet.getDataRange().getValues();
      if (purchaseData.length > 1) {
        const headers = purchaseData[0];
        
        for (let i = 1; i < purchaseData.length; i++) {
          const row = purchaseData[i];
          if (!row[0] && !row[1]) continue;
          
          const getColValue = (colNames) => {
            for (let name of colNames) {
              const idx = headers.indexOf(name);
              if (idx >= 0) return row[idx];
            }
            return '';
          };
          
          const itemId = getColValue(['Item ID', 'Kode Barang']);
          const itemName = getColValue(['Item Name', 'Nama Barang']);
          const qty = Number(getColValue(['QTY', 'Qty', 'Jumlah'])) || 0;
          const poId = getColValue(['PO ID']);
          const supplierName = getColValue(['Supplier Name', 'Supplier', 'Pemasok']);
          
          if (!itemId || qty <= 0) continue;
          
          logStockMovement({
            itemId: itemId,
            itemName: itemName,
            type: 'IN',
            qty: qty,
            reference: poId || 'MIGRATED-PURCHASE',
            notes: `[MIGRATED] Pembelian dari: ${supplierName || 'Unknown'}`,
            user: 'SYSTEM-MIGRATION'
          });
          
          results.purchases++;
        }
      }
    }
    
    // 3. MIGRATE RECEIPTS DATA (IN movements)
    const receiptsSheet = ss.getSheetByName('Receipts');
    if (receiptsSheet) {
      const receiptsData = receiptsSheet.getDataRange().getValues();
      if (receiptsData.length > 1) {
        const headers = receiptsData[0];
        
        for (let i = 1; i < receiptsData.length; i++) {
          const row = receiptsData[i];
          if (!row[0] && !row[1]) continue;
          
          const getColValue = (colNames) => {
            for (let name of colNames) {
              const idx = headers.indexOf(name);
              if (idx >= 0) return row[idx];
            }
            return '';
          };
          
          const itemId = getColValue(['Item ID', 'Kode Barang']);
          const itemName = getColValue(['Item Name', 'Nama Barang']);
          const qty = Number(getColValue(['QTY Received', 'Qty', 'Jumlah Diterima'])) || 0;
          const receiptId = getColValue(['Receipt ID']);
          const poId = getColValue(['PO ID']);
          const supplierName = getColValue(['Supplier Name', 'Supplier', 'Pemasok']);
          
          if (!itemId || qty <= 0) continue;
          
          logStockMovement({
            itemId: itemId,
            itemName: itemName,
            type: 'IN',
            qty: qty,
            reference: receiptId || poId || 'MIGRATED-RECEIPT',
            notes: `[MIGRATED] Penerimaan dari: ${supplierName || 'Unknown'}`,
            user: 'SYSTEM-MIGRATION'
          });
          
          results.receipts++;
        }
      }
    }
    
    totalMigrated = results.sales + results.purchases + results.receipts;
    
    Logger.log(`Migration completed: Sales=${results.sales}, Purchases=${results.purchases}, Receipts=${results.receipts}, Total=${totalMigrated}`);
    
    return {
      success: true,
      message: `Berhasil migrate ${totalMigrated} transaksi (${results.sales} penjualan, ${results.purchases} pembelian, ${results.receipts} penerimaan)`,
      migratedCount: totalMigrated,
      details: results
    };
    
  } catch (error) {
    Logger.log('Error in smMigrateExistingSalesData: ' + error.message);
    return { 
      success: false, 
      message: 'Gagal migrate data: ' + error.message 
    };
  }
}
