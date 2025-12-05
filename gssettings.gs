/**
 * Settings Backend Functions
 * Handles backup and system operations
 */

/**
 * Create Excel backup of entire database
 * Returns download URL for the Excel file
 */
function settingsCreateExcelBackup(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Sesi berakhir");
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    const backupName = 'RuangStok_Backup_' + timestamp;
    
    // Create a copy of the spreadsheet
    const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
    
    // Convert to Excel format
    const blob = backupFile.getBlob();
    const excelBlob = blob.setName(backupName + '.xlsx');
    
    // Save as Excel in Drive
    const excelFile = DriveApp.createFile(excelBlob);
    
    // Delete the Google Sheets copy (we only want Excel)
    backupFile.setTrashed(true);
    
    // Make file accessible
    excelFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return download URL
    return excelFile.getDownloadUrl();
    
  } catch (error) {
    console.error('Error creating Excel backup:', error);
    throw new Error('Gagal membuat backup: ' + error.message);
  }
}

/**
 * Alternative: Export all sheets to Excel using export URL
 */
function settingsCreateExcelBackupAlternative(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    throw new Error("Sesi berakhir");
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssId = ss.getId();
    
    // Generate Excel export URL
    const exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
    
    return exportUrl;
    
  } catch (error) {
    console.error('Error generating export URL:', error);
    throw new Error('Gagal membuat link backup: ' + error.message);
  }
}

/**
 * Get database information
 */
function settingsGetDatabaseInfo(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return null;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const info = {
      name: ss.getName(),
      id: ss.getId(),
      url: ss.getUrl(),
      totalSheets: sheets.length,
      sheetNames: sheets.map(s => s.getName()),
      lastModified: Utilities.formatDate(new Date(ss.getLastUpdated()), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      owner: ss.getOwner().getEmail()
    };
    
    return info;
    
  } catch (error) {
    console.error('Error getting database info:', error);
    return null;
  }
}

/**
 * Test database connection
 */
function settingsTestConnection(email) {
  // Session Check
  const session = checkServerSession(email);
  if (!session.active) {
    return { status: 'error', message: "Sesi berakhir" };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    return {
      status: 'connected',
      message: 'Koneksi berhasil',
      sheetsCount: sheets.length,
      spreadsheetName: ss.getName()
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: 'Koneksi gagal: ' + error.message
    };
  }
}
