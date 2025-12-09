/**
 * Helper: read a named range as objects. Formats “Trx Date” as MM/dd/yyyy.
 */
function _ptGetRangeData(name) {
  const ss = SpreadsheetApp.getActive();
  const rg = ss.getRangeByName(name);
  if (!rg) throw new Error(`Named range "${name}" not found`);
  const vals = rg.getValues();
  if (vals.length < 2) return [];
  const hdr = vals[0];

  return vals.slice(1)
    .filter(r => r.some(c => c !== '' && c != null))
    .map(r => {
      const obj = {};
      hdr.forEach((h, i) => {
        let v = r[i];
        // If this header contains "Date", format it
        if (h.toLowerCase().includes('date') && v instanceof Date) {
          v = Utilities.formatDate(v, ss.getSpreadsheetTimeZone(), 'MM/dd/yyyy');
        }
        obj[h] = v;
      });
      return obj;
    });
}


// Server‐side getters
function ptGetSuppliers(email) {
  checkServerSession(email);
  return _ptGetRangeData('RANGESUPPLIERS');
}

function ptGetPO(email) {
  checkServerSession(email);
  const data = _ptGetRangeData('RANGEPO');
  // Log every row’s Supplier Name and PO ID
  data.forEach(r => Logger.log('PTPO row:', r['Supplier Name'], r['PO ID']));
  Logger.log('ptGetPO total rows:', data.length);
  return data;
}

function ptGetDimensions(email) {
  // TODO: remove-after-review - fungsi ini tidak dipanggil di manapun
  // @deprecated Unused function
  checkServerSession(email);
  return _ptGetRangeData('RANGEDIMENSIONS');
}

function ptGetAllPayments(email) {
  checkServerSession(email);
  return _ptGetRangeData('RANGEPAYMENTS');
}

/**
 * Generate unique PTxxxxx Trx ID
 */
function ptGenerateTrxID(email) {
  checkServerSession(email);
  const existing = _ptGetRangeData('RANGEPAYMENTS').map(r => r['Trx ID']);
  let id;
  do {
    id = 'PT' + Math.floor(10000 + Math.random() * 90000);
  } while (existing.includes(id));
  return id;
}

/**
 * Save new payment, then recalc.
 */
function ptSaveNewPayment(rec, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Sesi berakhir");
  }

  const ss  = SpreadsheetApp.getActive();
  const rg  = ss.getRangeByName('RANGEPAYMENTS');
  const sh  = rg.getSheet();

  sh.appendRow([
    new Date(rec['Trx Date']),
    rec['Trx ID'],
    rec['Supplier ID'],
    rec['Supplier Name'],
    rec['State'],
    rec['City'],
    rec['PO ID'],
    rec['No Rek'],
    rec['PMT Mode'],
    rec['Amount Paid']
  ]);

  // Recalc pipeline
  calcpopayments();
  calctotalpayments();
  poUpdateBalancePayable();
  updatePaymentStatus();
}

/**
 * Update existing payment by Trx ID
 */
function ptUpdatePayment(rec, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Sesi berakhir");
  }

  const ss  = SpreadsheetApp.getActive();
  const rg  = ss.getRangeByName('RANGEPAYMENTS');
  const sh  = rg.getSheet();
  const vs  = rg.getValues(), hdr = vs[0], dt = vs.slice(1);
  const col = hdr.indexOf('Trx ID');
  const idx = dt.findIndex(r => r[col] === rec['Trx ID']);
  if (idx < 0) throw new Error('Payment not found');
  const row = rg.getRow() + idx + 1;

  Object.keys(rec).forEach(h => {
    const ci = hdr.indexOf(h);
    if (ci >= 0) {
      let v = rec[h];
      if (h==='Trx Date')    v = new Date(v);
      if (h==='Amount Paid') v = parseFloat(v) || 0;
      sh.getRange(row, rg.getColumn()+ci).setValue(v);
    }
  });

  calcpopayments();
  calctotalpayments();
  poUpdateBalancePayable();
  updatePaymentStatus();
}
  
/**
 * Delete payment row by Trx ID
 */
function ptDeletePayment(trxID, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Sesi berakhir");
  }

  const ss  = SpreadsheetApp.getActive();
  const rg  = ss.getRangeByName('RANGEPAYMENTS');
  const sh  = rg.getSheet();
  const vs  = rg.getValues(), hdr = vs[0], dt = vs.slice(1);
  const idx = dt.findIndex(r => r[hdr.indexOf('Trx ID')] === trxID);
  if (idx < 0) return;
  sh.deleteRow(rg.getRow() + idx + 1);

  calcpopayments();
  calctotalpayments();
  poUpdateBalancePayable();
  updatePaymentStatus();
}

/**
 * Sum “Amount Paid” by PO → PurchaseOrders[Total Paid]
 */
function calcpopayments() {
  const ss   = SpreadsheetApp.getActive();
  const poR  = ss.getRangeByName('RANGEPO');
  if (!poR) return;
  
  const sh   = poR.getSheet();
  const vs   = poR.getValues(), hdr = vs[0], dt = vs.slice(1);
  const ciPO   = hdr.indexOf('PO ID');
  const ciPaid = hdr.indexOf('Total Paid');
  
  if (ciPO < 0 || ciPaid < 0) {
    Logger.log('calcpopayments: Required columns not found');
    return;
  }

  const pays = _ptGetRangeData('RANGEPAYMENTS');
  const map  = pays.reduce((m,r) => {
    const po = r['PO ID'], amt = parseFloat(r['Amount Paid'])||0;
    m[po] = (m[po]||0) + amt;
    return m;
  }, {});

  dt.forEach((row,i) => {
    if (row[ciPO]) {
      sh.getRange(poR.getRow()+1+i, poR.getColumn()+ciPaid)
        .setValue(map[row[ciPO]]||0);
    }
  });
}

/**
 * Sum Total Paid by Supplier → Suppliers[Total Payments]
 */
function calctotalpayments() {
  const ss    = SpreadsheetApp.getActive();
  const supR  = ss.getRangeByName('RANGESUPPLIERS');
  if (!supR) return;
  
  const sh    = supR.getSheet();
  const vs    = supR.getValues(), hdr = vs[0], dt = vs.slice(1);
  const ciSup = hdr.indexOf('Supplier ID');
  const ciTot = hdr.indexOf('Total Payments');
  
  if (ciSup < 0 || ciTot < 0) {
    Logger.log('calctotalpayments: Required columns not found');
    return;
  }

  const poData = ss.getRangeByName('RANGEPO').getValues();
  const poHdr  = poData[0];
  const poDt   = poData.slice(1);
  const ciPoID   = poHdr.indexOf('Supplier ID');
  const ciPoPaid = poHdr.indexOf('Total Paid');
  
  if (ciPoID < 0 || ciPoPaid < 0) {
    Logger.log('calctotalpayments: Required PO columns not found');
    return;
  }

  const map = poDt.reduce((m,r) => {
    const s  = r[ciPoID], paid = parseFloat(r[ciPoPaid])||0;
    if (s) m[s] = (m[s]||0) + paid;
    return m;
  }, {});

  dt.forEach((row,i) => {
    if (row[ciSup]) {
      sh.getRange(supR.getRow()+1+i, supR.getColumn()+ciTot)
        .setValue(map[row[ciSup]]||0);
    }
  });
}


function updatePaymentStatus() {
  const ss    = SpreadsheetApp.getActive();
  const rng   = ss.getRangeByName('RANGEPO');
  if (!rng) {
    Logger.log('updatePaymentStatus: RANGEPO not found');
    return;
  }
  
  const sheet = rng.getSheet();
  const vals  = rng.getValues();
  if (vals.length < 2) return;  // no data rows
  
  const headers      = vals[0];
  const dataRows     = vals.slice(1);
  const colTotalAmt  = headers.indexOf('Total Amount');
  const colTotalPaid = headers.indexOf('Total Paid');
  const colStatus    = headers.indexOf('PMT Status');
  
  if (colTotalAmt < 0 || colTotalPaid < 0 || colStatus < 0) {
    Logger.log('updatePaymentStatus: Required columns not found');
    return;
  }
  
  dataRows.forEach((row, i) => {
    // Parse amounts
    const totalAmt = parseFloat(row[colTotalAmt]) || 0;
    let paid = row[colTotalPaid];
    paid = (paid === '' || paid == null || isNaN(paid)) 
             ? 0 
             : parseFloat(paid);
    
    // Determine status
    let status;
    if (paid <= 0) {
      status = 'Pending';
    } else if (paid < totalAmt) {
      status = 'Partial Payment';
    } else {
      status = 'Paid';
    }
    
    // Write back into the sheet
    sheet
      .getRange(rng.getRow() + 1 + i, rng.getColumn() + colStatus)
      .setValue(status);
  });
}