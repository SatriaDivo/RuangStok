/**
 * Google Apps Script untuk fitur laporan Ruang Stok v2.1
 * Menghasilkan berbagai jenis laporan dari data Google Sheets
 */

// ============================================================================
// HELPER FUNCTIONS - TOP LEVEL
// ============================================================================

/**
 * Helper: Get column value with flexible naming (English/Indonesian)
 */
function getColumnValue(row, possibleNames) {
  for (let name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

/**
 * Helper: Get data from sheet by name or named range
 * Prioritizes actual sheet reading over named ranges
 */
function getSheetDataAsObjects(sheetNameOrRangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = null;
  
  // Try to get sheet by name first
  const sheetsByName = {
    'RANGESD': 'SalesDetails',
    'RANGEINVENTORYITEMS': 'InventoryItems',
    'RANGEPO': 'PurchaseOrders',
    'RANGEPAYMENTS': 'Payments',
    'RANGERECEIPTS': 'Receipts',
    'RANGECUSTOMERS': 'Customers'
  };
  
  const sheetName = sheetsByName[sheetNameOrRangeName] || sheetNameOrRangeName;
  sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log('Sheet "' + sheetName + '" not found, trying named range');
    const range = ss.getRangeByName(sheetNameOrRangeName);
    if (!range) {
      Logger.log('ERROR: Neither sheet "' + sheetName + '" nor named range "' + sheetNameOrRangeName + '" found!');
      return [];
    }
    sheet = range.getSheet();
  }
  
  Logger.log('Reading from sheet: ' + sheet.getName());
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2 || lastCol < 1) {
    Logger.log('Sheet is empty');
    return [];
  }
  
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  
  const headers = values[0];
  Logger.log('Headers: ' + JSON.stringify(headers));
  
  const rows = values.slice(1)
    .filter(r => r.some(cell => cell !== '' && cell !== null && cell !== 0));
  
  Logger.log('Found ' + rows.length + ' data rows');
  
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

/**
 * Helper: get named range data as array of objects
 * Fallback function - uses getSheetDataAsObjects
 */
function reportGetRangeDataAsObjects(rangeName) {
  return getSheetDataAsObjects(rangeName);
}

// ============================================================================
// REPORT GENERATION - MAIN FUNCTIONS (TOP LEVEL)
// ============================================================================

/**
 * Generate Sales Report with date filter
 * WRAPPER VERSION - ALL LOGIC HERE, same pattern as inventory & financial reports
 * @param {Object} filter - {startDate: Date, endDate: Date, period: 'week'|'month'|'custom'}
 * @param {string} email - User email for session check
 */
function generateSalesReport(filter, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  Logger.log('=== WRAPPER START: generateSalesReport ===');
  
  // 1. Define a safe fallback return object immediately
  var safeReturn = {
    error: true,
    message: 'Initialization failed',
    summary: {
      totalSales: 0,
      totalOrders: 0,
      totalItems: 0,
      averageOrderValue: 0,
      filterStartDate: '',
      filterEndDate: '',
      isFallback: false
    },
    salesByMonth: {},
    topItems: [],
    topCustomers: [],
    detailTransactions: [],
    generatedAt: new Date().toISOString()
  };
  
  try {
    Logger.log('Step 1: Filter received: ' + JSON.stringify(filter));

    // Check if filter is 'all' - get all data without date filtering
    const isAllData = filter && filter.period === 'all';
    
    // Set default filter if not provided (and not 'all')
    if (!isAllData && (!filter || Object.keys(filter).length === 0)) {
      const now = new Date();
      filter = {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        period: 'month'
      };
    }
    
    Logger.log('Step 3: Getting sales data from RANGESD');
    const salesData = reportGetRangeDataAsObjects('RANGESD');
    
    if (!salesData || salesData.length === 0) {
      safeReturn.message = 'Tidak ada data penjualan di sheet SalesDetails';
      return safeReturn;
    }

    // Get inventory data for stock information
    Logger.log('Step 3b: Getting inventory data for stock info');
    const inventoryData = reportGetRangeDataAsObjects('RANGEINVENTORYITEMS');
    const inventoryMap = {};
    if (inventoryData && inventoryData.length > 0) {
      inventoryData.forEach(row => {
        const itemName = row['Nama Barang'] || row['Item Name'] || row['Item'] || '';
        if (itemName) {
          inventoryMap[itemName] = {
            remainingQty: Number(row['Jumlah Barang'] || row['Quantity'] || row['QTY'] || row['Qty On Hand'] || 0),
            initialQty: Number(row['Jumlah Awal'] || row['Initial Qty'] || row['Beginning Qty'] || row['Jumlah Barang'] || row['Quantity'] || 0)
          };
        }
      });
    }
    Logger.log('Inventory map created with ' + Object.keys(inventoryMap).length + ' items');

    // Helper functions
    const getVal = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return Number(row[name]) || 0;
        }
      }
      return 0;
    };
    
    const getStr = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          // Convert Date objects to string immediately to avoid serialization issues later
          if (row[name] instanceof Date) {
             return row[name].toISOString();
          }
          return String(row[name]);
        }
      }
      return 'Unknown';
    };

    const parseDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        let d = new Date(val);
        if (!isNaN(d.getTime())) return d;
        const parts = val.split('/');
        if (parts.length === 3) {
          d = new Date(parts[2], parts[1] - 1, parts[0]);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return null;
    };

    // Parse filter dates
    let startDate = null;
    let endDate = null;
    if (filter && filter.startDate && filter.endDate) {
      startDate = new Date(filter.startDate);
      endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
    }

    // Analyze data date range
    let minDate = null;
    let maxDate = null;
    
    salesData.forEach(row => {
      try {
        // Try to find date column
        let rawDateVal = null;
        const dateCols = ['SO Date', 'Tanggal SO', 'Date', 'Tanggal'];
        for (let col of dateCols) {
          if (row[col]) { rawDateVal = row[col]; break; }
        }
        
        const d = parseDate(rawDateVal);
        if (d) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      } catch (e) {}
    });

    // Filter logic with Fallback
    let filteredData = [];
    let usedStartDate = startDate;
    let usedEndDate = endDate;
    let isFallbackMode = false;

    // If 'all' mode, use all data without filtering
    if (isAllData) {
      Logger.log('Mode: ALL DATA - No date filtering');
      filteredData = salesData;
      usedStartDate = minDate;
      usedEndDate = maxDate;
    } else if (startDate && endDate) {
      const strictFiltered = salesData.filter(row => {
        try {
          let rawDateVal = null;
          const dateCols = ['SO Date', 'Tanggal SO', 'Date', 'Tanggal'];
          for (let col of dateCols) {
            if (row[col]) { rawDateVal = row[col]; break; }
          }
          
          const rowDate = parseDate(rawDateVal);
          if (!rowDate) return false;
          return rowDate >= startDate && rowDate <= endDate;
        } catch (e) { return false; }
      });

      if (strictFiltered.length === 0 && salesData.length > 0) {
        Logger.log('Strict filter empty. Using fallback.');
        filteredData = salesData; // Use ALL data
        if (minDate && maxDate) {
            usedStartDate = minDate;
            usedEndDate = maxDate;
        }
        isFallbackMode = true;
      } else {
        filteredData = strictFiltered;
      }
    } else {
      filteredData = salesData;
    }

    // Calculate metrics
    const totalSales = filteredData.reduce((sum, row) => sum + getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']), 0);
    
    const orderIds = new Set();
    filteredData.forEach(row => {
       const id = getStr(row, ['SO ID', 'ID Penjualan', 'ID', 'Order ID']);
       if(id && id !== 'Unknown') orderIds.add(id);
    });
    const totalOrders = orderIds.size;

    const totalItems = filteredData.reduce((sum, row) => sum + getVal(row, ['QTY Sold', 'Jumlah Terjual', 'Quantity', 'Qty']), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Aggregations
    const monthMap = {};
    const itemMap = {};
    const custMap = {};

    filteredData.forEach(row => {
      // Month Aggregation
      let rawDateVal = null;
      const dateCols = ['SO Date', 'Tanggal SO', 'Date', 'Tanggal'];
      for (let col of dateCols) {
        if (row[col]) { rawDateVal = row[col]; break; }
      }
      const d = parseDate(rawDateVal);
      if (d) {
        const monthKey = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
        const rev = getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']);
        monthMap[monthKey] = (monthMap[monthKey] || 0) + rev;
      }

      // Item Aggregation
      const itemName = getStr(row, ['Item Name', 'Nama Barang', 'Item', 'Product Name']);
      const itemId = getStr(row, ['Item ID', 'Kode Barang', 'SKU']);
      const itemCategory = getStr(row, ['Item Category', 'Kategori Barang', 'Item Type', 'Category']);
      const qty = getVal(row, ['QTY Sold', 'Jumlah Terjual', 'Quantity', 'Qty']);
      const revenue = getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']);
      
      if (!itemMap[itemName]) {
        itemMap[itemName] = { itemId, itemName, itemCategory, qty: 0, revenue: 0 };
      }
      itemMap[itemName].qty += qty;
      itemMap[itemName].revenue += revenue;

      // Customer Aggregation
      const customer = getStr(row, ['Customer Name', 'Nama Pelanggan', 'Customer', 'Pelanggan']);
      custMap[customer] = (custMap[customer] || 0) + revenue;
    });

    const topItems = Object.values(itemMap)
      .map(item => {
        // Get stock info from inventory
        const stockInfo = inventoryMap[item.itemName] || { remainingQty: 0, initialQty: 0 };
        // Calculate initial stock: remaining + sold qty (approximation)
        const calculatedInitial = stockInfo.remainingQty + item.qty;
        return {
          ...item,
          remainingQty: stockInfo.remainingQty,
          initialQty: stockInfo.initialQty > 0 ? stockInfo.initialQty : calculatedInitial
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const topCustomers = Object.entries(custMap)
      .map(([name, revenue]) => ({ customerName: name, totalSales: revenue }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    // Detail Transactions - Ensure simple types
    const detailTransactions = filteredData.map(row => {
      let rawDateVal = null;
      const dateCols = ['SO Date', 'Tanggal SO', 'Date', 'Tanggal'];
      for (let col of dateCols) {
        if (row[col]) { rawDateVal = row[col]; break; }
      }
      const d = parseDate(rawDateVal);
      const dateStr = d ? d.toISOString() : '';

      return {
        date: dateStr,
        soId: getStr(row, ['SO ID', 'ID Penjualan', 'ID', 'Order ID']),
        itemId: getStr(row, ['Item ID', 'Kode Barang', 'SKU']),
        itemName: getStr(row, ['Item Name', 'Nama Barang', 'Item', 'Product Name']),
        itemCategory: getStr(row, ['Item Category', 'Kategori Barang', 'Item Type', 'Category']),
        qty: getVal(row, ['QTY Sold', 'Jumlah Terjual', 'Quantity', 'Qty']),
        unitPrice: getVal(row, ['Unit Price', 'Harga Satuan', 'Price']),
        total: getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']),
        customer: getStr(row, ['Customer Name', 'Nama Pelanggan', 'Customer', 'Pelanggan'])
      };
    });

    // Calculate total stock summary
    let totalInitialStock = 0;
    let totalRemainingStock = 0;
    Object.values(inventoryMap).forEach(stock => {
      totalRemainingStock += stock.remainingQty;
      totalInitialStock += stock.initialQty > 0 ? stock.initialQty : stock.remainingQty;
    });
    // Add sold items to initial stock for better estimation
    totalInitialStock = totalRemainingStock + totalItems;

    const report = {
      error: false,
      message: 'Success',
      summary: {
        totalSales: totalSales,
        totalOrders: totalOrders,
        totalItems: totalItems,
        averageOrderValue: averageOrderValue,
        totalInitialStock: totalInitialStock,
        totalRemainingStock: totalRemainingStock,
        filterStartDate: usedStartDate ? usedStartDate.toISOString() : '',
        filterEndDate: usedEndDate ? usedEndDate.toISOString() : '',
        isFallback: isFallbackMode
      },
      salesByMonth: monthMap,
      topItems: topItems,
      topCustomers: topCustomers,
      detailTransactions: detailTransactions,
      generatedAt: new Date().toISOString()
    };

    // Force JSON serialization check
    const jsonString = JSON.stringify(report);
    return JSON.parse(jsonString);

  } catch (error) {
    Logger.log('FATAL ERROR in generateSalesReport: ' + error.toString());
    safeReturn.message = 'Server Error: ' + error.toString();
    return safeReturn;
  }
}

/**
 * Generate Inventory Report with date filter
 * @param {Object} filter - {startDate: Date, endDate: Date, period: 'week'|'month'|'custom'}
 * @param {string} email - User email for session check
 */
function generateInventoryReport(filter, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  Logger.log('=== WRAPPER START: generateInventoryReport ===');
  
  let safeReturn = {
    summary: {
      totalItems: 0,
      totalStock: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0
    },
    categoryStock: {},
    lowStockList: [],
    topSelling: [],
    generatedAt: new Date().toISOString()
  };
  
  try {
    const inventoryData = reportGetRangeDataAsObjects('RANGEINVENTORYITEMS');
    
    Logger.log('Inventory Data Count: ' + inventoryData.length);
    if (inventoryData.length > 0) {
      Logger.log('First Item: ' + JSON.stringify(inventoryData[0]));
      Logger.log('Column Names: ' + Object.keys(inventoryData[0]).join(', '));
    }

    if (inventoryData.length === 0) {
      Logger.log('No inventory data found, returning empty report');
      return safeReturn;
    }

    // Helper functions for flexible column names
    const getVal = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return Number(row[name]) || 0;
        }
      }
      return 0;
    };
    
    const getStr = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      return 'Unknown';
    };

    const totalItems = inventoryData.length;
    const totalStock = inventoryData.reduce((sum, row) => sum + getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']), 0);
    const totalValue = inventoryData.reduce((sum, row) => sum + getVal(row, ['Total Harga', 'Total Value', 'Total', 'Nilai Inventory']), 0);
    
    const lowStockQty = 10;
    const lowStockItems = inventoryData.filter(row => {
      const qty = getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']);
      return qty < lowStockQty && qty > 0;
    }).length;
    const outOfStockItems = inventoryData.filter(row => getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']) <= 0).length;

    const categoryStock = {};
    inventoryData.forEach(row => {
      const category = getStr(row, ['Kategori Barang', 'Item Category', 'Category', 'Item Type']);
      const qty = getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']);
      categoryStock[category] = (categoryStock[category] || 0) + qty;
    });

    const lowStockList = inventoryData
      .filter(row => {
        const qty = getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']);
        return qty < lowStockQty && qty > 0;
      })
      .map(row => ({
        itemName: getStr(row, ['Nama Barang', 'Item Name', 'Item', 'Product Name']),
        remainingQty: getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']),
        reorderLevel: 10
      }))
      .sort((a, b) => a.remainingQty - b.remainingQty)
      .slice(0, 20);

    const outOfStockList = inventoryData
      .filter(row => getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']) <= 0)
      .map(row => ({
        itemName: getStr(row, ['Nama Barang', 'Item Name', 'Item', 'Product Name']),
        remainingQty: 0,
        reorderLevel: 10
      }));

    const topSelling = inventoryData
      .map(row => ({
        itemName: getStr(row, ['Nama Barang', 'Item Name', 'Item', 'Product Name']),
        qtySold: 0,
        remainingQty: getVal(row, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand'])
      }))
      .sort((a, b) => b.remainingQty - a.remainingQty)
      .slice(0, 10);

    const report = {
      summary: {
        totalItems: totalItems,
        totalStock: totalStock,
        totalValue: totalValue,
        lowStockItems: lowStockItems,
        outOfStockItems: outOfStockItems
      },
      categoryStock: categoryStock,
      lowStockList: lowStockList.concat(outOfStockList),
      topSelling: topSelling,
      generatedAt: new Date().toISOString()
    };

    Logger.log('Inventory report created: ' + totalItems + ' items, ' + totalValue + ' total value');
    return report;
  } catch (error) {
    Logger.log('Error in generateInventoryReport: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return safeReturn;
  }
}

/**
 * Generate Financial Report
 * @param {Object} filter - {startDate: Date, endDate: Date, period: 'week'|'month'|'custom'}
 * @param {string} email - User email for session check
 */
function generateFinancialReport(filter, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  Logger.log('=== WRAPPER START: generateFinancialReport ===');
  
  let safeReturn = {
    summary: {
      totalRevenue: 0,
      totalPurchases: 0,
      grossProfit: 0,
      totalPaymentsReceived: 0,
      totalReceipts: 0,
      netCashFlow: 0
    },
    revenueByMonth: {},
    expensesByMonth: {},
    profitByMonth: {},
    paymentMethods: {},
    generatedAt: new Date().toISOString()
  };
  
  try {
    const salesData = reportGetRangeDataAsObjects('RANGESD');
    const purchaseData = reportGetRangeDataAsObjects('RANGEPO');
    const paymentData = reportGetRangeDataAsObjects('RANGEPAYMENTS');
    const receiptData = reportGetRangeDataAsObjects('RANGERECEIPTS');

    Logger.log('Financial data loaded - Sales: ' + salesData.length + ', Purchases: ' + purchaseData.length);

    // Helper functions for flexible column names
    const getVal = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return Number(row[name]) || 0;
        }
      }
      return 0;
    };
    
    const getStr = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      return 'Unknown';
    };

    let filteredSales = salesData;
    let filteredPurchases = purchaseData;
    let filteredPayments = paymentData;
    let filteredReceipts = receiptData;
    
    // Check if filter is 'all' - skip date filtering
    const isAllData = filter && filter.period === 'all';
    
    if (!isAllData && filter && filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      
      filteredSales = salesData.filter(row => {
        try {
          const dateStr = getStr(row, ['SO Date', 'Tanggal SO', 'Date', 'Tanggal']);
          const rowDate = new Date(dateStr);
          return rowDate >= start && rowDate <= end;
        } catch (e) {
          return false;
        }
      });
      
      filteredPurchases = purchaseData.filter(row => {
        try {
          const dateStr = getStr(row, ['PO Date', 'Tanggal PO', 'Date', 'Tanggal']);
          const rowDate = new Date(dateStr);
          return rowDate >= start && rowDate <= end;
        } catch (e) {
          return false;
        }
      });
      
      filteredPayments = paymentData.filter(row => {
        try {
          const dateStr = getStr(row, ['PMT Date', 'Tanggal PMT', 'Payment Date', 'Date']);
          const rowDate = new Date(dateStr);
          return rowDate >= start && rowDate <= end;
        } catch (e) {
          return false;
        }
      });
      
      filteredReceipts = receiptData.filter(row => {
        try {
          const dateStr = getStr(row, ['Receipt Date', 'Tanggal Terima', 'Date', 'Tanggal']);
          const rowDate = new Date(dateStr);
          return rowDate >= start && rowDate <= end;
        } catch (e) {
          return false;
        }
      });
    }

    const totalRevenue = filteredSales.reduce((sum, row) => sum + getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']), 0);
    const totalPurchases = filteredPurchases.reduce((sum, row) => sum + getVal(row, ['Total Purchase Price', 'Total Harga Pembelian', 'Total Amount', 'Total']), 0);
    const grossProfit = totalRevenue - totalPurchases;

    const totalPaymentsReceived = filteredPayments.reduce((sum, row) => sum + getVal(row, ['Amount Paid', 'Jumlah Bayar', 'Amount', 'Nominal']), 0);
    const totalReceipts = filteredReceipts.reduce((sum, row) => sum + getVal(row, ['Amount', 'Jumlah', 'Nominal', 'Total']), 0);

    const revenueByMonth = {};
    filteredSales.forEach(row => {
      try {
        const dateStr = getStr(row, ['SO Date', 'Tanggal SO', 'Date', 'Tanggal']);
        const date = new Date(dateStr);
        const monthKey = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
        const revenue = getVal(row, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']);
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + revenue;
      } catch (e) {
        Logger.log('Error parsing sales date');
      }
    });

    const expensesByMonth = {};
    filteredPurchases.forEach(row => {
      try {
        const dateStr = getStr(row, ['PO Date', 'Tanggal PO', 'Date', 'Tanggal']);
        const date = new Date(dateStr);
        const monthKey = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
        const expense = getVal(row, ['Total Purchase Price', 'Total Harga Pembelian', 'Total Amount', 'Total']);
        expensesByMonth[monthKey] = (expensesByMonth[monthKey] || 0) + expense;
      } catch (e) {
        Logger.log('Error parsing purchase date');
      }
    });

    const profitByMonth = {};
    Object.keys(revenueByMonth).forEach(month => {
      const revenue = revenueByMonth[month] || 0;
      const expenses = expensesByMonth[month] || 0;
      profitByMonth[month] = revenue - expenses;
    });

    const paymentMethods = {};
    filteredPayments.forEach(row => {
      const method = getStr(row, ['PMT Mode', 'Cara Bayar', 'Payment Method', 'Method']);
      const amount = getVal(row, ['Amount Paid', 'Jumlah Bayar', 'Amount', 'Nominal']);
      paymentMethods[method] = (paymentMethods[method] || 0) + amount;
    });

    const report = {
      summary: {
        totalRevenue: totalRevenue,
        totalPurchases: totalPurchases,
        grossProfit: grossProfit,
        totalPaymentsReceived: totalPaymentsReceived,
        totalReceipts: totalReceipts,
        netCashFlow: totalPaymentsReceived + totalReceipts - totalPurchases
      },
      revenueByMonth: revenueByMonth,
      expensesByMonth: expensesByMonth,
      profitByMonth: profitByMonth,
      paymentMethods: paymentMethods,
      generatedAt: new Date().toISOString()
    };

    Logger.log('Financial report created: Revenue=' + totalRevenue + ', Expenses=' + totalPurchases + ', Profit=' + grossProfit);
    return report;
  } catch (error) {
    Logger.log('Error in generateFinancialReport: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return safeReturn;
  }
}

/**
 * Generate Customer Report
 * @param {string} email - User email for session check
 */
function generateCustomerReport(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const customerData = reportGetRangeDataAsObjects('RANGECUSTOMERS');
    const salesData = reportGetRangeDataAsObjects('RANGESD');

    const totalCustomers = customerData.length;
    const activeCustomers = customerData.filter(row => (row['Total Sales'] || 0) > 0).length;
    const totalReceivable = customerData.reduce((sum, row) => sum + Number(row['Balance Receivable'] || 0), 0);

    const topCustomers = customerData
      .map(row => ({
        customerName: row['Customer Name'],
        totalSales: row['Total Sales'] || 0,
        balanceReceivable: row['Balance Receivable'] || 0,
        city: row['City'],
        state: row['State']
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    const customersWithBalance = customerData
      .filter(row => (row['Balance Receivable'] || 0) > 0)
      .map(row => ({
        customerName: row['Customer Name'],
        balanceReceivable: row['Balance Receivable'] || 0,
        totalSales: row['Total Sales'] || 0
      }))
      .sort((a, b) => b.balanceReceivable - a.balanceReceivable)
      .slice(0, 10);

    const customersByMonth = {};
    customerData.forEach(row => {
      if (row['Registration Date']) {
        const date = new Date(row['Registration Date']);
        const monthKey = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
        customersByMonth[monthKey] = (customersByMonth[monthKey] || 0) + 1;
      }
    });

    const salesByLocation = {};
    salesData.forEach(row => {
      const location = `${row['City'] || 'Unknown'}, ${row['State'] || 'Unknown'}`;
      salesByLocation[location] = (salesByLocation[location] || 0) + Number(row['Total Sales Price'] || 0);
    });
    const topLocations = Object.entries(salesByLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const report = {
      summary: {
        totalCustomers: totalCustomers,
        activeCustomers: activeCustomers,
        totalReceivable: totalReceivable,
        averageReceivable: totalCustomers > 0 ? totalReceivable / totalCustomers : 0
      },
      topCustomers: topCustomers,
      customersWithBalance: customersWithBalance,
      customersByMonth: customersByMonth,
      topLocations: topLocations,
      generatedAt: new Date().toISOString()
    };

    return report;
  } catch (error) {
    throw new Error('Error generating customer report: ' + error.message);
  }
}

/**
 * Export report to PDF (placeholder - would need additional setup)
 * @param {string} reportType
 * @param {Object} reportData
 * @param {string} email - User email for session check
 */
function exportReportToPDF(reportType, reportData, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { error: true, message: "Sesi berakhir", sessionExpired: true };
  }

  return {
    type: reportType,
    data: reportData,
    format: 'json',
    message: 'Data exported successfully. PDF generation requires additional setup.'
  };
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * SIMPLE TEST - Just get raw data without filter
 */
function testGetRawSalesData() {
  Logger.log('=== testGetRawSalesData ===');
  try {
    const data = getSheetDataAsObjects('RANGESD');
    Logger.log('Raw data rows: ' + data.length);
    if (data.length > 0) {
      Logger.log('First row: ' + JSON.stringify(data[0]));
      const dateVal = data[0]['SO Date'];
      Logger.log('SO Date value: ' + dateVal);
      Logger.log('SO Date type: ' + typeof dateVal);
      Logger.log('Parsed as Date: ' + new Date(dateVal).toISOString());
    }
    return data;
  } catch (err) {
    Logger.log('ERROR: ' + err.message);
    return null;
  }
}

/**
 * Test with NO filter (should use current month by default)
 */
function testGenerateSalesReportNoFilter() {
  const report = generateSalesReport(null);
  Logger.log('Test result: ' + JSON.stringify(report));
}

/**
 * Test dengan filter yang PASTI match dengan data (2025-11-26)
 */
function testGenerateSalesReportWithExactDateFilter() {
  try {
    Logger.log('=== Test with exact date filter (2025-11-26) ===');
    
    const filter = {
      startDate: '2025-11-01T00:00:00.000Z',
      endDate: '2025-11-30T23:59:59.999Z',
      period: 'month'
    };
    
    Logger.log('Filter: ' + JSON.stringify(filter));
    
    const report = generateSalesReport(filter);
    
    Logger.log('Report.error: ' + report.error);
    Logger.log('Report.message: ' + report.message);
    Logger.log('Summary: ' + JSON.stringify(report.summary));
    Logger.log('Transactions: ' + (report.detailTransactions ? report.detailTransactions.length : 0));
    
    if (report.detailTransactions && report.detailTransactions.length > 0) {
      Logger.log('SUCCESS - Got data!');
      Logger.log('First transaction: ' + JSON.stringify(report.detailTransactions[0]));
    } else {
      Logger.log('FAILED - No transactions returned');
    }
    
    return report;
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return { error: true, message: error.message };
  }
}

/**
 * List all sheets in the spreadsheet
 */
function listAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  Logger.log('Total sheets: ' + sheets.length);
  sheets.forEach(function(sheet, index) {
    const name = sheet.getName();
    const rows = sheet.getLastRow();
    const cols = sheet.getLastColumn();
    
    Logger.log((index + 1) + '. ' + name + ' - Rows: ' + rows + ', Cols: ' + cols);
    
    if (rows > 0 && cols > 0) {
      const headers = sheet.getRange(1, 1, 1, cols).getValues()[0];
      Logger.log('   Headers: ' + headers.join(' | '));
    }
  });
}
