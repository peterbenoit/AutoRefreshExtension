// popup.js
document.addEventListener('DOMContentLoaded', async () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    const randomizeCheckbox = document.getElementById('randomize');
    const hardReloadCheckbox = document.getElementById('hardReload');
    const pauseWhileActiveCheckbox = document.getElementById('pauseWhileActive');
    const statusMessage = document.getElementById('statusMessage');
    const countdownSpan = document.getElementById('countdown');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Load saved defaults or current state
    const { state } = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE', tabId: tab.id });

    if (state) {
        // Tab is currently active
        toggleSwitch.checked = true;
        const totalSeconds = state.interval;
        minutesInput.value = Math.floor(totalSeconds / 60);
        secondsInput.value = totalSeconds % 60;
        randomizeCheckbox.checked = state.randomize;
        hardReloadCheckbox.checked = state.hardReload;
        pauseWhileActiveCheckbox.checked = state.pauseWhileActive !== undefined ? state.pauseWhileActive : true;
        statusMessage.classList.remove('hidden');

        if (state.isPaused) {
            statusMessage.textContent = 'Paused (Activity detected).';
        } else if (state.lastRemaining !== undefined) {
             const span = document.getElementById('countdown');
             if (span) span.textContent = state.lastRemaining;
        }
    } else {
        // Tab is not active, load defaults from storage if available
        chrome.storage.local.get(['defaultMinutes', 'defaultSeconds', 'defaultRandomize', 'defaultHardReload', 'defaultPauseWhileActive'], (res) => {
            if (res.defaultMinutes !== undefined) minutesInput.value = res.defaultMinutes;
            if (res.defaultSeconds !== undefined) secondsInput.value = res.defaultSeconds;
            if (res.defaultRandomize !== undefined) randomizeCheckbox.checked = res.defaultRandomize;
            if (res.defaultHardReload !== undefined) hardReloadCheckbox.checked = res.defaultHardReload;
            if (res.defaultPauseWhileActive !== undefined) pauseWhileActiveCheckbox.checked = res.defaultPauseWhileActive;
            else pauseWhileActiveCheckbox.checked = true; // Default to true
        });
    }

    // Handle toggle
    toggleSwitch.addEventListener('change', async (e) => {
        const isActive = e.target.checked;

        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        const totalSeconds = (m * 60) + s;

        if (isActive && totalSeconds > 0) {
            // Save defaults
            chrome.storage.local.set({
                defaultMinutes: m,
                defaultSeconds: s,
                defaultRandomize: randomizeCheckbox.checked,
                defaultHardReload: hardReloadCheckbox.checked,
                defaultPauseWhileActive: pauseWhileActiveCheckbox.checked
            });

            // Start timer
            await chrome.runtime.sendMessage({
                type: 'START_TIMER',
                tabId: tab.id,
                settings: {
                    interval: totalSeconds,
                    randomize: randomizeCheckbox.checked,
                    hardReload: hardReloadCheckbox.checked,
                    pauseWhileActive: pauseWhileActiveCheckbox.checked
                }
            });
            statusMessage.classList.remove('hidden');
        } else {
            // Stop timer
            if (isActive && totalSeconds === 0) {
                e.target.checked = false; // Cannot start with 0 time
            }
            await chrome.runtime.sendMessage({ type: 'STOP_TIMER', tabId: tab.id });
            statusMessage.classList.add('hidden');
        }
    });

    // Save defaults on change even when not toggling
    const saveDefaults = () => {
        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        chrome.storage.local.set({
            defaultMinutes: m,
            defaultSeconds: s,
            defaultRandomize: randomizeCheckbox.checked,
            defaultHardReload: hardReloadCheckbox.checked,
            defaultPauseWhileActive: pauseWhileActiveCheckbox.checked
        });
    };

    minutesInput.addEventListener('change', saveDefaults);
    secondsInput.addEventListener('change', saveDefaults);
    randomizeCheckbox.addEventListener('change', saveDefaults);
    hardReloadCheckbox.addEventListener('change', saveDefaults);
    pauseWhileActiveCheckbox.addEventListener('change', saveDefaults);

    // Listen to tick updates from the content script for real-time countdown
    chrome.runtime.onMessage.addListener((request, sender) => {
        if (request.type === 'UPDATE_BADGE' && sender.tab && sender.tab.id === tab.id) {
            if (request.isPaused) {
                statusMessage.textContent = 'Paused (Activity detected).';
            } else {
                const span = document.getElementById('countdown');
                if (span) {
                    span.textContent = request.remaining;
                } else {
                    statusMessage.innerHTML = 'Tab will refresh in <span id="countdown">' + request.remaining + '</span>s';
                }
            }
        }
    });
});

