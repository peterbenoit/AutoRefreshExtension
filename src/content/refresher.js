// refresher.js
// Runs in the context of the page to handle precise timing down to the second

if (typeof window.autoRefreshInjected === 'undefined') {
    window.autoRefreshInjected = true;

    let timerId = null;
    let currentRemaining = 0;
    let uiUpdateIntervalId = null;

    function clearExistingTimers() {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
        if (uiUpdateIntervalId !== null) {
            clearInterval(uiUpdateIntervalId);
            uiUpdateIntervalId = null;
        }
    }

    function startTimer(settings) {
        clearExistingTimers();

        // Calculate actual interval
        let targetIntervalSeconds = settings.interval; // in seconds

        if (settings.randomize) {
            // +/- 20%
            const variance = targetIntervalSeconds * 0.2;
            const randomOffset = (Math.random() * variance * 2) - variance;
            targetIntervalSeconds = Math.max(1, Math.round(targetIntervalSeconds + randomOffset));
        }

        currentRemaining = targetIntervalSeconds;

        // Send initial badge update
        try {
            chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining }).catch(() => { });
        } catch (e) { }

        // Tick every second to update UI
        uiUpdateIntervalId = setInterval(() => {
            currentRemaining -= 1;
            if (currentRemaining > 0) {
                try {
                    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining }).catch(() => { });
                } catch (e) {
                    // Extension context invalidated (e.g., reloaded extension)
                    clearExistingTimers();
                }
            }
        }, 1000);

        // The actual reload timer
        timerId = setTimeout(() => {
            clearExistingTimers();
            try {
                // We tell the background script to reload us so it handles bypass cache properly 
                chrome.runtime.sendMessage({ type: 'PERFORM_RELOAD' }).catch(() => { });
            } catch (e) {
                // Fallback if background disconnected
                location.reload();
            }
        }, targetIntervalSeconds * 1000);
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'INIT_TIMER') {
            startTimer(request.settings);
            sendResponse({ success: true });
        } else if (request.type === 'CANCEL_TIMER') {
            clearExistingTimers();
            sendResponse({ success: true });
        }
    });
}
