/**
 * Entry point: show sidebar/modal
 */
function soShowSalesUI() {
  const html = HtmlService.createTemplateFromFile('sales')
      .evaluate()
      .setTitle('Sales Orders')
      .setWidth(1200).setHeight(700);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Helper: get named range data as array of objects
 * Improved to handle named ranges that only include header row
 */
function soGetRangeDataAsObjects(rangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName(rangeName);
  if (!range) {
    throw new Error(`Named range "${rangeName}" not found. Please verify it exists in your sheet.`);
  }
  
  // Get the sheet and expand to all data
  const sheet = range.getSheet();
  const startRow = range.getRow();
  const startCol = range.getColumn();
  const numCols = range.getNumColumns();
  
  // Get last row with data in the sheet
  const lastRow = sheet.getLastRow();
  
  if (lastRow < startRow + 1) {
    // No data rows, only header
    return [];
  }
  
  // Read from header row to last row with data
  const expandedRange = sheet.getRange(startRow, startCol, lastRow - startRow + 1, numCols);
  const values = expandedRange.getValues();
  
  if (values.length < 2) {
    // only header row or empty range
    return [];
  }
  
  const headers = values[0];
  const rows    = values.slice(1)
    .filter(r => r.some(cell => cell !== '' && cell !== null));  // drop blank rows

  return rows.map(r => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = r[i]);
    return obj;
  });
}

/**
 * Fetch all Sales Details (one row per item sold)
 */
function soGetAllSO(email) {
  checkServerSession(email);
  const ss       = SpreadsheetApp.getActive();
  const tz       = ss.getSpreadsheetTimeZone();
  const sdData   = soGetRangeDataAsObjects('RANGESD');
  
  return sdData.map(row => {
    if (row['SO Date'] instanceof Date) {
      row['SO Date'] = Utilities.formatDate(row['SO Date'], tz, 'MM/dd/yyyy');
    }
    return row;
  });
}

/**
 * Fetch customers list
 */
function soGetCustomers(email) {
  checkServerSession(email);
  try {
    return soGetRangeDataAsObjects('RANGECUSTOMERS');
  } catch (err) {
    // log and rethrow so you see it in Execution log
    console.error(err);
    throw new Error('soGetCustomers failed: ' + err.message);
  }
}

/**
 * Fetch inventory items list
 */
function soGetInventoryItems(email) {
  checkServerSession(email);
  try {
    return soGetRangeDataAsObjects('RANGEINVENTORYITEMS');
  } catch (err) {
    console.error(err);
    throw new Error('soGetInventoryItems failed: ' + err.message);
  }
}
/**
 * Fetch details for one SO
 */
function soGetSODetails(soID, email) {
  checkServerSession(email);
  const ss       = SpreadsheetApp.getActive();
  const tz       = ss.getSpreadsheetTimeZone();
  const raw      = soGetRangeDataAsObjects('RANGESD')
                     .filter(r => r['SO ID'] === soID);
  return raw.map(row => {
    if (row['SO Date'] instanceof Date) {
      row['SO Date'] = Utilities.formatDate(row['SO Date'], tz, 'MM/dd/yyyy');
    }
    return row;
  });
}

/**
 * Generate unique SO ID
 */
function soGenerateSOID(email) {
  checkServerSession(email);
  const data = soGetRangeDataAsObjects('RANGESD');
  const existing = data.map(r=>r['SO ID']);
  let id;
  do {
    id = 'SO' + String(Math.floor(10000 + Math.random()*90000));
  } while (existing.indexOf(id) !== -1);
  return id;
}

/**
 * Generate unique Detail ID
 */
function soGenerateSalesDetailID(email) {
  checkServerSession(email);
  const data = soGetRangeDataAsObjects('RANGESD');
  const existing = data.map(r=>r['Detail ID']);
  let id;
  do {
    id = 'D' + String(Math.floor(10000 + Math.random()*90000));
  } while (existing.indexOf(id) !== -1);
  return id;
}

/**
 * Save New SO: master + details + reduce stock + recalc all
 */
function soSaveNewSO(payload, email) {
  checkServerSession(email);
  const ss = SpreadsheetApp.getActive();
  const soRange = ss.getRangeByName('RANGESO');
  const sdRange = ss.getRangeByName('RANGESD');
  if (!soRange || !sdRange) {
    throw new Error('Named ranges RANGESO or RANGESD not found');
  }
  
  const soSheet = soRange.getSheet();
  const sdSheet = sdRange.getSheet();
  
  // Get headers to determine column order and structure
  const soHeaders = soRange.getValues()[0];
  const sdHeaders = sdRange.getValues()[0];
  
  Logger.log('SO Headers (' + soHeaders.length + '): ' + JSON.stringify(soHeaders));
  Logger.log('SD Headers (' + sdHeaders.length + '): ' + JSON.stringify(sdHeaders));
  
  // Step 1: append master row to SalesOrders sheet
  const master = payload.master;
  Logger.log('Saving SO Master: ' + JSON.stringify(master));
  
  const masterRow = [
    new Date(master.date),    // SO Date (col 1)
    master.soID,              // SO ID (col 2)
    master.custID,            // Customer ID (col 3)
    master.custNm,            // Customer Name (col 4)
    master.inv || '',         // Invoice Num (col 5) - opsional
    master.state || '',       // State (col 6) - opsional
    master.city || '',        // City (col 7) - opsional
    0,                        // Total SO Amount (col 8) - calculated later
    0,                        // Total Received (col 9)
    0,                        // SO Balance (col 10)
    '',                       // Receipt Status (col 11)
    ''                        // Shipping Status (col 12)
  ];
  
  Logger.log('Master row to append (' + masterRow.length + ' cols): ' + JSON.stringify(masterRow));
  
  // Append to the actual sheet, not the named range
  soSheet.appendRow(masterRow);

  // Step 2: append each detail row to SalesDetails sheet & reduce stock
  Logger.log('Number of details to save: ' + payload.details.length);
  
  payload.details.forEach((d, idx) => {
    Logger.log('Detail ' + idx + ': ' + JSON.stringify(d));
    Logger.log('  QTY Sold: ' + d['QTY Sold']);
    Logger.log('  Unit Price: ' + d['Unit Price']);
    Logger.log('  Total Sales Price: ' + d['Total Sales Price']);
    
    // Map data to match sheet columns (flexible mapping)
    const rowData = [];
    sdHeaders.forEach(header => {
      let value = '';
      
      // Map based on header name
      switch(header) {
        case 'SO Date':
          value = new Date(d['SO Date']);
          break;
        case 'SO ID':
          value = d['SO ID'];
          break;
        case 'Detail ID':
          value = d['Detail ID'];
          break;
        case 'Customer ID':
          value = d['Customer ID'] || '';
          break;
        case 'Customer Name':
          value = d['Customer Name'];
          break;
        case 'State':
          value = d['State'] || '';
          break;
        case 'City':
          value = d['City'] || '';
          break;
        case 'Invoice Num':
          value = d['Invoice Num'] || '';
          break;
        case 'Item ID':
        case 'Kode Barang':
          value = d['Item ID'] || '';
          break;
        case 'Item Category':
        case 'Kategori Barang':
          value = d['Item Category'] || '';
          break;
        case 'Item Name':
        case 'Nama Barang':
          value = d['Item Name'];
          break;
        case 'QTY Sold':
        case 'Jumlah Terjual':
          value = parseFloat(d['QTY Sold']) || 0;
          break;
        case 'Unit Price':
        case 'Harga Satuan':
          value = parseFloat(d['Unit Price']) || 0;
          break;
        case 'Total Sales Price':
        case 'Total Harga Penjualan':
          value = parseFloat(d['Total Sales Price']) || 0;
          break;
        default:
          value = '';
      }
      
      rowData.push(value);
    });
    
    Logger.log('Detail row to append (' + rowData.length + ' cols): ' + JSON.stringify(rowData));
    
    // Append to the actual sheet, not the named range
    sdSheet.appendRow(rowData);
    
    // Reduce stock in inventory
    soReduceInventoryStock(d['Item ID'], d['QTY Sold']);
  });

  // Step 3: recalc all metrics
  Logger.log('Running recalculations...');
  try {
    _soRecalcAll();
    Logger.log('SO saved successfully!');
  } catch (e) {
    Logger.log('Recalc error (non-critical): ' + e.message);
    // Don't throw - data is already saved
  }
}

/**
 * Reduce inventory stock when item is sold
 * @param {string} itemCode - Kode Barang
 * @param {number} qtySold - Quantity sold
 */
function soReduceInventoryStock(itemCode, qtySold) {
  try {
    if (!itemCode || !qtySold || qtySold <= 0) {
      Logger.log('Invalid item code or quantity for stock reduction');
      return;
    }
    
    const ss = SpreadsheetApp.getActive();
    const invRange = ss.getRangeByName('RANGEINVENTORY');
    
    if (!invRange) {
      Logger.log('RANGEINVENTORY not found, trying RANGEINVENTORYITEMS...');
      const invRangeAlt = ss.getRangeByName('RANGEINVENTORYITEMS');
      if (!invRangeAlt) {
        Logger.log('Warning: No inventory range found, stock not reduced');
        return;
      }
      return soReduceStockFromRange(invRangeAlt, itemCode, qtySold);
    }
    
    soReduceStockFromRange(invRange, itemCode, qtySold);
    
  } catch (error) {
    Logger.log('Error reducing stock: ' + error.toString());
    // Don't throw - sale should still be saved even if stock update fails
  }
}

/**
 * Helper function to reduce stock from a specific range
 */
function soReduceStockFromRange(range, itemCode, qtySold) {
  const sheet = range.getSheet();
  const values = range.getValues();
  const headers = values[0];
  
  // Find column indexes (support both English and Indonesian)
  const codeCol = headers.indexOf('Kode Barang') >= 0 ? 
    headers.indexOf('Kode Barang') : headers.indexOf('Item ID');
  const stockCol = headers.indexOf('Jumlah Barang') >= 0 ? 
    headers.indexOf('Jumlah Barang') : (headers.indexOf('Stok') >= 0 ? headers.indexOf('Stok') : headers.indexOf('Stock'));
  
  if (codeCol < 0 || stockCol < 0) {
    Logger.log('Warning: Required columns not found in inventory');
    return;
  }
  
  // Find the item row
  const startRow = range.getRow();
  const startCol = range.getColumn();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][codeCol] === itemCode) {
      const currentStock = parseFloat(values[i][stockCol]) || 0;
      const newStock = currentStock - qtySold;
      
      Logger.log(`Reducing stock for ${itemCode}: ${currentStock} -> ${newStock}`);
      
      // Update the stock cell
      sheet.getRange(startRow + i, startCol + stockCol).setValue(newStock);
      return;
    }
  }
  
  Logger.log(`Warning: Item ${itemCode} not found in inventory`);
}

  /**
   * Update existing SalesDetails rows, then recalc all metrics
   */
 /**
 * Updates only the specified detail rows by Detail ID.
 */
function soUpdateSODetails(rows, email) {
  checkServerSession(email);
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sdRange = ss.getRangeByName('RANGESD');
  if (!sdRange) throw new Error('Named range "RANGESD" not found.');

  const sheet     = sdRange.getSheet();
  const startRow  = sdRange.getRow();
  const startCol  = sdRange.getColumn();
  const allValues = sdRange.getValues();
  const headers   = allValues[0];
  const data      = allValues.slice(1);
  const detailCol = headers.indexOf('Detail ID');

  rows.forEach(upd => {
    const did = upd['Detail ID'];
    // find the row index in data
    const i = data.findIndex(r => r[detailCol] === did);
    if (i < 0) return;  // not found

    const sheetRow = startRow + 1 + i;
    // update only the fields that arrived
    Object.keys(upd).forEach(colName => {
      const colIdx = headers.indexOf(colName);
      if (colIdx < 0) return;

      let value = upd[colName];
      // convert date
      if (colName === 'SO Date') {
        value = new Date(value);
      }
      // numeric columns
      else if ([
        'QTY Sold','Unit Price','Total Sales Price'
      ].includes(colName)) {
        value = parseFloat(value) || 0;
      }
      // write the single cell
      sheet.getRange(sheetRow, startCol + colIdx).setValue(value);
    });
  });

  // recalc all dependent metrics
  _soRecalcAll();
}

  /**
   * Delete a single SalesDetails row by Detail ID, then recalc all
   */
  function soDeleteDetail(detailID, email) {
    checkServerSession(email);
    const ss      = SpreadsheetApp.getActive();
    const sdRange = ss.getRangeByName('RANGESD');
    const sheet   = sdRange.getSheet();
    const startRow= sdRange.getRow();
    const vals    = sdRange.getValues();
    const headers = vals[0];
    const data    = vals.slice(1);
    const colIdx  = headers.indexOf('Detail ID');

    const rowIdx = data.findIndex(r => r[colIdx] === detailID);
    if (rowIdx > -1) {
      sheet.deleteRow(startRow + 1 + rowIdx);
    }

    _soRecalcAll();
  }

  /**
   * Internal: run all recalculation routines in order
   */
  function _soRecalcAll() {
    soCalcTotalSOAmount();
    soCalcSOBalance();
    soUpdateQtySold();
    soCalcRemainingQty();
    soCalcReorderRequired();
    soCalcTotalSales();
    soCalcBalanceReceivable();
  }

  /**
   * Sum Total Sales Price per SO and write to SalesOrders[Total SO Amount]
   */
  function soCalcTotalSOAmount() {
    try {
      const ss = SpreadsheetApp.getActive();
      const soSheet = ss.getSheetByName('SalesOrders');
      if (!soSheet) {
        Logger.log('SalesOrders sheet not found');
        return;
      }
      
      const lastRow = soSheet.getLastRow();
      if (lastRow < 2) {
        Logger.log('No data in SalesOrders');
        return; // No data
      }
      
      // Read headers from row 1
      const headers = soSheet.getRange(1, 1, 1, 12).getValues()[0];
      const soIDCol = headers.indexOf('SO ID') + 1; // Convert to 1-based
      const totalCol = headers.indexOf('Total SO Amount') + 1;
      
      Logger.log('SalesOrders - SO ID col: ' + soIDCol + ', Total SO Amount col: ' + totalCol);
      
      if (soIDCol < 1 || totalCol < 1) {
        Logger.log('Required columns not found in SalesOrders');
        Logger.log('Headers: ' + JSON.stringify(headers));
        return;
      }
      
      // Get all sales details
      const sdData = soGetRangeDataAsObjects('RANGESD');
      Logger.log('Total SalesDetails records: ' + sdData.length);
      if (sdData.length > 0) {
        Logger.log('Sample detail: ' + JSON.stringify(sdData[0]));
      }
      
      // Process each SO row (starting from row 2)
      for (let i = 2; i <= lastRow; i++) {
        const soID = soSheet.getRange(i, soIDCol).getValue();
        if (!soID) continue;
        
        // Sum all details for this SO
        const details = sdData.filter(d => d['SO ID'] === soID);
        Logger.log('SO ' + soID + ' has ' + details.length + ' detail rows');
        
        const sum = details.reduce((acc, cur) => {
          const salesPrice = cur['Total Sales Price'] || 0;
          Logger.log('  Detail Total Sales Price: ' + salesPrice);
          return acc + (parseFloat(salesPrice) || 0);
        }, 0);
        
        Logger.log('SO ' + soID + ' total: ' + sum);
        
        // Write to Total SO Amount column
        soSheet.getRange(i, totalCol).setValue(sum);
      }
      
      Logger.log('Total SO Amount calculated successfully');
    } catch (e) {
      Logger.log('Error in soCalcTotalSOAmount: ' + e.message);
      Logger.log('Stack: ' + e.stack);
      throw e;
    }
  }

  /**
   * Calculate SO Balance = Total SO Amount - Total Received
   */
  function soCalcSOBalance() {
    try {
      const ss = SpreadsheetApp.getActive();
      const soSheet = ss.getSheetByName('SalesOrders');
      if (!soSheet) return;
      
      const lastRow = soSheet.getLastRow();
      if (lastRow < 2) return;
      
      const headers = soSheet.getRange(1, 1, 1, 12).getValues()[0];
      const totalCol = headers.indexOf('Total SO Amount') + 1;
      const receivedCol = headers.indexOf('Total Received') + 1;
      const balCol = headers.indexOf('SO Balance') + 1;
      
      if (totalCol < 1 || receivedCol < 1 || balCol < 1) return;
      
      for (let i = 2; i <= lastRow; i++) {
        const total = soSheet.getRange(i, totalCol).getValue() || 0;
        const received = soSheet.getRange(i, receivedCol).getValue() || 0;
        const balance = total - received;
        
        soSheet.getRange(i, balCol).setValue(balance);
      }
      
      Logger.log('SO Balance calculated successfully');
    } catch (e) {
      Logger.log('Error in soCalcSOBalance: ' + e.message);
      throw e;
    }
  }

  /**
   * Update InventoryItems[QTY Sold] via SUMIF on SalesDetails[QTY Sold]
   */
  function soUpdateQtySold() {
    const ss      = SpreadsheetApp.getActive();
    const invRange= ss.getRangeByName('RANGEINVENTORYITEMS');
    const sheet   = invRange.getSheet();
    const startRow= invRange.getRow();
    const vals    = invRange.getValues();
    const headers = vals[0];
    const data    = vals.slice(1);

    // Support both English and Indonesian column names
    const itemIDCol = headers.indexOf('Item ID') >= 0 ? headers.indexOf('Item ID') : headers.indexOf('Kode Barang');
    const soldCol   = headers.indexOf('QTY Sold') >= 0 ? headers.indexOf('QTY Sold') : headers.indexOf('Jumlah Terjual');
    const sdData    = soGetRangeDataAsObjects('RANGESD');

    data.forEach((row, i) => {
      const id  = row[itemIDCol];
      const sum = sdData
        .filter(d => (d['Item ID'] || d['Kode Barang']) === id)
        .reduce((acc, cur) => {
          const qtySold = cur['QTY Sold'] || cur['Jumlah Terjual'] || 0;
          return acc + (parseFloat(qtySold) || 0);
        }, 0);
      sheet
        .getRange(startRow + 1 + i, invRange.getColumn() + soldCol)
        .setValue(sum);
    });
  }

  /**
   * Calculate Remaining QTY = QTY Purchased - QTY Sold
   */
  function soCalcRemainingQty() {
    const ss        = SpreadsheetApp.getActive();
    const invRange  = ss.getRangeByName('RANGEINVENTORYITEMS');
    const sheet     = invRange.getSheet();
    const startRow  = invRange.getRow();
    const vals      = invRange.getValues();
    const headers   = vals[0];
    const data      = vals.slice(1);

    const purchasedCol = headers.indexOf('QTY Purchased');
    const soldCol      = headers.indexOf('QTY Sold');
    const remainCol    = headers.indexOf('Remaining QTY');

    data.forEach((row, i) => {
      const rem = (row[purchasedCol] || 0) - (row[soldCol] || 0);
      sheet
        .getRange(startRow + 1 + i, invRange.getColumn() + remainCol)
        .setValue(rem);
    });
  }

  /**
   * Flag Reorder Required if Remaining QTY < Reorder Level
   */
  function soCalcReorderRequired() {
    const ss         = SpreadsheetApp.getActive();
    const invRange   = ss.getRangeByName('RANGEINVENTORYITEMS');
    const sheet      = invRange.getSheet();
    const startRow   = invRange.getRow();
    const vals       = invRange.getValues();
    const headers    = vals[0];
    const data       = vals.slice(1);

    const remainCol  = headers.indexOf('Remaining QTY');
    const levelCol   = headers.indexOf('Reorder Level');
    const reqCol     = headers.indexOf('Reorder Required');

    data.forEach((row, i) => {
      const flag = (row[remainCol] < row[levelCol]) ? 'Yes' : 'No';
      sheet
        .getRange(startRow + 1 + i, invRange.getColumn() + reqCol)
        .setValue(flag);
    });
  }

  /**
   * Sum Total Sales per Customer, write to Customers[Total Sales]
   */
  function soCalcTotalSales() {
    const ss         = SpreadsheetApp.getActive();
    const custRange  = ss.getRangeByName('RANGECUSTOMERS');
    const sheet      = custRange.getSheet();
    const startRow   = custRange.getRow();
    const vals       = custRange.getValues();
    const headers    = vals[0];
    const data       = vals.slice(1);

    const custIDCol      = headers.indexOf('Customer ID');
    const totalSalesCol  = headers.indexOf('Total Sales');
    const sdData         = soGetRangeDataAsObjects('RANGESD');

    data.forEach((row, i) => {
      const cid = row[custIDCol];
      const sum = sdData
        .filter(d => d['Customer ID'] === cid)
        .reduce((acc, cur) => {
          const salesPrice = cur['Total Sales Price'] || cur['Total Harga Penjualan'] || 0;
          return acc + (parseFloat(salesPrice) || 0);
        }, 0);
      sheet
        .getRange(startRow + 1 + i, custRange.getColumn() + totalSalesCol)
        .setValue(sum);
    });
  }

  /**
   * Calculate Balance Receivable = Total Sales - Total Receipts
   */
  function soCalcBalanceReceivable() {
    const ss         = SpreadsheetApp.getActive();
    const custRange  = ss.getRangeByName('RANGECUSTOMERS');
    const sheet      = custRange.getSheet();
    const startRow   = custRange.getRow();
    const vals       = custRange.getValues();
    const headers    = vals[0];
    const data       = vals.slice(1);

    const totalSalesCol   = headers.indexOf('Total Sales');
    const receiptsCol     = headers.indexOf('Total Receipts');
    const balanceRecCol   = headers.indexOf('Balance Receivable');

    data.forEach((row, i) => {
      const bal = (row[totalSalesCol] || 0) - (row[receiptsCol] || 0);
      sheet
        .getRange(startRow + 1 + i, custRange.getColumn() + balanceRecCol)
        .setValue(bal);
    });
  }