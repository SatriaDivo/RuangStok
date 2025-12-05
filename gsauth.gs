/**
 * Authentication Module for Ruang Stok
 * Handles user login, logout, and session management using Sheet Timestamps
 */

/**
 * Process Login Request
 * @param {object} formObject - Contains email and password
 */
function processLogin(formObject) {
  // Handle both object format (from HTML form) and direct args
  const email = formObject.username || formObject.email; // Support both field names
  const password = formObject.password;
  
  if (!email || !password) {
    return { success: false, message: 'Email dan Password wajib diisi.' };
  }

  const sheet = usersSetupSheet(); // Ensure sheet is setup
  const data = sheet.getDataRange().getValues();
  
  const hashedPassword = hashPassword(password);
  
  let userFound = false;
  let isValid = false;
  let userData = null;
  
  for (let i = 1; i < data.length; i++) {
    // Check Email (Col C/2) or Name (Col B/1)
    if ((data[i][2].toLowerCase() == email.toLowerCase() || data[i][1].toLowerCase() == email.toLowerCase())) {
      
      // Check Password
      if (data[i][3] == hashedPassword || String(data[i][3]) === String(password)) {
        
        // Check Status (Col F/5)
        if (data[i][5] !== 'Aktif' && data[i][5] !== 'Active') {
          return { success: false, message: 'Akun dinonaktifkan.' };
        }
        
        // Auto-fix plain text password
        if (String(data[i][3]) === String(password) && data[i][3] !== hashedPassword) {
           sheet.getRange(i + 1, 4).setValue(hashedPassword);
        }

        userFound = true;
        isValid = true;
        userData = {
          userId: data[i][0],
          name: data[i][1],
          email: data[i][2],
          role: data[i][4]
        };
        break;
      }
    }
  }
  
  if (isValid) {
    // Update Timestamp Login
    updateUserTimestamp(userData.email, 'login');
    
    return { 
      success: true, 
      message: 'Login berhasil',
      user: {
        username: userData.email,
        role: userData.role,
        name: userData.name
      }
    };
  } else {
    return { success: false, message: 'Email atau Password salah.' };
  }
}

/**
 * Process Logout Request
 */
function processLogout(email) {
  if (email) {
    updateUserTimestamp(email, 'logout');
  }
  return { success: true };
}

/**
 * Check Server Session based on Timestamps
 * This function is called by the client to verify if the session is still valid
 * Accepts email OR name as identifier
 */
function checkServerSession(identifier) {
  console.log('checkServerSession called with:', identifier);
  
  if (!identifier) {
    console.log('No identifier provided');
    return { active: false };
  }
  
  const timestamps = getUserSessionData(identifier);
  console.log('Timestamps:', JSON.stringify(timestamps));
  
  if (!timestamps) {
    console.log('No timestamps found');
    return { active: false };
  }
  
  // LOGIC: Login Time > Logout Time = Active
  // If Logout is 0 (never logged out) and Login exists, it's active.
  // If Login is newer than Logout, it's active.
  
  console.log('Comparing: loginTime', timestamps.lastLogin, '> logoutTime', timestamps.lastLogout, '=', timestamps.lastLogin > timestamps.lastLogout);
  
  if (timestamps.lastLogin > timestamps.lastLogout) {
    // Get user role for permission checking
    const row = findUserRow(identifier);
    const sheet = usersSetupSheet();
    const role = sheet.getRange(row, 5).getValue(); // Col E is Role
    const email = sheet.getRange(row, 3).getValue(); // Col C is Email
    const name = sheet.getRange(row, 2).getValue(); // Col B is Name
    
    console.log('Session ACTIVE for:', identifier, 'Role:', role);
    
    return { 
      active: true,
      role: role,
      name: name,
      email: email
    };
  } else {
    console.log('Session NOT active - login time not greater than logout time');
    return { active: false };
  }
}

/**
 * Wrapper for client-side calls to avoid caching issues
 */
function apiCheckServerSession(email) {
  return checkServerSession(email);
}

// Alias for compatibility with existing code if any
function authenticateUser(username, password) {
  return processLogin({ username: username, password: password });
}

/**
 * Force refresh of this file
 */
