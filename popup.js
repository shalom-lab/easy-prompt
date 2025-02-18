const newPromptInput = document.getElementById('new-prompt');
const addButton = document.getElementById('add-btn');
const promptList = document.getElementById('prompt-list');

// Add keyboard shortcuts
newPromptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    addButton.click();
  }
  if (e.key === 'v' && e.ctrlKey) {
    e.preventDefault();
    document.execCommand('paste');
    if (e.shiftKey) { // Ctrl+Shift+V to paste and save directly
      addButton.click();
    }
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
  li.draggable = true; // Make item draggable
  
  // Add drag and drop event listeners
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('drop', handleDrop);
  li.addEventListener('dragenter', handleDragEnter);
  li.addEventListener('dragleave', handleDragLeave);

  // Add drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '⋮⋮'; // Vertical dots as handle

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
  const li = textSpan.closest('.prompt-item');
  li.classList.add('editing');  // Add editing class
  textSpan.style.display = 'none';
  editInput.style.display = 'block';
  editInput.value = prompt;
  editInput.focus();

  function saveEdit() {
    const newPrompt = editInput.value.trim();
    if (newPrompt && newPrompt !== prompt) {
      updatePrompt(index, newPrompt);
    } else {
      // If no changes, just revert back
      textSpan.style.display = 'block';
      editInput.style.display = 'none';
      li.classList.remove('editing');  // Remove editing class
    }
  }

  // Save on enter
  editInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      // Cancel on escape
      textSpan.style.display = 'block';
      editInput.style.display = 'none';
      li.classList.remove('editing');  // Remove editing class
    }
  };

  // Save on blur
  editInput.onblur = () => {
    saveEdit();
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
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  
  const message = document.createElement('p');
  message.textContent = 'Are you sure you want to delete this prompt?';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'confirm-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'confirm-btn cancel';
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Delete';
  confirmBtn.className = 'confirm-btn delete';
  confirmBtn.onclick = () => {
    deletePrompt(index);
    document.body.removeChild(overlay);
  };
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  dialog.appendChild(message);
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

// Drag and drop handlers
let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this === draggedItem) return;

  // Get all items
  const items = [...promptList.querySelectorAll('.prompt-item')];
  const fromIndex = items.indexOf(draggedItem);
  const toIndex = items.indexOf(this);

  // Update storage with new order
  chrome.storage.local.get(['prompts'], (result) => {
    const prompts = result.prompts || [];
    const [movedItem] = prompts.splice(fromIndex, 1);
    prompts.splice(toIndex, 0, movedItem);
    chrome.storage.local.set({ prompts }, loadPrompts);
  });

  draggedItem.classList.remove('dragging');
  draggedItem = null;
}

// Initialize
loadPrompts();
