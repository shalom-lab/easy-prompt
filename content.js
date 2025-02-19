// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request); // Debug log
  
  if (request.action === 'insertPrompt') {
    const activeElement = document.activeElement;
    console.log('Active element:', activeElement); // Debug log
    
    if (activeElement && (activeElement.isContentEditable || 
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA')) {
      
      // Handle different types of inputs
      if (activeElement.isContentEditable) {
        // For contenteditable elements
        activeElement.textContent = request.prompt;
      } else {
        // For regular input fields and textareas
        activeElement.value = request.prompt;
        
        // Trigger input event for reactive frameworks
        const inputEvent = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(inputEvent);
        
        // Also trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        activeElement.dispatchEvent(changeEvent);
      }
      
      console.log('Prompt inserted:', request.prompt); // Debug log
    }
  }
});

// Log when content script is loaded
console.log('Prompt Saver content script loaded'); 