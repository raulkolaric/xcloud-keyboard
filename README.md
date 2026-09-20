# Xbox Cloud KBM prototype

This is the first proof of concept for a keyboard-and-mouse Xbox Cloud Gaming extension. It currently exposes a neutral virtual gamepad; it does **not** yet translate input.

## Try it

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode and choose **Load unpacked**. Select this repository folder.
3. Open `https://www.xbox.com/play` and inspect `navigator.getGamepads()` in DevTools. Look for the `XCLOUD KBM` controller.
4. Try launching a controller-required game and note whether Xbox recognizes the pad.

Run the local smoke check with `node --test`. See [context/README.md](context/README.md) for the acceptance gate and next steps.

The extension runs only on Xbox Cloud Gaming URLs and requests no permissions. It makes no network requests and stores no data. The browser-only approach may fail if Xbox requires a native `Gamepad` object; live site acceptance has not yet been verified.
