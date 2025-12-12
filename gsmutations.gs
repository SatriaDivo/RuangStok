/**
 * ============================================================================
 * MUTATIONS MODULE - Stock Movement / Mutasi Stok
 * ============================================================================
 * Handles stock movement tracking from PurchaseDetails (IN) and SalesDetails (OUT)
 */

/**
 * Get all stock mutations (combined from PurchaseDetails and SalesDetails)
 * @param {string} email - User email for session check
 * @param {Object} filter - Optional filter {startDate, endDate, itemId, type}
 */
function mutGetAllMutations(email, filter) {
  const session = checkServerSession(email, false);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mutations = [];
    
    // Get PurchaseDetails data (Barang Masuk)
    const purchaseSheet = ss.getSheetByName('PurchaseDetails');
    if (purchaseSheet) {
      const purchaseData = getSheetDataAsObjects('PurchaseDetails');
      Logger.log('PurchaseDetails rows found: ' + purchaseData.length);
      purchaseData.forEach(row => {
        // Check for Item ID and QTY Purchased (correct column names)
        const itemId = row['Item ID'] || row['Kode Barang'] || '';
        const qty = Number(row['QTY Purchased']) || Number(row['Qty']) || 0;
        
        if (itemId && qty > 0) {
          mutations.push({
            date: row['Date'] || row['Tanggal'] || '',
            itemId: itemId,
            itemName: row['Item Name'] || row['Nama Barang'] || '',
            type: 'IN',
            typeLabel: 'Masuk',
            qty: qty,
            reference: row['PO ID'] || '',
            referenceType: 'PO',
            supplier: row['Supplier Name'] || row['Supplier'] || row['Pemasok'] || '',
            notes: row['Notes'] || row['Keterangan'] || 'Penerimaan barang dari pembelian'
          });
        }
      });
    } else {
      Logger.log('PurchaseDetails sheet not found');
    }
    
    // Get SalesDetails data (Barang Keluar)
    const salesSheet = ss.getSheetByName('SalesDetails');
    if (salesSheet) {
      const salesData = getSheetDataAsObjects('SalesDetails');
      Logger.log('SalesDetails rows found: ' + salesData.length);
      salesData.forEach(row => {
        // Check for Item ID and QTY Sold (correct column names)
        const itemId = row['Item ID'] || row['Kode Barang'] || '';
        const qty = Number(row['QTY Sold']) || Number(row['Qty']) || 0;
        
        if (itemId && qty > 0) {
          mutations.push({
            date: row['SO Date'] || row['Date'] || row['Tanggal'] || '',
            itemId: itemId,
            itemName: row['Item Name'] || row['Nama Barang'] || '',
            type: 'OUT',
            typeLabel: 'Keluar',
            qty: qty,
            reference: row['SO ID'] || '',
            referenceType: 'SO',
            customer: row['Customer Name'] || row['Customer'] || row['Pelanggan'] || '',
            notes: row['Notes'] || row['Keterangan'] || 'Penjualan barang'
          });
        }
      });
    } else {
      Logger.log('SalesDetails sheet not found');
    }
    
    Logger.log('Total mutations found: ' + mutations.length);
    
    // Apply filters if provided
    let filteredMutations = mutations;
    
    if (filter) {
      // Filter by date range
      if (filter.startDate) {
        const startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        filteredMutations = filteredMutations.filter(m => {
          const mutDate = new Date(m.date);
          return mutDate >= startDate;
        });
      }
      
      if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        filteredMutations = filteredMutations.filter(m => {
          const mutDate = new Date(m.date);
          return mutDate <= endDate;
        });
      }
      
      // Filter by item
      if (filter.itemId) {
        filteredMutations = filteredMutations.filter(m => 
          m.itemId.toLowerCase().includes(filter.itemId.toLowerCase()) ||
          m.itemName.toLowerCase().includes(filter.itemId.toLowerCase())
        );
      }
      
      // Filter by type (IN/OUT)
      if (filter.type && filter.type !== 'ALL') {
        filteredMutations = filteredMutations.filter(m => m.type === filter.type);
      }
    }
    
    // Sort by date descending (newest first)
    filteredMutations.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
    
    // Calculate summary
    const totalIn = filteredMutations.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.qty, 0);
    const totalOut = filteredMutations.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.qty, 0);
    
    return {
      success: true,
      data: filteredMutations,
      summary: {
        totalIn: totalIn,
        totalOut: totalOut,
        netChange: totalIn - totalOut,
        totalTransactions: filteredMutations.length
      }
    };
    
  } catch (error) {
    Logger.log('Error in mutGetAllMutations: ' + error.message);
    return {
      success: false,
      message: 'Gagal memuat data mutasi: ' + error.message,
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
