/**
 * Dashboard Logic
 * Handles data retrieval and processing for the dashboard
 */

/**
 * Reads a named range and returns rows of objects keyed by header.
 * Falls back to sheet name if named range not found.
 */
function dashGetRows(rangeName) {
  const ss = SpreadsheetApp.getActive();
  let range = null;
  let sheet = null;
  
  // Sheet name mapping
  const sheetMap = {
    'RANGESD': 'SalesDetails',
    'RANGEPO': 'PurchaseOrders',
    'RANGECUSTOMERS': 'Customers',
    'RANGESUPPLIERS': 'Suppliers',
    'RANGEINVENTORYITEMS': 'InventoryItems'
  };
  
  // Try named range first
  try {
    range = ss.getRangeByName(rangeName);
    if (range) {
      const [headers, ...values] = range.getValues();
      return values.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    }
  } catch (e) {
    Logger.log('Named range ' + rangeName + ' not found, trying sheet name');
  }
  
  // Fall back to sheet name
  const sheetName = sheetMap[rangeName] || rangeName;
  sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log('Warning: Sheet "' + sheetName + '" not found for range ' + rangeName);
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    return [];
  }
  
  const range2 = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range2.getValues();
  const headers = values[0];
  
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

/**
 * Main entrypoint: returns all KPI values and chart data.
 */
function dashGetDashboardData(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return {
      success: false,
      message: "Sesi berakhir",
      sessionExpired: true,
      // Return empty data structure to prevent client errors before redirect
      totalSales: 0, totalPurchases: 0, netProfit: 0, totalInventoryValue: 0,
      topLocation: '', topItem: '',
      salesTrend: { dates: [], values: [] },
      salesByCategory: { labels: [], values: [] },
      purchaseByCategory: { years: [], series: [] }
    };
  }

  try {
    // Fetch detail rows
    const sales = dashGetRows('RANGESD');
    const purchases = dashGetRows('RANGEPO');
    const customers = dashGetRows('RANGECUSTOMERS');
    const suppliers = dashGetRows('RANGESUPPLIERS');
    const inventory = dashGetRows('RANGEINVENTORYITEMS');

    // Helper function to get value from multiple possible column names
    const getVal = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return Number(row[name]) || 0;
        }
      }
      return 0;
    };

    // Helper for string columns
    const getStr = (row, names) => {
      for (let name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      return 'Unknown';
    };

    // KPI 1 & 2: Sales and Purchases
    const totalSales = sales.reduce((sum, r) => sum + getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']), 0);
    const totalPurchases = purchases.reduce((sum, r) => sum + getVal(r, ['Total Purchase Price', 'Total Harga Pembelian', 'Total Amount', 'Total', 'Amount']), 0);
    const netProfit = totalSales - totalPurchases;

    // KPI 3: Inventory Value
    const totalInventoryValue = inventory.reduce((sum, r) => sum + getVal(r, ['Total Harga', 'Total Value', 'Total']), 0);

    // KPI 4 & 5: Receivable and Payable
    const totalReceivable = customers.reduce((sum, r) => sum + getVal(r, ['Balance Receivable', 'Balance Piutang', 'Receivable']), 0);
    const totalPayable = suppliers.reduce((sum, r) => sum + getVal(r, ['Balance Payable', 'Balance Hutang', 'Payable']), 0);

    // --- QUICK STATS ---
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const soThisMonth = sales.filter(r => {
      const d = new Date(getStr(r, ['SO Date', 'Tanggal SO', 'Date', 'Tanggal']));
      return d >= monthStart && d <= monthEnd;
    });
    const poThisMonth = purchases.filter(r => {
      const d = new Date(getStr(r, ['PO Date', 'Tanggal PO', 'Date', 'Tanggal']));
      return d >= monthStart && d <= monthEnd;
    });
    const numSOThisMonth = new Set(soThisMonth.map(r => getStr(r, ['SO ID', 'ID Penjualan', 'ID', 'Order ID']))).size;
    const numPOThisMonth = new Set(poThisMonth.map(r => getStr(r, ['PO ID', 'ID Pembelian', 'ID', 'Order ID']))).size;

    const totalSalesThisMonth = soThisMonth.reduce((sum, r) => sum + getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total', 'Total Penjualan']), 0);
    const avgOrderValue = numSOThisMonth > 0 ? totalSalesThisMonth / numSOThisMonth : 0;

    const qtySoldThisMonth = soThisMonth.reduce((sum, r) => sum + getVal(r, ['QTY Sold', 'Jumlah Terjual', 'Quantity', 'Qty']), 0);
    const totalQtyInventory = inventory.reduce((sum, r) => sum + getVal(r, ['Jumlah Barang', 'Quantity', 'QTY', 'Qty On Hand']), 0);
    const avgInventoryQty = inventory.length > 0 ? totalQtyInventory / inventory.length : 0;
    const turnoverInventory = avgInventoryQty > 0 ? qtySoldThisMonth / avgInventoryQty : 0;

    // KPI 6: Top Sales Location
    const salesByCity = {};
    sales.forEach(r => {
      const city = getStr(r, ['City', 'Kota', 'Location']);
      const sales_val = getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total']);
      salesByCity[city] = (salesByCity[city]||0) + sales_val;
    });
    const topLocation = Object.entries(salesByCity).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';

    // KPI 7: Top Selling Item
    const salesByItem = {};
    sales.forEach(r => {
      const item = getStr(r, ['Item Name', 'Nama Barang', 'Item Type', 'Item Category', 'Kategori Barang']);
      const sales_val = getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total']);
      salesByItem[item] = (salesByItem[item]||0) + sales_val;
    });
    const topItem = Object.entries(salesByItem).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';

    // Chart 1: Sales Trend
    const trendMap = {};
    sales.forEach(r => {
      const dateStr = getStr(r, ['SO Date', 'Tanggal SO', 'Date', 'Tanggal']);
      try {
        const d = new Date(dateStr);
        const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-01');
        const sales_val = getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total']);
        trendMap[key] = (trendMap[key]||0) + sales_val;
      } catch (e) {
        Logger.log('Error parsing date: ' + dateStr);
      }
    });
    const salesTrendDates = Object.keys(trendMap).sort();
    const salesTrendValues = salesTrendDates.map(d => trendMap[d]);

    // Chart 3: Sales By Category
    const catMap = {};
    sales.forEach(r => {
      const c = getStr(r, ['Item Category', 'Kategori Barang', 'Item Type']);
      if (c && c !== 'Unknown' && c !== '') {
        const sales_val = getVal(r, ['Total Sales Price', 'Total Harga Penjualan', 'Total']);
        catMap[c] = (catMap[c]||0) + sales_val;
      }
    });
    const totalCat = Object.values(catMap).reduce((a,b)=>a+b,0) || 1;
    const salesByCategory = {
      labels: Object.keys(catMap),
      values: Object.values(catMap).map(v => (v/totalCat)*100)
    };

    // Chart 6: Purchase By Category
    const purCatYear = {};
    purchases.forEach(r => {
      const dateStr = getStr(r, ['Date', 'Tanggal', 'PO Date', 'Tanggal PO']);
      try {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const c = getStr(r, ['Item Category', 'Kategori Barang', 'Item Type']);
        purCatYear[y] = purCatYear[y]||{};
        const pur_val = getVal(r, ['Total Purchase Price', 'Total Harga Pembelian', 'Total Amount', 'Total']);
        purCatYear[y][c] = (purCatYear[y][c]||0) + pur_val;
      } catch (e) {
        Logger.log('Error in purchase date: ' + e.message);
      }
    });
    const years = Object.keys(purCatYear).sort();
    const items = Array.from(new Set(purchases.map(r=>getStr(r, ['Item Category', 'Kategori Barang', 'Item Type']))));
    const series = items.map(item => ({
      name: item,
      data: years.map(y => purCatYear[y] ? (purCatYear[y][item]||0) : 0)
    }));
    const purchaseByCategory = { years, series };

    return {
      totalSales,
      totalPurchases,
      netProfit,
      totalInventoryValue,
      topLocation,
      topItem,
      salesTrend: { dates: salesTrendDates, values: salesTrendValues },
      salesByCategory,
      purchaseByCategory,
      numSOThisMonth,
      numPOThisMonth,
      avgOrderValue,
      turnoverInventory
    };
  } catch (error) {
    Logger.log('Error in dashGetDashboardData: ' + error.message);
    return {
      totalSales: 0,
      totalPurchases: 0,
      netProfit: 0,
      totalInventoryValue: 0,
      topLocation: '',
      topItem: '',
      salesTrend: { dates: [], values: [] },
      salesByCategory: { labels: [], values: [] },
      purchaseByCategory: { years: [], series: [] }
    };
  }
}