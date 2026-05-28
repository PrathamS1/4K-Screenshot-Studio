chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_visible') {
    const tabId = request.tabId;
    
    // 1. Attach Chrome Debugger to target tab
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        console.warn("4K Screenshotter: Debugger attachment failed. Falling back to standard resolution visible capture.", chrome.runtime.lastError.message);
        // Fallback capture at standard resolution
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          downloadImage(dataUrl, 'screenshot_visible.png');
          sendResponse({ success: true });
        });
        return;
      }

      // 2. Set high-density emulation device metrics (2.0x scale factor for true 4K desktop captures)
      chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
        width: 0, // Keep current logical viewport width
        height: 0, // Keep current logical viewport height
        deviceScaleFactor: 2.0, // 2x high-density pixel scale
        mobile: false
      }, () => {
        // Wait for viewport to settle
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const style = document.createElement('style');
              style.id = 'temp-4k-hide-scroll';
              style.textContent = '::-webkit-scrollbar { display: none !important; } html, body { scrollbar-width: none !important; overflow: hidden !important; }';
              document.head.appendChild(style);
              return true;
            }
          }).then(() => {
            setTimeout(() => {
              // 3. Take capture using Page.captureScreenshot to get native 4K density
              chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', {
                format: 'png',
                quality: 100,
                fromSurface: true
              }, (result) => {
                const dataUrl = 'data:image/png;base64,' + result.data;
                
                // Restore scrollbars
                chrome.scripting.executeScript({
                  target: { tabId },
                  func: () => {
                     const el = document.getElementById('temp-4k-hide-scroll');
                     if (el) el.remove();
                  }
                });

                // 4. Clear overrides and detach debugger
                chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {}, () => {
                  chrome.debugger.detach({ tabId }, () => {
                    downloadImage(dataUrl, 'screenshot_visible.png');
                    sendResponse({ success: true });
                  });
                });
              });
            }, 100);
          });
        }, 300);
      });
    });
    return true;
  }

  if (request.action === 'capture_full') {
    const tabId = request.tabId;
    
    // 1. Attach Chrome Debugger to target tab
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        console.warn("4K Screenshotter: Debugger attachment failed. Falling back to standard resolution full page capture.", chrome.runtime.lastError.message);
        // Fallback capture at standard resolution
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }).then(() => {
          chrome.tabs.sendMessage(tabId, { action: 'start_full_capture' });
          sendResponse({ success: true });
        });
        return;
      }

      // 2. Set high-density emulation device metrics (2.0x scale factor for true 4K desktop captures)
      chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
        width: 0,
        height: 0,
        deviceScaleFactor: 2.0,
        mobile: false
      }, () => {
        // Wait for viewport to settle, then execute content.js scrolling capture
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          }).then(() => {
            chrome.tabs.sendMessage(tabId, { action: 'start_full_capture' });
            sendResponse({ success: true });
          });
        }, 300);
      });
    });
    return true;
  }
  
  if (request.action === 'store_part') {
    const tabId = sender.tab.id;
    
    // Use CDP Page.captureScreenshot if debugger is attached to maintain 100% reliability with Emulation
    chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', {
      format: 'png',
      quality: 100,
      fromSurface: true
    }, (result) => {
      if (chrome.runtime.lastError) {
        // Fallback to standard captureVisibleTab if debugger is not attached (e.g. fallback mode)
        let retries = 0;
        const maxRetries = 5;
        
        function tryCapture() {
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "No data URL returned";
              console.warn(`4K Screenshotter: captureVisibleTab fallback failed (attempt ${retries + 1}/${maxRetries}): ${err}`);
              
              if (retries < maxRetries) {
                retries++;
                setTimeout(tryCapture, 150);
              } else {
                sendResponse({ dataUrl: null, error: err });
              }
            } else {
              sendResponse({ dataUrl });
            }
          });
        }
        
        tryCapture();
      } else {
        const dataUrl = 'data:image/png;base64,' + result.data;
        sendResponse({ dataUrl });
      }
    });
    return true;
  }

  if (request.action === 'capture_complete') {
    const tabId = sender.tab.id;
    // Clear emulation overrides and detach debugger on capture complete
    chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {}, () => {
      chrome.debugger.detach({ tabId }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'open_editor') {
    chrome.tabs.create({ url: 'editor.html' });
    sendResponse({ success: true });
    return true;
  }
});

function downloadImage(dataUrl, filename) {
  const date = new Date();
  const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
  const finalFilename = filename.replace('.png', `_${timestamp}.png`);
  
  chrome.downloads.download({
    url: dataUrl,
    filename: `4K_Screenshots/${finalFilename}`,
    saveAs: false
  });

  // Save to storage and open editor
  chrome.storage.local.set({ latestScreenshot: dataUrl }, () => {
    chrome.tabs.create({ url: 'editor.html' });
  });
}

// Open onboarding page on extension install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://prathams1.github.io/4K-Screenshot-Studio/' });
  }
});