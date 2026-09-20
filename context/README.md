# Project context and test findings

The original user brief is preserved in [brief.md](brief.md).

## Implementation

This is a small Manifest V3 extension with no build step or dependencies. `gamepad.js` runs in the page's MAIN world at `document_start`. It wraps `navigator.getGamepads()`, preserves physical pads, fills the first empty slot with a 4-axis/17-button standard pad, and announces a connection on load and when input is enabled. F8 gates keyboard and mouse capture. `settings.js` bridges local storage into the page; the popup edits enabled state and mouse sensitivity. The only extension permission is `storage`. There is no telemetry or network code.

## Live findings, 2026-09-20

- The Codex in-app browser streamed Forza Horizon 6 but could not load the unpacked extension or inspect its page Gamepad API. Brave was used for extension testing instead.
- Brave loaded the extension on `www.xbox.com/en-US/play/launch/forza-horizon-6-standard-edition/9N431PX143P8`. Its native Gamepad array had four empty slots. Appending at index 4 was wrong for this case; the virtual pad now occupies index 0.
- Chromium rejected `new GamepadEvent(..., { gamepad: plainObject })`. A generic `Event` with a `gamepad` property dispatched without that error. The console showed `Virtual controller exposed at index 0`.
- The page returned the virtual pad with `connected: true`, `mapping: "standard"`, four axes, and 17 buttons. A synthetic keyboard Space keydown made button 0 report value 1; keyup returned it to 0. The local test covers F8 gating, diagonal WASD, mouse axes and trigger, and settings bridge.
- Forza displayed a controller-disconnected screen after reloading the stream. A fresh synthetic connection event plus a held A button cleared that screen. A synthetic held Space keydown routed through the extension also cleared it and advanced the game's assists menu to its confirmation prompt. This proves the live game accepted the mapped A input. The connection announcement was added to the F8 enable transition for recovery; the game can still show the disconnect screen after a page reload.
- Automated single-key taps through Brave control did not advance the menu, while a sustained keydown did. DevTools and browser automation also paused the stream intermittently, so those taps do not establish a normal-user input failure. The trial 80 ms release delay was removed because it did not improve that test and would add input lag.
- DevTools occasionally showed unrelated fetch/media errors while the stream was paused. No account or multiplayer actions were performed.

## Remaining acceptance checks

In a stable, focused stream, verify physical W/A/S/D movement, mouse camera movement under pointer lock, and both mouse triggers through actual gameplay. Also confirm ordinary physical Space taps and F8 reconnection after a stream reload. Chrome or Edge testing remains open; Brave is the only Chromium browser tested live so far.

## References

- Chrome MAIN world content scripts: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- W3C Gamepad API and standard layout: https://www.w3.org/TR/gamepad/
- Xbox Cloud Gaming: https://www.xbox.com/play
