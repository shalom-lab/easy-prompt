const newPromptInput = document.getElementById('new-prompt');
const addButton = document.getElementById('add-btn');
const promptList = document.getElementById('prompt-list');

// Add keyboard shortcuts
newPromptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    addButton.click();  // 只在 Ctrl+Enter 时保存
  }
});

// Load prompts from storage
function loadPrompts() {
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    promptList.innerHTML = '';
    prompts.forEach((prompt, index) => addPromptToUI(prompt, index));
  });
}

// Add prompt to UI
function addPromptToUI(prompt, index) {
  const li = document.createElement('li');
  li.className = 'prompt-item';
  li.draggable = true;
  li.setAttribute('data-index', index);
  
  // 添加拖拽事件监听器
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('dragend', handleDragEnd);

  // Add drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '⋮⋮';  // 使用2组三点，形成6个点

  const textSpan = document.createElement('span');
  textSpan.textContent = prompt;
  textSpan.className = 'prompt-text';
  textSpan.setAttribute('data-full-text', prompt);
  
  // Create edit input (hidden by default)
  const editInput = document.createElement('textarea');
  editInput.className = 'edit-input';
  editInput.value = prompt;
  editInput.style.display = 'none';

  // Add double click to edit
  textSpan.addEventListener('dblclick', () => {
    startEditing(textSpan, editInput, prompt, index);
  });

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.className = 'copy-btn';
  copyButton.onclick = () => {
    navigator.clipboard.writeText(prompt);
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    
    // Remove toast after animation
    toast.addEventListener('animationend', () => {
      document.body.removeChild(toast);
    });
  };

  const editButton = document.createElement('button');
  editButton.textContent = 'Edit';
  editButton.className = 'edit-btn';
  editButton.onclick = () => {
    startEditing(textSpan, editInput, prompt, index);
  };

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.className = 'delete-btn';
  deleteButton.onclick = () => {
    showDeleteConfirm(index);
  };

  li.appendChild(dragHandle);
  li.appendChild(textSpan);
  li.appendChild(editInput);
  li.appendChild(copyButton);
  li.appendChild(editButton);
  li.appendChild(deleteButton);

  promptList.appendChild(li);
}

// Function to handle edit mode
function startEditing(textSpan, editInput, prompt, index) {
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.textContent = 'Edit Prompt';
  
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  
  // 创建新的文本框
  const modalTextarea = document.createElement('textarea');
  modalTextarea.className = 'modal-textarea';
  modalTextarea.value = prompt;
  
  const modalFooter = document.createElement('div');
  modalFooter.className = 'modal-footer';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'modal-btn save';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'modal-btn cancel';
  
  modalBody.appendChild(modalTextarea);
  modalFooter.appendChild(cancelButton);
  modalFooter.appendChild(saveButton);
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  modalTextarea.focus();

  // 保存编辑
  function saveEdit() {
    const newPrompt = modalTextarea.value.trim();
    if (newPrompt && newPrompt !== prompt) {
      updatePrompt(index, newPrompt);
    }
    document.body.removeChild(modal);
  }

  // 取消编辑
  function cancelEdit() {
    document.body.removeChild(modal);
  }

  // 添加事件监听器
  saveButton.onclick = saveEdit;
  cancelButton.onclick = cancelEdit;
  
  // ESC 键关闭模态框
  modalTextarea.onkeydown = (e) => {
    if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit();
    }
  };

  // 点击模态框外部关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      cancelEdit();
    }
  };
}

// Add new prompt with optional notification
function addNewPrompt(text) {
  const newPrompt = text.trim();
  if (newPrompt) {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.push(newPrompt);
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
  }
}

// Add new prompt
addButton.onclick = () => {
  const newPrompt = newPromptInput.value.trim();
  if (newPrompt) {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.push(newPrompt);
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
    newPromptInput.value = '';
  }
};

// Update prompt
function updatePrompt(index, newPrompt) {
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    prompts[index] = newPrompt;
    chrome.storage.local.set({ prompts }, loadPrompts);
  });
}

// Delete prompt
function deletePrompt(index) {
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    prompts.splice(index, 1);
    chrome.storage.local.set({ prompts }, loadPrompts);
  });
}

// Add event listeners after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get import/export buttons
  const importBtn = document.getElementById('import-btn');
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');

  // Add click handlers
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  exportBtn.addEventListener('click', exportPrompts);

  // Handle file selection
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importPrompts(file);
      // Reset file input
      e.target.value = '';
    }
  });
});

// Export prompts function
function exportPrompts() {
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts.json';
    a.click();
    
    URL.revokeObjectURL(url);
  });
}

// Import prompts function
function importPrompts(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const prompts = JSON.parse(e.target.result);
      if (Array.isArray(prompts)) {
        chrome.storage.local.set({ prompts }, () => {
          loadPrompts();
          // Show success toast
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.textContent = 'Prompts imported successfully!';
          document.body.appendChild(toast);
          toast.addEventListener('animationend', () => {
            document.body.removeChild(toast);
          });
        });
      }
    } catch (error) {
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = 'Invalid file format';
      document.body.appendChild(toast);
      toast.addEventListener('animationend', () => {
        document.body.removeChild(toast);
      });
    }
  };
  reader.readAsText(file);
}

// Show custom delete confirmation dialog
function showDeleteConfirm(index) {
  const modal = document.createElement('div');
  modal.className = 'modal confirm-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  modalBody.textContent = 'Are you sure you want to delete this prompt?';
  
  const modalFooter = document.createElement('div');
  modalFooter.className = 'modal-footer';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.onclick = () => {
    document.body.removeChild(modal);
  };
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.onclick = () => {
    deletePrompt(index);
    document.body.removeChild(modal);
  };
  
  modalFooter.appendChild(cancelButton);
  modalFooter.appendChild(deleteButton);
  
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);

  // 点击模态框外部关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// 拖拽相关变量
let dragStartIndex;
let dragOverItem;

// 添加拖拽事件处理函数
function handleDragStart(e) {
  dragStartIndex = parseInt(this.getAttribute('data-index'));
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.prompt-item');
  if (item && !item.classList.contains('dragging')) {
    dragOverItem = item;
    const items = [...promptList.querySelectorAll('.prompt-item:not(.dragging)')];
    const draggedItem = promptList.querySelector('.dragging');
    const draggedRect = draggedItem.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // 计算拖动项目应该放置的位置
    const shouldGoAfter = items.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = mouseY - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;

    if (shouldGoAfter) {
      shouldGoAfter.parentNode.insertBefore(draggedItem, shouldGoAfter);
    } else {
      promptList.appendChild(draggedItem);
    }
  }
}

function handleDragEnd(e) {
  e.preventDefault();
  this.classList.remove('dragging');
  
  // 获取新的顺序并更新存储
  const items = [...promptList.querySelectorAll('.prompt-item')];
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    const newPrompts = items.map(item => {
      const index = parseInt(item.getAttribute('data-index'));
      return prompts[index];
    });
    chrome.storage.local.set({ prompts: newPrompts }, () => {
      loadPrompts(); // 重新加载列表以更新索引
    });
  });
}

// Initialize
loadPrompts();
