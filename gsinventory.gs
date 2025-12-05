// Legacy functions for backward compatibility with frontend
function itemGetInventoryItems(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  const service = new InventoryService();
  const result = service.getAllItems();
  return result.success ? result.data : [];
}

function itemAddNewInventoryItem(item, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const service = new InventoryService();
    const result = service.create(item);
    return result;
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function itemUpdateInventoryItem(item, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const service = new InventoryService();
    const result = service.update(item.id, item);
    return result;
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function itemDeleteInventoryItem(itemId, email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { success: false, message: "Sesi berakhir", sessionExpired: true };
  }

  try {
    const service = new InventoryService();
    const result = service.delete(itemId);
    return result;
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Inventory data access and business logic
 */
class InventoryService {
  constructor() {
    this.sheetName = "InventoryItems";
    this.namedRange = "RANGEINVENTORYITEMS";
  }
  
  getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName(this.sheetName);
  }
  
  getRange() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getRangeByName(this.namedRange);
  }
  
  /**
   * Gets all inventory items with proper mapping and validation
   * @returns {Object} Simple response containing inventory items array
   */
  getAllItems() {
    try {
      const range = this.getRange();
      if (!range) {
        return { success: false, data: [], message: 'Named range not found' };
      }
      
      const data = range.getValues();
      const headers = data[0];
      const items = [];
      
      // Debug: Log headers
      Logger.log('Headers: ' + JSON.stringify(headers));
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === '') continue; // Skip empty rows
        
        // Debug: Log row data
        Logger.log('Row ' + i + ': ' + JSON.stringify(row));
        
        const item = this.mapSheetRowToInventoryItem(row, headers);
        Logger.log('Mapped item: ' + JSON.stringify(item));
        items.push(item);
      }
      
      Logger.log(`Successfully retrieved ${items.length} inventory items`);
      return { success: true, data: items, message: `Berhasil memuat ${items.length} barang` };
      
    } catch (error) {
      Logger.log(`Error getting inventory items: ${error.message}`);
      return { success: false, data: [], message: 'Gagal memuat data persediaan: ' + error.toString() };
    }
  }
  
  /**
   * Maps sheet row array to standardized InventoryItem
   * @param {Array} row - Sheet row as array
   * @param {Array} headers - Sheet headers
   * @returns {Object} Standardized inventory item
   * @private
   */
  mapSheetRowToInventoryItem(row, headers) {
    // Support multiple header formats (English/Indonesian)
    const getId = (headers, row) => {
      const idIndex = headers.findIndex(h => h === 'Item ID' || h === 'Kode Barang');
      return idIndex >= 0 ? row[idIndex] : '';
    };
    
    const getName = (headers, row) => {
      const nameIndex = headers.findIndex(h => h === 'Item Name' || h === 'Nama Barang');
      return nameIndex >= 0 ? row[nameIndex] : '';
    };
    
    const getCategory = (headers, row) => {
      const categoryIndex = headers.findIndex(h => h === 'Item Category' || h === 'Kategori Barang' || h === 'Item Type');
      return categoryIndex >= 0 ? row[categoryIndex] : '';
    };
    
    const getQuantity = (headers, row) => {
      // Total Stok hanya diambil dari kolom "Jumlah Barang" yang diisi manual
      // TIDAK lagi diambil dari "QTY Purchased" yang otomatis dari PO
      const quantityIndex = headers.findIndex(h => h === 'Jumlah Barang');
      const qtyValue = quantityIndex >= 0 ? row[quantityIndex] : 0;
      Logger.log('Jumlah Barang (Manual Stock) - Index: ' + quantityIndex + ', Raw Value: "' + qtyValue + '"');
      return parseInt(qtyValue) || 0;
    };
    
    const getUnitPrice = (headers, row) => {
      const priceIndex = headers.findIndex(h => h === 'Unit Price' || h === 'Harga Satuan');
      return priceIndex >= 0 ? parseFloat(row[priceIndex]) || 0 : 0;
    };
    
    const getTotalPrice = (headers, row) => {
      const totalIndex = headers.findIndex(h => h === 'Total Price' || h === 'Total Harga');
      return totalIndex >= 0 ? parseFloat(row[totalIndex]) || 0 : 0;
    };
    
    const id = getId(headers, row);
    const name = getName(headers, row);
    const category = getCategory(headers, row);
    const quantity = getQuantity(headers, row);
    const unitPrice = getUnitPrice(headers, row);
    const totalPrice = getTotalPrice(headers, row);
    const totalStock = quantity; // Total stock dari input manual, bukan dari PO
    const reorderLevel = 10; // Default reorder level
    
    return {
      id: id,
      name: name,
      category: category,
      quantity: quantity,
      totalStock: totalStock,
      unitPrice: unitPrice,
      totalPrice: totalPrice || (quantity * unitPrice),
      reorderLevel: reorderLevel,
      isLowStock: totalStock < reorderLevel,
      formattedUnitPrice: 'Rp' + unitPrice.toLocaleString('id-ID'),
      formattedTotalPrice: 'Rp' + (totalPrice || (quantity * unitPrice)).toLocaleString('id-ID')
    };
  }
  
  /**
   * Adds a new inventory item to the sheet
   * @param {Object} item - Inventory item data
   * @returns {Object} ApiResponse indicating success or failure
   */
  addNewItem(item) {
    try {
      // Validate input
      const validation = InputValidator.validateInventoryItem(item);
      if (!validation.isValid) {
        return ApiResponse.error(`Data tidak valid: ${validation.errors.join(', ')}`, null, validation.errors);
      }
      
      // Check for duplicate ID
      const existingItems = this.getAsObjects();
      const duplicateId = existingItems.find(existing => 
        (existing['Item ID'] || existing['Kode Barang'] || '') === item.id
      );
      
      if (duplicateId) {
        return ApiResponse.error(`Kode barang '${item.id}' sudah ada. Silakan gunakan kode yang berbeda.`);
      }
      
      const sheet = this.getSheet();
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Create new row based on sheet headers
      const newRow = this.createRowFromItem(item, headers);
      sheet.appendRow(newRow);
      
      Logger.log(`Successfully added inventory item: ${item.id} - ${item.name}`);
      return ApiResponse.success(
        { itemId: item.id }, 
        `Barang '${item.name}' berhasil ditambahkan`
      );
      
    } catch (error) {
      Logger.log(`Error adding inventory item: ${error.message}`);
      return ApiResponse.error('Gagal menambahkan barang', error);
    }
  }
  
  /**
   * Updates an existing inventory item
   * @param {Object} item - Updated item data
   * @returns {Object} ApiResponse indicating success or failure
   */
  updateItem(item) {
    try {
      // Validate input
      const validation = InputValidator.validateInventoryItem(item);
      if (!validation.isValid) {
        return ApiResponse.error(`Data tidak valid: ${validation.errors.join(', ')}`, null, validation.errors);
      }
      
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find item row by ID
      const itemRowIndex = this.findItemRowByID(data, item.id);
      if (itemRowIndex === -1) {
        return ApiResponse.error(`Barang dengan kode '${item.id}' tidak ditemukan`);
      }
      
      const sheetRowNumber = itemRowIndex + 1; // Convert to 1-based indexing
      
      // Update specific fields
      this.updateRowFields(sheet, sheetRowNumber, item, headers);
      
      Logger.log(`Successfully updated inventory item: ${item.id}`);
      return ApiResponse.success(
        { itemId: item.id }, 
        `Barang '${item.name}' berhasil diperbarui`
      );
      
    } catch (error) {
      Logger.log(`Error updating inventory item: ${error.message}`);
      return ApiResponse.error('Gagal memperbarui barang', error);
    }
  }
  
  /**
   * Deletes an inventory item from the sheet
   * @param {string} itemId - ID of item to delete
   * @returns {Object} ApiResponse indicating success or failure
   */
  deleteItem(itemId) {
    try {
      if (!itemId || itemId.trim() === '') {
        return ApiResponse.error('ID barang tidak valid');
      }
      
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      
      const itemRowIndex = this.findItemRowByID(data, itemId);
      if (itemRowIndex === -1) {
        return ApiResponse.error(`Barang dengan kode '${itemId}' tidak ditemukan`);
      }
      
      const itemName = data[itemRowIndex][this.getNameColumnIndex(data[0])];
      const sheetRowNumber = itemRowIndex + 1; // Convert to 1-based indexing
      
      sheet.deleteRow(sheetRowNumber);
      
      Logger.log(`Successfully deleted inventory item: ${itemId} - ${itemName}`);
      return ApiResponse.success(
        { itemId: itemId }, 
        `Barang '${itemName}' berhasil dihapus`
      );
      
    } catch (error) {
      Logger.log(`Error deleting inventory item: ${error.message}`);
      return ApiResponse.error('Gagal menghapus barang', error);
    }
  }
  
  /**
   * Gets items with low stock based on reorder level
   * @param {number} threshold - Custom threshold (optional)
   * @returns {Object} ApiResponse containing low stock items
   */
  getLowStockItems(threshold = null) {
    try {
      const allItemsResponse = this.getAllItems();
      if (!allItemsResponse.success) {
        return allItemsResponse;
      }
      
      const stockThreshold = threshold || 10;
      const lowStockItems = allItemsResponse.data.filter(item => 
        item.quantity < stockThreshold
      );
      
      return ApiResponse.success(
        lowStockItems, 
        `Ditemukan ${lowStockItems.length} barang dengan stok rendah`
      );
      
    } catch (error) {
      Logger.log(`Error getting low stock items: ${error.message}`);
      return ApiResponse.error('Gagal memuat barang stok rendah', error);
    }
  }
  
  /**
   * Helper method to create sheet row from item data
   * @param {Object} item - Item data
   * @param {string[]} headers - Sheet headers
   * @returns {any[]} Row data array
   * @private
   */
  createRowFromItem(item, headers) {
    const row = [];
    
      headers.forEach(header => {
        switch (header) {
          case 'Item ID':
          case 'Kode Barang':
            row.push(item.id || '');
            break;
          case 'Item Name':
          case 'Nama Barang':
            row.push(item.name || '');
            break;
          case 'Item Category':
          case 'Kategori Barang':
          case 'Item Type':
            row.push(item.category || '');
            break;
          case 'Jumlah Barang':
            // Total Stok - diisi manual, bukan dari PO
            row.push(parseInt(item.quantity) || 0);
            break;
          case 'Unit Price':
          case 'Harga Satuan':
            row.push(parseFloat(item.unitPrice) || 0);
            break;
          case 'Total Price':
          case 'Total Harga':
            row.push(parseFloat(item.totalPrice) || (item.quantity * item.unitPrice));
            break;
          case 'Reorder Level':
            row.push(parseInt(item.reorderLevel) || 10);
            break;
          case 'QTY Purchased':
            // Kolom ini TIDAK diisi dari form inventory (dikelola terpisah di PO)
            row.push(0);
            break;
          case 'QTY Sold':
            row.push(0); // Default for new items
            break;
          case 'Reorder Required':
            row.push((item.quantity < (item.reorderLevel || 10)) ? 'Yes' : 'No');
            break;
          default:
            row.push(''); // Empty for unknown columns
        }
      });    return row;
  }
  
  /**
   * Updates specific fields in a sheet row
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet
   * @param {number} rowNumber - 1-based row number
   * @param {Object} item - Item data
   * @param {string[]} headers - Sheet headers
   * @private
   */
  updateRowFields(sheet, rowNumber, item, headers) {
    headers.forEach((header, columnIndex) => {
      const columnNumber = columnIndex + 1; // Convert to 1-based indexing
      
      switch (header) {
        case 'Item Name':
        case 'Nama Barang':
          if (item.name !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(item.name);
          }
          break;
        case 'Item Category':
        case 'Kategori Barang':
        case 'Item Type':
          if (item.category !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(item.category);
          }
          break;
        case 'Jumlah Barang':
          // Total Stok - update dari input manual saja, bukan dari PO
          if (item.quantity !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(parseInt(item.quantity));
          }
          break;
        case 'Unit Price':
        case 'Harga Satuan':
          if (item.unitPrice !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(parseFloat(item.unitPrice));
          }
          break;
        case 'Total Price':
        case 'Total Harga':
          if (item.totalPrice !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(parseFloat(item.totalPrice));
          } else if (item.quantity !== undefined && item.unitPrice !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(item.quantity * item.unitPrice);
          }
          break;
        case 'Reorder Level':
          if (item.reorderLevel !== undefined) {
            sheet.getRange(rowNumber, columnNumber).setValue(parseInt(item.reorderLevel));
          }
          break;
      }
    });
  }
  
  /**
   * Finds row index of item by ID
   * @param {any[][]} data - Sheet data
   * @param {string} itemId - Item ID to find
   * @returns {number} Row index (-1 if not found)
   * @private
   */
  findItemRowByID(data, itemId) {
    if (data.length <= 1) return -1;
    
    const headers = data[0];
    const idColumnIndex = headers.findIndex(header => 
      header === 'Item ID' || header === 'Kode Barang'
    );
    
    if (idColumnIndex === -1) return -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumnIndex] === itemId) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Gets the name column index
   * @param {string[]} headers - Sheet headers
   * @returns {number} Column index for name field
   * @private
   */
  getNameColumnIndex(headers) {
    return headers.findIndex(header => 
      header === 'Item Name' || header === 'Nama Barang'
    ) || 1;
  }
  
  /**
   * Creates a new inventory item
   * @param {Object} item - Item data
   * @returns {Object} ApiResponse
   */
  create(item) {
    try {
      if (!item || !item.id || !item.name) {
        return { success: false, message: 'Data item tidak lengkap' };
      }
      
      const sheet = this.getSheet();
      const range = this.getRange();
      const data = range.getValues();
      const headers = data[0];
      
      // Create new row based on item data
      const newRow = this.createRowFromItem(item, headers);
      
      // Append to sheet
      sheet.appendRow(newRow);
      
      Logger.log(`Successfully created inventory item: ${item.id}`);
      return { success: true, message: 'Item berhasil ditambahkan', itemId: item.id };
      
    } catch (error) {
      Logger.log(`Error creating inventory item: ${error.message}`);
      return { success: false, message: 'Gagal menambahkan item: ' + error.toString() };
    }
  }
  
  /**
   * Updates an existing inventory item
   * @param {string} itemId - Item ID to update
   * @param {Object} item - Updated item data
   * @returns {Object} ApiResponse
   */
  update(itemId, item) {
    try {
      const sheet = this.getSheet();
      const range = this.getRange();
      const data = range.getValues();
      const headers = data[0];
      
      // Find item row
      const idColumnIndex = this.getIdColumnIndex(headers);
      for (let i = 1; i < data.length; i++) {
        if (data[i][idColumnIndex] === itemId) {
          const rowNumber = range.getRow() + i;
          this.updateRowFields(sheet, rowNumber, item, headers);
          
          Logger.log(`Successfully updated inventory item: ${itemId}`);
          return { success: true, message: 'Item berhasil diupdate', itemId: itemId };
        }
      }
      
      return { success: false, message: `Item tidak ditemukan dengan ID: ${itemId}` };
      
    } catch (error) {
      Logger.log(`Error updating inventory item: ${error.message}`);
      return { success: false, message: 'Gagal mengupdate item: ' + error.toString() };
    }
  }
  
  /**
   * Deletes an inventory item
   * @param {string} itemId - Item ID to delete
   * @returns {Object} ApiResponse
   */
  delete(itemId) {
    try {
      const sheet = this.getSheet();
      const range = this.getRange();
      const data = range.getValues();
      const headers = data[0];
      
      // Find item row
      const idColumnIndex = this.getIdColumnIndex(headers);
      for (let i = 1; i < data.length; i++) {
        if (data[i][idColumnIndex] === itemId) {
          const rowNumber = range.getRow() + i;
          sheet.deleteRow(rowNumber);
          
          Logger.log(`Successfully deleted inventory item: ${itemId}`);
          return { success: true, message: 'Item berhasil dihapus', itemId: itemId };
        }
      }
      
      return { success: false, message: `Item tidak ditemukan dengan ID: ${itemId}` };
      
    } catch (error) {
      Logger.log(`Error deleting inventory item: ${error.message}`);
      return { success: false, message: 'Gagal menghapus item: ' + error.toString() };
    }
  }
  
  /**
   * Gets ID column index from headers
   * @param {string[]} headers - Sheet headers  
   * @returns {number} Column index for ID field
   * @private
   */
  getIdColumnIndex(headers) {
    return headers.findIndex(header => 
      header === 'Item ID' || header === 'Kode Barang'
    );
  }
}
