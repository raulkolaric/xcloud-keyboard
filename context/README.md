# Project context

The original project brief is preserved in [brief.md](brief.md).

## Goal

Independently build a small, browser-only Chromium extension that lets keyboard and mouse control Xbox Cloud Gaming through a virtual standard gamepad. No telemetry, backend, native driver, or borrowed proprietary code.

## Current milestone

Prove that Xbox Cloud Gaming accepts a neutral virtual controller. `gamepad.js` runs in the page's MAIN world at `document_start`, wraps `navigator.getGamepads()`, preserves native pads, appends a 4-axis/17-button neutral pad, and emits `gamepadconnected` on load. There are no extension permissions.

## Gate before keyboard work

1. Load this folder unpacked in Chrome or Edge.
2. Open `https://www.xbox.com/play`, open DevTools, and run `navigator.getGamepads()`.
3. Confirm the virtual pad appears with `mapping: "standard"`, four zero axes, and 17 released buttons.
4. Launch a controller-required game and confirm Xbox accepts it. Record browser/version and result here.

The local test checks JavaScript behavior; it cannot prove Xbox accepts an object returned by the patched API. If Xbox rejects it, inspect whether the site reads Gamepad APIs in a child frame, captures `getGamepads` before injection, or checks for a native `Gamepad` instance.

## Live test attempt (2026-09-20)

The user opened Forza Horizon 6 at `www.xbox.com/pt-BR/play/launch/forza-horizon-6/9NR1R1XWLCNB` in the Codex in-app browser. The stream reached the game's start screen. This browser session did not expose a way to load the unpacked extension or inspect `navigator.getGamepads()` in the page's JavaScript world, so controller detection remains unverified. Test in Chrome or Edge with the extension loaded.

## Next milestone after gate

Add keyboard input and the centralized mapping table, then mouse and pointer lock, F8 toggle, and finally settings UI. Keep each milestone independently testable.

## References

- Chrome content-script MAIN world and `document_start`: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- W3C Gamepad API and standard layout: https://www.w3.org/TR/gamepad/
- Xbox Cloud Gaming entry point: https://www.xbox.com/play
