document.getElementById('fetchNotes').addEventListener('click', () => {
  console.log('Fetch button clicked');
  chrome.runtime.sendMessage({action: "fetchNotes"}, (response) => {
    console.log('Response received:', response);
    document.getElementById('status').textContent = response ? response.message : 'No response';
  });
});


document.getElementById('viewNotes').addEventListener('click', () => {
  chrome.storage.local.get('notes', (result) => {
    let notesContent = document.getElementById('notesContent');
    let copyButton = document.getElementById('copyNotes');
    if (result.notes) {
      notesContent.textContent = result.notes;
      copyButton.style.display = 'block';
    } else {
      notesContent.textContent = 'No notes found';
      copyButton.style.display = 'none';
    }
  });
});

document.getElementById('copyNotes').addEventListener('click', () => {
  let notesContent = document.getElementById('notesContent').textContent;
  navigator.clipboard.writeText(notesContent).then(() => {
    let statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Notes copied to clipboard!';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in popup:', request);
  if (request.action === "notesSaved") {
    document.getElementById('status').textContent = `Fetched ${request.totalCount} notes in total. Saved ${request.savedCount} original notes.`;
  }
});


