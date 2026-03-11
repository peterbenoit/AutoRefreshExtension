# AutoRefresh Secure

A private, per-tab auto-refresh Chrome extension with custom intervals and randomization.

## Features

- **Per-Tab Refresh**: Timers are tied to specific tabs, allowing multiple tabs to refresh at different running intervals.
- **Custom Intervals**: Set exact refresh intervals in minutes and seconds.
- **Randomization (Anti-Detection)**: Add a +/- 20% variance to the refresh interval to mimic human behavior and avoid detection.
- **Hard Reload**: Option to bypass the cache when reloading.
- **Secure & Private**: Runs entirely locally via Manifest V3 without external dependencies or tracking.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `src` folder from this directory.

## Usage

1. Navigate to the page you want to auto-refresh.
2. Click the AutoRefresh Secure icon in the Chrome toolbar.
3. Configure your interval and options.
4. Click **Start**.

## License

MIT License
