// Create context menus
chrome.runtime.onInstalled.addListener(() => {
  // Initial setup of menus
  createContextMenus();
});

// 创建防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 使用防抖包装 createContextMenus
const debouncedCreateContextMenus = debounce(createContextMenus, 100);

// 添加标签页激活监听器
chrome.tabs.onActivated.addListener(() => {
  debouncedCreateContextMenus();
});

// 添加窗口焦点变化监听器
chrome.windows.onFocusChanged.addListener(() => {
  debouncedCreateContextMenus();
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
          // 检查是否可以访问该页面
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab && currentTab.url && 
                !currentTab.url.startsWith('chrome://') && 
                !currentTab.url.startsWith('chrome-extension://')) {
              
              chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: (text) => {
                  const activeElement = document.activeElement;
                  if (activeElement && (activeElement.isContentEditable || 
                      activeElement.tagName === 'INPUT' || 
                      activeElement.tagName === 'TEXTAREA')) {
                    
                    const start = activeElement.selectionStart || 0;
                    const end = activeElement.selectionEnd || 0;
                    
                    if (activeElement.isContentEditable) {
                      // 处理可编辑内容
                      const selection = window.getSelection();
                      if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode(text));
                      }
                    } else {
                      // 处理输入框
                      const currentValue = activeElement.value;
                      activeElement.value = currentValue.substring(0, start) + 
                                          text + 
                                          currentValue.substring(end);
                      
                      // 更新光标位置
                      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
                      
                      // 触发事件
                      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }
                },
                args: [prompts[index]]
              }).catch(error => {
                console.error('Failed to execute script:', error);
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icon48.png',
                  title: 'Prompt Saver',
                  message: 'Cannot insert text in this page'
                });
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error in context menu click handler:', error);
  }
});

// 只在存储变化时更新菜单
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.prompts) {
    debouncedCreateContextMenus();
  }
});

// Function to create context menus
async function createContextMenus() {
  try {
    // 确保移除所有现有菜单
    await new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        resolve();
      });
    });

    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['prompts'], resolve);
    });
    
    const prompts = result.prompts || [];

    // 使用 Promise 包装 create 操作
    const createMenu = (options) => new Promise((resolve) => {
      chrome.contextMenus.create(options, resolve);
    });

    // Create save menu
    await createMenu({
      id: "savePrompt",
      title: "Save to Prompt Saver",
      contexts: ["selection"]
    });

    if (prompts.length > 0) {
      // Create parent menu
      await createMenu({
        id: 'insertPromptParent',
        title: 'Insert Prompt',
        contexts: ['editable']
      });

      // Create submenu items sequentially
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const title = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt;
        await createMenu({
          id: `insert_prompt_${i}`,
          parentId: 'insertPromptParent',
          title: title,
          contexts: ['editable']
        });
      }
    }
  } catch (error) {
    console.error('Error creating context menus:', error);
  }
}