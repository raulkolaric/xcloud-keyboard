# Xbox Cloud KBM prototype

This is a prototype keyboard-and-mouse Xbox Cloud Gaming extension. It exposes a virtual standard gamepad and translates input while enabled with F8.

## Try it

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode and choose **Load unpacked**. Select this repository folder.
3. Open `https://www.xbox.com/play` and inspect `navigator.getGamepads()` in DevTools. Look for the `XCLOUD KBM` controller.
4. Press F8 on the game page to enable input. Press F8 again to disable it. Escape releases pointer lock.

Controls: WASD = left stick; mouse = right stick; left/right mouse = RT/LT; middle mouse = right stick click; Space/C/R/E = A/B/X/Y; Q/F = LB/RB; Shift = left stick click; Tab/Enter = View/Menu; arrows = D-pad.

Run the local smoke check with `node --test`. See [context/README.md](context/README.md) for the acceptance gate and next steps.

The extension runs only on Xbox Cloud Gaming URLs and requests no permissions. It makes no network requests and stores no data. The browser-only approach may fail if Xbox requires a native `Gamepad` object; live game response has not yet been verified. Mouse sensitivity is fixed at `0.025` pending a settings UI.
