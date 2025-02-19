// Create context menus
chrome.runtime.onInstalled.addListener(() => {
  // Initial setup of menus
  createContextMenus();
});

// 添加标签页激活监听器，确保菜单始终是最新的
chrome.tabs.onActivated.addListener(() => {
  createContextMenus();
});

// 添加窗口焦点变化监听器
chrome.windows.onFocusChanged.addListener(() => {
  createContextMenus();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  try {
    if (info.menuItemId === "savePrompt") {
      const selectedText = info.selectionText;
      chrome.storage.local.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        prompts.push(selectedText);
        chrome.storage.local.set({ prompts }, () => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Prompt Saver',
            message: 'Text saved successfully!'
          });
        });
      });
    } else if (info.menuItemId.startsWith('insert_prompt_')) {
      const index = parseInt(info.menuItemId.replace('insert_prompt_', ''));
      chrome.storage.local.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        if (prompts[index]) {
          // Execute script to insert text
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: insertTextToActiveElement,
            args: [prompts[index]]
          });
        }
      });
    }
  } catch (error) {
    // Silently ignore errors
  }
});

// Function to insert text into active element
function insertTextToActiveElement(text) {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.isContentEditable || 
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA')) {
    
    if (activeElement.isContentEditable) {
      activeElement.textContent = text;
    } else {
      activeElement.value = text;
      // Trigger input event
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// 只在存储变化时更新菜单
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.prompts) {
    createContextMenus();
  }
});

// Function to create context menus
function createContextMenus() {
  try {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];

      // Create save menu
      chrome.contextMenus.create({
        id: "savePrompt",
        title: "Save to Prompt Saver",
        contexts: ["selection"]
      });

      if (prompts.length > 0) {
        // Create parent menu
        chrome.contextMenus.create({
          id: 'insertPromptParent',
          title: 'Insert Prompt',
          contexts: ['editable']
        });

        // Create submenu items
        prompts.forEach((prompt, index) => {
          const title = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt;
          chrome.contextMenus.create({
            id: `insert_prompt_${index}`,
            parentId: 'insertPromptParent',
            title: title,
            contexts: ['editable']
          });
        });
      }
    });
  } catch (error) {
    // Silently ignore all errors
  }
}