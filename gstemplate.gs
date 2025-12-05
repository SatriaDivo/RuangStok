/**
 * Template Helper Functions
 */

function include(filename) {
  if (!filename) {
    return '<div style="color:red; padding:20px;">Error: Filename is undefined</div>';
  }
  
  // Try to find the file with or without .html extension
  var attempts = [filename];
  if (!filename.endsWith('.html')) {
    attempts.push(filename + '.html');
  }
  
  for (var i = 0; i < attempts.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(attempts[i]).getContent();
    } catch (e) {
      // Continue to next attempt
    }
  }
  
  return '<div style="color:red; padding:20px;">Error loading template: ' + filename + '</div>';
}
