// service-worker.js

// Keep track of tabs that have active timers
// state shape: { [tabId]: { active: boolean, interval: number, hardReload: boolean, randomize: boolean } }
let activeTabs = {};

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_TIMER') {
    const { tabId, settings } = request;
    activeTabs[tabId] = settings;

    // Inject the content script to run the timer
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/refresher.js']
    }, () => {
      // Once injected, tell it to start
      chrome.tabs.sendMessage(tabId, { type: 'INIT_TIMER', settings });
    });

    // Update badge color to indicate active
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#07c6cc' });
    sendResponse({ success: true });
  }

  else if (request.type === 'STOP_TIMER') {
    const { tabId } = request;
    if (activeTabs[tabId]) {
      delete activeTabs[tabId];
    }
    // Tell content script to stop
    chrome.tabs.sendMessage(tabId, { type: 'CANCEL_TIMER' }).catch(() => { });
    chrome.action.setBadgeText({ tabId, text: '' });
    sendResponse({ success: true });
  }

  else if (request.type === 'UPDATE_BADGE') {
    // Coming from the content script
    if (sender.tab && sender.tab.id && activeTabs[sender.tab.id]) {
      const remainingSeconds = request.remaining;
      let text = remainingSeconds.toString();
      if (remainingSeconds > 99) {
        text = Math.floor(remainingSeconds / 60) + 'm';
      }
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: text });
    }
  }

  else if (request.type === 'GET_TAB_STATE') {
    const state = activeTabs[request.tabId] || null;
    sendResponse({ state });
  }

  else if (request.type === 'PERFORM_RELOAD') {
    // The content script asks us to reload the tab. 
    // This allows bypass cache reliably.
    if (sender.tab && sender.tab.id && activeTabs[sender.tab.id]) {
      const hardReload = activeTabs[sender.tab.id].hardReload;
      // In Manifest V3, we can use chrome.tabs.reload
      chrome.tabs.reload(sender.tab.id, { bypassCache: hardReload });
    }
  }

  return true; // Indicates async response if needed
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabs[tabId]) {
    delete activeTabs[tabId];
  }
});

// Handle navigation in a tab (e.g. user manually navigates away, or the page reloads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && activeTabs[tabId]) {
    // Re-inject and restart the timer since the page loaded
    const settings = activeTabs[tabId];
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/refresher.js']
    }, () => {
      chrome.tabs.sendMessage(tabId, { type: 'INIT_TIMER', settings });
    });
  }
});
