/**
 * Users Management Backend
 * Handles CRUD operations for Users sheet and Timestamp updates
 */

const USERS_SHEET_NAME = 'Users';

/**
 * Simple password hashing function
 */
function hashPassword(password) {
  if (!password) return '';
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return hash.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Setup Users sheet with headers if not exists
 */
function usersSetupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  // Updated headers to include Last Login and Last Logout
  const headers = ['ID', 'Nama', 'Email', 'Password', 'Peran', 'Status', 'Tanggal Dibuat', 'Terakhir Login', 'Terakhir Logout'];
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
  }
  
  // If sheet is empty, add headers
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // Check if headers need update (if old version)
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (currentHeaders.length < 9) {
      // Add missing headers
      sheet.getRange(1, 8).setValue('Terakhir Login');
      sheet.getRange(1, 9).setValue('Terakhir Logout');
    }
  }
  
  // Check/Fix default admin
  // This logic ensures that if the admin user exists, they always have the 'Admin' role.
  // It fixes the issue where an existing admin user might have been accidentally demoted to 'Staff'.
  const data = sheet.getDataRange().getValues();
  let adminFound = false;
  
  // Look for stockruang@gmail.com
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === 'stockruang@gmail.com') {
      adminFound = true;
      // Force role to Admin if it's not (Self-healing)
      if (data[i][4] !== 'Admin') {
        sheet.getRange(i + 1, 5).setValue('Admin');
      }
      break;
    }
  }
  
  // If not found, create it
  if (!adminFound) {
    const defaultAdmin = [
      'U001',
      'Admin',
      'stockruang@gmail.com',
      hashPassword('admin123'),
      'Admin',
      'Aktif',
      new Date().toISOString().slice(0, 10),
      '',
      ''
    ];
    sheet.appendRow(defaultAdmin);
  }
  
  return sheet;
}

/**
 * Helper to find user row by email OR name
 */
function findUserRow(identifier) {
  const sheet = usersSetupSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Check both Email (Column C, index 2) and Name (Column B, index 1)
    if (data[i][2] == identifier || data[i][1] == identifier) {
      return i + 1; // Return 1-based row index
    }
  }
  return -1;
}

/**
 * Update user timestamp (Login or Logout)
 */
function updateUserTimestamp(email, type) {
  const row = findUserRow(email);
  if (row === -1) return false;
  
  const sheet = usersSetupSheet();
  const timestamp = new Date();
  
  if (type === 'login') {
    // Update Column H (Index 8) -> Row, Col 8
    sheet.getRange(row, 8).setValue(timestamp);
  } else if (type === 'logout') {
    // Update Column I (Index 9) -> Row, Col 9
    sheet.getRange(row, 9).setValue(timestamp);
  }
  return true;
}

/**
 * Parse date value from sheet (handles Date objects, strings in various formats)
 */
function parseDateValue(value) {
  if (!value) return 0;
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.getTime();
  }
  
  // If it's a string
  const str = String(value).trim();
  if (!str) return 0;
  
  // Try DD/MM/YYYY format first
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(ddmmyyyy[3], 10);
    const date = new Date(year, month, day);
    return date.getTime();
  }
  
  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }
  
  return 0;
}

/**
 * Get user session data (timestamps)
 */
function getUserSessionData(identifier) {
  console.log('getUserSessionData called with:', identifier);
  
  const row = findUserRow(identifier);
  console.log('findUserRow returned:', row);
  
  if (row === -1) {
    console.log('User row not found for:', identifier);
    return null;
  }
  
  const sheet = usersSetupSheet();
  // Get Last Login (H) and Last Logout (I)
  const lastLogin = sheet.getRange(row, 8).getValue();
  const lastLogout = sheet.getRange(row, 9).getValue();
  
  console.log('Raw lastLogin:', lastLogin, 'Type:', typeof lastLogin);
  console.log('Raw lastLogout:', lastLogout, 'Type:', typeof lastLogout);
  
  const loginTime = parseDateValue(lastLogin);
  const logoutTime = parseDateValue(lastLogout);
  
  console.log('Parsed loginTime:', loginTime, 'logoutTime:', logoutTime);
  
  return {
    lastLogin: loginTime,
    lastLogout: logoutTime
  };
}

/**
 * Get all users
 */
function usersGetAll(username) {
  console.log('usersGetAll called with username:', username);
  
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    console.log('Sheet data rows:', data.length);
    
    if (data.length <= 1) {
      console.log('No data rows found (only header)');
      return [];
    }
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        // Convert all values to strings to ensure serialization works
        users.push({
          id: String(row[0] || ''),
          name: String(row[1] || ''),
          email: String(row[2] || ''),
          role: String(row[4] || ''),
          status: String(row[5] || ''),
          created: row[6] instanceof Date ? row[6].toLocaleDateString('id-ID') : String(row[6] || ''),
          lastLogin: row[7] instanceof Date ? row[7].toLocaleDateString('id-ID') : String(row[7] || ''),
          lastLogout: row[8] instanceof Date ? row[8].toLocaleDateString('id-ID') : String(row[8] || '')
        });
      }
    }
    console.log('Returning users:', users.length);
    console.log('Users data:', JSON.stringify(users));
    return users;
  } catch (error) {
    console.error('Error in usersGetAll:', error);
    return []; // Return empty array instead of throwing to avoid null
  }
}

/**
 * Add new user
 */
function usersAdd(userData, username) {
  const session = checkServerSession(username);
  if (!session.active) throw new Error('Session expired');
  try {
    const sheet = usersSetupSheet();
    
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    
    // Check for duplicate name and email, and find max ID
    for (let i = 1; i < data.length; i++) {
      const id = String(data[i][0]).trim();
      const existingName = String(data[i][1]).toLowerCase().trim();
      const existingEmail = String(data[i][2]).toLowerCase().trim();
      
      if (existingName === userData.name.toLowerCase().trim()) {
        throw new Error('Nama "' + userData.name + '" sudah digunakan');
      }
      if (existingEmail === userData.email.toLowerCase().trim()) {
        throw new Error('Email "' + userData.email + '" sudah terdaftar');
      }
      
      // Extract number from ID (handles U001, U002, etc.)
      const match = id.match(/U(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    
    // Generate new unique ID
    const newId = 'U' + String(maxId + 1).padStart(3, '0');
    console.log('Generated new ID:', newId, 'from maxId:', maxId);
    
    const hashedPassword = hashPassword(userData.password || 'password123');
    
    const newRow = [
      newId,
      userData.name,
      userData.email,
      hashedPassword,
      userData.role,
      userData.status,
      new Date().toISOString().slice(0, 10),
      '', // Last Login
      ''  // Last Logout
    ];
    
    sheet.appendRow(newRow);
    return true;
  } catch (error) {
    console.error('Error in usersAdd:', error);
    throw new Error('Gagal menambah pengguna: ' + error.message);
  }
}

/**
 * Update user
 */
function usersUpdate(userData, username) {
  const session = checkServerSession(username);
  if (!session.active) throw new Error('Session expired');
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    
    // Check for duplicate name and email (excluding current user)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] !== userData.id) {
        const existingName = String(data[i][1]).toLowerCase().trim();
        const existingEmail = String(data[i][2]).toLowerCase().trim();
        
        if (existingName === userData.name.toLowerCase().trim()) {
          throw new Error('Nama "' + userData.name + '" sudah digunakan oleh pengguna lain');
        }
        if (existingEmail === userData.email.toLowerCase().trim()) {
          throw new Error('Email "' + userData.email + '" sudah terdaftar oleh pengguna lain');
        }
      }
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userData.id) {
        const updateData = [
          userData.name,
          userData.email,
          userData.password ? hashPassword(userData.password) : data[i][3],
          userData.role,
          userData.status
        ];
        // Update columns B to F (2 to 6)
        sheet.getRange(i + 1, 2, 1, 5).setValues([updateData]);
        return true;
      }
    }
    throw new Error('Pengguna tidak ditemukan');
  } catch (error) {
    console.error('Error in usersUpdate:', error);
    throw new Error('Gagal mengupdate pengguna: ' + error.message);
  }
}

/**
 * Delete user
 */
function usersDelete(userId, username) {
  const session = checkServerSession(username);
  if (!session.active) throw new Error('Session expired');
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    throw new Error('Pengguna tidak ditemukan');
  } catch (error) {
    console.error('Error in usersDelete:', error);
    throw new Error('Gagal menghapus pengguna: ' + error.message);
  }
}

/**
 * Reset user password to default
 */
function usersResetPassword(userId) {
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    const defaultPassword = 'ruangstok123';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // Update password column (D = column 4)
        sheet.getRange(i + 1, 4).setValue(hashPassword(defaultPassword));
        return true;
      }
    }
    throw new Error('Pengguna tidak ditemukan');
  } catch (error) {
    console.error('Error in usersResetPassword:', error);
    throw new Error('Gagal mereset password: ' + error.message);
  }
}

/**
 * Generate random password
 */
function generateRandomPassword(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Admin Reset Password by Email (from Login page)
 * Only works for Admin accounts - sends new password via email
 */
function adminResetPasswordByEmail(email) {
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    
    // Find user by email
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        // Check if user is Admin
        if (data[i][4] !== 'Admin') {
          return { success: false, message: 'Fitur ini hanya untuk akun Admin' };
        }
        
        // Check if user is Active
        if (data[i][5] !== 'Active' && data[i][5] !== 'Aktif') {
          return { success: false, message: 'Akun tidak aktif. Hubungi administrator.' };
        }
        
        // Generate new password
        const newPassword = generateRandomPassword(10);
        const userName = data[i][1];
        
        // Update password in sheet
        sheet.getRange(i + 1, 4).setValue(hashPassword(newPassword));
        
        // Send email with new password using GmailApp
        const subject = '🔐 Reset Password - Ruang Stok';
        const htmlBody = `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Ruang Stok</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Sistem Manajemen Inventory</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              <h2 style="color: #2c3e50; margin-top: 0;">Halo, ${userName}!</h2>
              <p style="color: #555; line-height: 1.6;">Password akun Anda telah direset. Berikut adalah password baru Anda:</p>
              <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0 0 10px; color: #7f8c8d; font-size: 14px;">Password Baru Anda</p>
                <p style="font-size: 28px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 2px; font-family: monospace;">${newPassword}</p>
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ Penting:</strong> Demi keamanan, segera ubah password ini setelah login.
                </p>
              </div>
              <p style="color: #555; line-height: 1.6;">Jika Anda tidak meminta reset password, abaikan email ini dan segera hubungi administrator.</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0; color: #7f8c8d; font-size: 13px;">© 2025 Ruang Stok. All rights reserved.</p>
            </div>
          </div>
        `;
        
        GmailApp.sendEmail(email, subject, 'Password baru Anda: ' + newPassword, {
          htmlBody: htmlBody
        });
        
        return { success: true, message: 'Password baru telah dikirim ke email Anda' };
      }
    }
    
    return { success: false, message: 'Email tidak ditemukan' };
  } catch (error) {
    console.error('Error in adminResetPasswordByEmail:', error);
    return { success: false, message: 'Gagal reset password: ' + error.message };
  }
}

/**
 * Fix duplicate IDs in Users sheet
 * Run this function manually from Apps Script Editor to fix existing data
 */
function fixUserIds() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return 'Sheet Users tidak ditemukan';
  
  const data = sheet.getDataRange().getValues();
  const usedIds = new Set();
  let fixedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const currentId = String(data[i][0]).trim();
    let newId = currentId;
    
    // If ID is empty, duplicate, or invalid format
    if (!currentId || usedIds.has(currentId) || !currentId.match(/^U\d{3}$/)) {
      // Generate new unique ID
      let idNum = 1;
      while (usedIds.has('U' + String(idNum).padStart(3, '0'))) {
        idNum++;
      }
      newId = 'U' + String(idNum).padStart(3, '0');
      
      // Update the cell
      sheet.getRange(i + 1, 1).setValue(newId);
      console.log('Fixed row ' + (i + 1) + ': ' + currentId + ' -> ' + newId);
      fixedCount++;
    }
    
    usedIds.add(newId);
  }
  
  return 'Fixed ' + fixedCount + ' user IDs';
}

/**
 * Change user's own password (for Settings page)
 */
function changeUserPassword(email, oldPassword, newPassword) {
  try {
    const sheet = usersSetupSheet();
    const data = sheet.getDataRange().getValues();
    
    // Find user by email
    let userRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        userRow = i + 1;
        break;
      }
    }
    
    if (userRow === -1) {
      return { success: false, message: 'Pengguna tidak ditemukan' };
    }
    
    // Verify old password
    const currentHashedPassword = data[userRow - 1][3];
    const oldHashedPassword = hashPassword(oldPassword);
    
    if (currentHashedPassword !== oldHashedPassword) {
      return { success: false, message: 'Password lama tidak benar' };
    }
    
    // Update to new password
    const newHashedPassword = hashPassword(newPassword);
    sheet.getRange(userRow, 4).setValue(newHashedPassword);
    
    return { success: true, message: 'Password berhasil diubah' };
    
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Terjadi kesalahan: ' + error.message };
  }
}
