// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "savePrompt",
    title: "Save to Prompt Saver",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "savePrompt") {
    const selectedText = info.selectionText;
    
    // Save the selected text to storage
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.push(selectedText);
      chrome.storage.local.set({ prompts }, () => {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Prompt Saver',
          message: 'Text saved successfully!'
        });
      });
    });
  }
}); 