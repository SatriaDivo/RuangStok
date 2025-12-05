/**
 * Main Entry Point & Routing
 */

function doGet(e) {
  let page = (e && e.parameter && e.parameter.page) || 'dashboard';
  
  // DEBUG: Log to verify this version is running
  Logger.log('doGet called - version with include() function - page: ' + page);
  
  // Ignore timestamp parameter (used for cache busting)
  // let t = (e && e.parameter && e.parameter.t);
  
  // Handle logout page specifically
  if (page === 'logout') {
    return HtmlService.createTemplateFromFile('login')
      .evaluate()
      .setTitle('Login - Ruang Stok')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  // Handle login page
  if (page === 'login') {
    return HtmlService.createTemplateFromFile('login')
      .evaluate()
      .setTitle('Login - Ruang Stok')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // For all other pages, load the main template
  // The template itself will handle the client-side session check
  const template = HtmlService.createTemplateFromFile('template');
  
  // Pass the requested page to the template
  template.currentPage = page; 
  
  // Map pages to their content files
  const pageTemplates = {
    'dashboard': 'index', // index.html is the dashboard content
    'inventory': 'inventory',
    'suppliers': 'suppliers',
    'customers': 'customers',
    'purchases': 'purchases',
    'sales': 'sales',
    'receipts': 'receipts',
    'payments': 'payments',
    'reports': 'reports',
    'users': 'users',
    'settings': 'settings',
    'test': 'test' // DEBUG: test page
  };
  
  // Set the content template name
  template.contentTemplate = pageTemplates[page] || 'index';
  
  // Pass current user placeholder (will be filled by client-side check)
  // Note: Server-side rendering of user data is tricky with this session model 
  // because we rely on client localStorage to know who the user is first.
  // The client will update the UI after checking session.
  template.currentUser = null; 

  return template.evaluate()
      .setTitle('Ruang Stok')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Include HTML file content
 * Used by template to inject page content
 */
function include(filename) {
  try {
    Logger.log('Including file: ' + filename);
    const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
    Logger.log('File included successfully: ' + filename + ' (' + content.length + ' chars)');
    return content;
  } catch (error) {
    Logger.log('ERROR including file: ' + filename + ' - ' + error.toString());
    const errorHtml = '<div style="padding: 20px; background: #fee; border: 2px solid red; margin: 20px;">' +
           '<h2 style="color: red;">⚠️ Error Loading Content</h2>' +
           '<p><strong>File:</strong> ' + filename + '.html</p>' +
           '<p><strong>Error:</strong> ' + error.toString() + '</p>' +
           '<p><strong>Time:</strong> ' + new Date().toLocaleString() + '</p>' +
           '</div>';
    return errorHtml;
  }
}
