// refresher.js
// Runs in the context of the page to handle precise timing down to the second

if (typeof window.autoRefreshInjected === 'undefined') {
    window.autoRefreshInjected = true;

    let currentRemaining = 0;
    let uiUpdateIntervalId = null;
    let isPaused = false;
    let inactivityTimerId = null;
    const INACTIVITY_DELAY_MS = 30000;

    function handleUserActivity() {
        if (!uiUpdateIntervalId) return; // Only track activity if timer is running

        if (!isPaused) {
            isPaused = true;
            try {
                chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining, isPaused: true }).catch(() => { });
            } catch (e) { }
        }

        if (inactivityTimerId !== null) {
            clearTimeout(inactivityTimerId);
        }

        inactivityTimerId = setTimeout(() => {
            isPaused = false;
            try {
                chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining, isPaused: false }).catch(() => { });
            } catch (e) { }
        }, INACTIVITY_DELAY_MS);
    }

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    function attachActivityListeners() {
        activityEvents.forEach(type => {
            document.addEventListener(type, handleUserActivity, { passive: true });
        });
    }

    function detachActivityListeners() {
        activityEvents.forEach(type => {
            document.removeEventListener(type, handleUserActivity, { passive: true });
        });
    }

    function clearExistingTimers() {
        if (uiUpdateIntervalId !== null) {
            clearInterval(uiUpdateIntervalId);
            uiUpdateIntervalId = null;
        }
        if (inactivityTimerId !== null) {
            clearTimeout(inactivityTimerId);
            inactivityTimerId = null;
        }
        isPaused = false;
        detachActivityListeners();
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
        isPaused = false;

        if (settings.pauseWhileActive !== false) {
            attachActivityListeners();
        }

        // Send initial badge update
        try {
            chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining, isPaused: false }).catch(() => { });
        } catch (e) { }

        // Tick every second to update UI and handle reload
        uiUpdateIntervalId = setInterval(() => {
            if (!isPaused) {
                currentRemaining -= 1;
            }

            if (currentRemaining > 0) {
                try {
                    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', remaining: currentRemaining, isPaused: isPaused }).catch(() => { });
                } catch (e) {
                    // Extension context invalidated (e.g., reloaded extension)
                    clearExistingTimers();
                }
            } else {
                clearExistingTimers();
                try {
                    // We tell the background script to reload us so it handles bypass cache properly 
                    chrome.runtime.sendMessage({ type: 'PERFORM_RELOAD' }).catch(() => { });
                } catch (e) {
                    // Fallback if background disconnected
                    location.reload();
                }
            }
        }, 1000);
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
