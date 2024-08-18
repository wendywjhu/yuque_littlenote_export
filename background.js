
function cleanHtml(rawHtml) {
  let text = rawHtml
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '')
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<p>/g, '\n')
    .replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '');

  // 移除零宽空格
  text = text.replace(/\u200B/g, '');
  
  // 统一换行符
  text = text.replace(/\r\n|\r/g, '\n');
  
  // 合并多个空行为一个空行
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  // 解码 HTML 实体
  text = decodeHtmlEntities(text);
  
  // 最后进行trim
  return text.trim();
}

// 辅助函数：解码 HTML 实体
function decodeHtmlEntities(text) {
  var textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}


  function fetchNotes(url) {
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
        let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        
        fetch(url, {
          headers: {
            'Cookie': cookieString
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
      });
    });
  }
  
  function saveNotesToStorage(notes) {
    let notesText = '';
    let savedCount = 0;

    notes.forEach((note, index) => {
      if (note.tags && note.tags.some(tag => tag.name === "原创内容")) {
        const abstract = note.content.abstract || '';
        
        // 打印原始内容
        console.log(`原始内容 ${index + 1}:`);
        console.log(abstract);
        console.log('---原始内容结束---');

        let cleanAbstract = cleanHtml(abstract);
        
        // 打印清理后的内容
        console.log(`清理后内容 ${index + 1}:`);
        console.log(cleanAbstract);
        console.log('---清理后内容结束---');


        // 原有的处理逻辑
        cleanAbstract = cleanAbstract.trimEnd() + '\n\n----------这里是分隔符----------\n\n';
        notesText += cleanAbstract;
        savedCount++;
      }
    });

    chrome.storage.local.set({notes: notesText.trim()}, () => {
      console.log(`Notes saved to storage. Total notes: ${notes.length}, Saved original notes: ${savedCount}`);
      chrome.runtime.sendMessage({
        action: "notesSaved", 
        totalCount: notes.length, 
        savedCount: savedCount
      });
    });
  }

  
  function main() {
    const baseUrl = "https://www.yuque.com/api/modules/note/notes/NoteController/index?filter_type=all&status=0&merge_dynamic_data=0&order=content_updated_at&with_pinned_notes=true";
    const limit = 20;
    const totalNeeded = 1000;
    let notesCollected = [];
    let startTime = Date.now();
    const timeoutDuration = 30000; // 30 seconds timeout
  
    function fetchBatch(offset) {
      if (Date.now() - startTime > timeoutDuration) {
        console.log('Timeout reached. Saving collected notes.');
        saveNotesToStorage(notesCollected);
        return;
      }

      const url = `${baseUrl}&limit=${limit}&offset=${offset}`;
      fetchNotes(url)
        .then(data => {
          const notes = data.notes || [];
          notesCollected = notesCollected.concat(notes);
          
          console.log(`Fetched ${notes.length} notes. Total collected: ${notesCollected.length}`);

          if (notes.length < limit || notesCollected.length >= totalNeeded) {
            console.log('Finished fetching notes. Saving collected notes.');
            saveNotesToStorage(notesCollected);
          } else {
            // Use setTimeout to prevent stack overflow
            setTimeout(() => fetchBatch(offset + limit), 100);
          }
        })
        .catch(error => {
          console.error('Error fetching notes:', error);
          saveNotesToStorage(notesCollected);
        });
    }
  
    fetchBatch(0);
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background:', request);
    if (request.action === "fetchNotes") {
      main();
      sendResponse({message: "Fetching notes..."});
    } else if (request.action === "notesSaved") {
      sendResponse({
        message: `Fetched ${request.totalCount} notes in total. Saved ${request.savedCount} original notes.`
      });
    }
    return true;  // 保持消息通道开放
  });