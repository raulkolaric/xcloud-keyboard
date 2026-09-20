# Xbox Cloud Keyboard & Mouse Controller Emulator

## Project Goal

Build a lightweight, open-source Chromium extension that allows Xbox Cloud Gaming users to play controller-only games using a keyboard and mouse.

The extension should translate keyboard and mouse input into a virtual Xbox-style gamepad exposed to the Xbox Cloud Gaming webpage through the browser's Gamepad API.

The first goal is **not** to build a polished commercial extension.

The first goal is:

> Make Xbox Cloud Gaming believe a controller is connected and allow a game to be played reasonably well using WASD + mouse.

Target browsers:

- Google Chrome
- Microsoft Edge
- Other Chromium browsers where practical

Primary target platform during development:

- macOS
- Xbox Cloud Gaming website

The architecture should remain portable to Windows/Linux because the implementation should ideally remain entirely inside the browser.

---

# Core Idea

Input flow:

```text
Keyboard / Mouse
        ↓
Extension input capture
        ↓
Input state
        ↓
Virtual gamepad state
        ↓
Gamepad API interception/emulation
        ↓
Xbox Cloud Gaming
        ↓
Game sees Xbox controller
```

We do **not** want to create:

- a macOS kernel extension
- a virtual HID driver
- an OS-level Xbox controller
- a native background service

The preferred implementation is entirely through the Chromium extension and webpage JavaScript environment.

---

# Legal / Implementation Constraint

Do not copy proprietary source code from paid extensions.

Do not attempt to bypass another extension's licensing/payment mechanism.

It is acceptable to:

- study public behavior
- study browser APIs
- study open-source implementations
- independently implement equivalent functionality

If code is reused from an open-source project, verify its license and preserve attribution/license requirements.

Prefer writing our implementation ourselves.

---

# MVP Scope

Version `0.1` should support:

- keyboard → controller buttons
- WASD → left analog stick
- mouse → right analog stick
- left mouse button → right trigger
- right mouse button → left trigger
- configurable mouse sensitivity
- enable/disable hotkey
- pointer lock while enabled
- fake/emulated gamepad visible to the xCloud page
- basic popup UI
- no telemetry
- no account system
- no backend
- no database

The extension should be loadable through:

```text
chrome://extensions
→ Developer Mode
→ Load unpacked
```

---

# Initial Default Mapping

Use a sensible default mapping.

## Movement

```text
W → Left Stick Up
A → Left Stick Left
S → Left Stick Down
D → Left Stick Right
```

Diagonal movement should work.

For example:

```text
W + D
```

should produce approximately:

```text
Left Stick X = +0.707
Left Stick Y = -0.707
```

rather than full `1, -1`, so the vector does not exceed the normal analog stick magnitude.

---

# Mouse

Mouse controls the right analog stick.

```text
Mouse Left  → Right Stick Left
Mouse Right → Right Stick Right
Mouse Up    → Right Stick Up
Mouse Down  → Right Stick Down
```

Use Pointer Lock when controller emulation is enabled.

Mouse movement should be based on:

```js
event.movementX
event.movementY
```

rather than absolute cursor position.

---

# Mouse-to-Stick Problem

This is one of the main technical challenges.

A mouse represents:

```text
movement delta
```

while a controller stick represents:

```text
persistent position from -1.0 to +1.0
```

Therefore we need to convert mouse velocity/deltas into temporary right-stick values.

Conceptually:

```text
movementX * sensitivity
        ↓
rightStickX
        ↓
clamp(-1, 1)
        ↓
decay toward 0
```

Example:

```js
rightStickX += movementX * sensitivity;
rightStickY += movementY * sensitivity;

rightStickX = clamp(rightStickX, -1, 1);
rightStickY = clamp(rightStickY, -1, 1);
```

Then gradually return the stick toward zero.

Possible model:

```js
stick *= decayFactor;
```

on each animation frame.

Do not overengineer this initially.

First make mouse aiming functional.

Later we can improve:

- smoothing
- acceleration
- response curves
- deadzones
- per-game profiles

---

# Mouse Buttons

Initial mapping:

```text
Left Mouse Button  → RT
Right Mouse Button → LT
```

This corresponds naturally to:

```text
shoot → RT
aim   → LT
```

for many games.

---

# Keyboard Button Mapping

Suggested defaults:

```text
Space       → A
C           → B
R           → X
E           → Y

Q           → LB
F           → RB

Shift       → Left Stick Click
Middle Mouse→ Right Stick Click

Tab         → View / Back
Enter       → Menu / Start

Arrow Keys  → D-Pad
```

These mappings should eventually be configurable.

For the MVP they may be hard-coded internally while keeping the mapping table centralized.

---

# Toggle Hotkey

Use:

```text
F8
```

to enable/disable keyboard and mouse capture.

Behavior:

### F8 ON

- enable controller emulation
- capture relevant keyboard events
- request pointer lock
- intercept mouse movement
- show virtual controller

### F8 OFF

- release pointer lock
- stop intercepting keyboard/mouse
- return normal browser interaction
- virtual controller can either disconnect or become neutral

Escape should continue to behave sensibly with browser pointer-lock behavior.

---

# Virtual Controller

Expose a controller resembling a standard Xbox controller.

Conceptually:

```js
{
  id: "Xbox 360 Controller (XInput STANDARD GAMEPAD)",
  index: 0,
  connected: true,
  mapping: "standard",
  axes: [
    leftStickX,
    leftStickY,
    rightStickX,
    rightStickY
  ],
  buttons: [...]
}
```

Exact values/order must match the browser's `"standard"` Gamepad mapping.

Investigate the current Gamepad API shape before final implementation.

---

# Gamepad API Strategy

Likely interception point:

```js
navigator.getGamepads
```

Xbox Cloud Gaming will periodically call this API.

Our injected page script should make the virtual controller appear in the returned array.

Potential architecture:

```text
content script
      ↓
inject page-context script
      ↓
override/wrap navigator.getGamepads()
      ↓
return virtual controller
```

Important:

Chrome extension content scripts run in an isolated JavaScript world.

Therefore simply overriding:

```js
navigator.getGamepads
```

inside a normal content script may not affect page JavaScript.

The Gamepad override may need to execute in the webpage's **MAIN world**.

Investigate the cleanest Manifest V3-compatible method.

Possible approaches:

- `chrome.scripting.executeScript({ world: "MAIN" })`
- injected `<script>` element
- another MV3-compatible main-world injection mechanism

Prefer the most robust current Chromium approach.

---

# Extension Architecture

Suggested structure:

```text
xcloud-keyboard-mouse/
├── context.md
├── README.md
├── LICENSE
├── manifest.json
├── package.json
├── tsconfig.json
│
├── src/
│   ├── content/
│   │   ├── content.ts
│   │   ├── keyboard.ts
│   │   ├── mouse.ts
│   │   └── pointerLock.ts
│   │
│   ├── injected/
│   │   └── gamepad.ts
│   │
│   ├── shared/
│   │   ├── mappings.ts
│   │   ├── gamepadState.ts
│   │   └── messages.ts
│   │
│   └── popup/
│       ├── popup.html
│       ├── popup.ts
│       └── popup.css
│
└── dist/
```

Exact structure may change if a simpler architecture is better.

Do not add unnecessary framework dependencies.

Plain TypeScript + DOM APIs are preferred.

---

# Gamepad State

Maintain one canonical state object.

Example:

```ts
interface VirtualGamepadState {
  connected: boolean;

  axes: {
    leftX: number;
    leftY: number;
    rightX: number;
    rightY: number;
  };

  buttons: {
    a: boolean;
    b: boolean;
    x: boolean;
    y: boolean;

    lb: boolean;
    rb: boolean;

    lt: number;
    rt: number;

    leftStick: boolean;
    rightStick: boolean;

    dpadUp: boolean;
    dpadDown: boolean;
    dpadLeft: boolean;
    dpadRight: boolean;

    view: boolean;
    menu: boolean;
  };
}
```

Axis range:

```text
-1.0 → +1.0
```

Trigger range:

```text
0.0 → 1.0
```

---

# Communication Between Worlds

Because the keyboard listener and page-level Gamepad override may run in separate execution contexts, establish a simple communication channel.

Possible approaches:

- `window.postMessage`
- DOM CustomEvent
- extension messaging where appropriate

Example concept:

```text
content script
    ↓
captures keyboard/mouse
    ↓
window.postMessage({
    type: "XCLOUD_GAMEPAD_STATE",
    state: ...
})
    ↓
main-world injected script
    ↓
updates fake Gamepad object
```

Avoid sending messages unnecessarily for every animation frame if direct/shared mechanisms are available.

Performance matters for mouse input.

---

# Rendering / Update Loop

Use:

```js
requestAnimationFrame()
```

for:

- right-stick decay
- button timestamp updates
- virtual gamepad state updates if necessary

Avoid high-frequency timers if possible.

Target:

```text
60+ updates/sec
```

without noticeable browser overhead.

---

# Popup UI

Keep the first UI extremely simple.

Example:

```text
Xbox Cloud KBM

[✓] Enabled

Mouse sensitivity
[----------●-----] 1.0

Toggle hotkey: F8

Status:
Virtual controller connected
```

Settings:

```text
enabled
mouseSensitivity
```

Persist settings using:

```js
chrome.storage.local
```

No cloud sync required.

---

# Manifest

Use Manifest V3.

Permissions should be minimal.

Likely:

```json
{
  "manifest_version": 3
}
```

Host permissions should be restricted to Xbox Cloud Gaming domains where possible.

Do not request:

```text
<all_urls>
```

unless technically necessary.

Determine the current xCloud host/domain and restrict accordingly.

---

# Security / Privacy

The extension must:

- contain no telemetry
- contain no analytics
- send no keystrokes anywhere
- make no external network requests unless absolutely required
- store settings locally
- operate only on Xbox Cloud Gaming pages
- clearly isolate keyboard capture to enabled state

We are capturing keyboard input, so minimize privileges aggressively.

---

# Performance Goals

Input latency should be as low as practical.

Avoid:

- React
- large UI frameworks
- unnecessary dependencies
- excessive object allocation on every mouse event
- frequent storage writes
- unnecessary extension messaging

Mouse input may arrive hundreds of times per second.

Hot paths should be simple.

---

# MVP Acceptance Criteria

The MVP is considered successful when all of these work:

## Controller Detection

Xbox Cloud Gaming recognizes that a controller is connected.

A controller-required game can be launched without requiring a physical controller.

## Movement

```text
W
A
S
D
```

control the left analog stick.

Diagonal movement works correctly.

## Camera

Moving the mouse controls the camera through the right analog stick.

Pointer lock prevents the cursor from leaving the game.

## Combat

```text
LMB → RT
RMB → LT
```

work.

## Buttons

At minimum these work:

```text
A
B
X
Y
LB
RB
Menu
View
```

## Toggle

Pressing:

```text
F8
```

reliably enables/disables emulation.

## Settings

Mouse sensitivity survives page reloads.

## Browser

Confirmed working in at least one current Chromium browser.

Preferably test:

```text
Chrome
Edge
```

---

# Initial Testing Strategy

Before testing Xbox Cloud itself, create or use a simple browser debug page that prints:

```js
navigator.getGamepads()
```

and displays:

- controller connection
- axes
- buttons
- trigger values

This makes debugging much easier.

Test in this order:

### Test 1 — Extension injection

Confirm the extension executes on the desired domain.

### Test 2 — Fake controller

Confirm:

```js
navigator.getGamepads()[0]
```

returns our virtual gamepad.

### Test 3 — Keyboard

Press:

```text
W
```

Expected approximately:

```text
axes[1] = -1
```

Release:

```text
axes[1] = 0
```

### Test 4 — Diagonal normalization

Press:

```text
W + D
```

Ensure the resulting vector magnitude does not exceed `1`.

### Test 5 — Buttons

Press Space.

Expected:

```text
A.pressed = true
A.value = 1
```

Release it.

Expected:

```text
A.pressed = false
A.value = 0
```

### Test 6 — Mouse

Enable pointer lock.

Move mouse.

Verify right-stick axes respond.

Stop moving.

Verify axes return smoothly toward zero.

### Test 7 — Xbox Cloud Gaming

Open a controller-required title.

Confirm the website detects the virtual controller.

---

# Implementation Order

Codex should implement the project incrementally.

## Phase 1

Create basic extension skeleton:

```text
manifest.json
content script
main-world injected script
```

Verify extension loads.

---

## Phase 2

Implement virtual controller.

Hard-code a neutral gamepad:

```text
Left stick  = 0,0
Right stick = 0,0
Buttons     = released
```

Verify:

```js
navigator.getGamepads()
```

shows the controller.

Do not continue until this works.

---

## Phase 3

Implement keyboard mapping.

Add:

```text
WASD
Space
R
E
```

Verify values through a debug page.

---

## Phase 4

Implement mouse.

Add:

- Pointer Lock
- `movementX`
- `movementY`
- sensitivity
- clamping
- basic decay

Make it functional before optimizing the feel.

---

## Phase 5

Add remaining controller buttons.

---

## Phase 6

Add F8 enable/disable.

---

## Phase 7

Add popup.

Settings:

```text
Enable
Sensitivity
```

---

## Phase 8

Test against Xbox Cloud Gaming.

Fix compatibility issues based on actual behavior.

---

# Important Engineering Principle

Do not build the entire extension before proving that Xbox Cloud Gaming accepts the emulated Gamepad API object.

The first major milestone is simply:

```text
Xbox Cloud website
      ↓
navigator.getGamepads()
      ↓
our controller appears
      ↓
Xbox recognizes it
```

If that mechanism does not work, investigate that before writing UI or configuration systems.

---

# Potential Problems

Codex should specifically watch for these.

## 1. `Gamepad` objects may not be normally constructible

Browser APIs sometimes expose native objects that cannot simply be created with:

```js
new Gamepad()
```

A plain object matching the expected interface may be required.

Investigate runtime behavior.

---

## 2. Read-only properties

Properties on the native Gamepad API may be read-only.

It may be cleaner to return our own gamepad-like object from a wrapped:

```js
navigator.getGamepads
```

call.

---

## 3. MAIN vs isolated world

Chrome content scripts execute separately from page scripts.

Xbox's JavaScript must see the override.

This is critical.

---

## 4. Xbox may listen for gamepad events

It may use:

```text
gamepadconnected
gamepaddisconnected
```

in addition to polling `navigator.getGamepads()`.

If necessary, emit appropriate events when enabling/disabling the virtual controller.

Investigate actual behavior before adding unnecessary complexity.

---

## 5. Mouse aiming may feel bad

Do not treat this as a blocker for the first prototype.

Once functionality works, experiment with:

```text
sensitivity
decay
smoothing
acceleration curve
deadzone
```

---

## 6. Browser shortcuts

Some keyboard inputs may trigger browser actions.

Prevent default behavior only when:

```text
extension enabled AND game focused
```

Do not globally break keyboard navigation.

---

# Future Features

Do not implement these until MVP works.

Possible later roadmap:

## Custom bindings

Allow every keyboard/mouse input to be mapped to controller controls.

---

## Per-game profiles

Examples:

```text
Halo Infinite
Forza Horizon
GTA V
Minecraft
Call of Duty
```

---

## Mouse curves

Profiles such as:

```text
Linear
Smooth
FPS
Precise
Fast
```

---

## Deadzone controls

```text
Left stick deadzone
Right stick deadzone
```

---

## Separate sensitivity

```text
Horizontal sensitivity
Vertical sensitivity
```

---

## Invert Y

Optional:

```text
Invert vertical axis
```

---

## Sensitivity hotkeys

Example:

```text
Ctrl + +
Ctrl + -
```

---

## Overlay

Small overlay:

```text
KBM ON
Sensitivity 1.25x
```

---

## Import/export profiles

JSON format.

---

# Non-Goals for v0.1

Do not implement:

- user accounts
- cloud database
- backend server
- subscriptions
- payments
- analytics
- telemetry
- Chrome account sync
- native drivers
- native applications
- Steam Input integration
- physical controller remapping
- macros
- automation
- recoil scripts
- aim assist modifications
- game-specific cheats

This project should only translate legitimate user input into controller input.

---

# Development Philosophy

Prefer:

```text
small
simple
observable
testable
```

over abstraction.

Do not prematurely create:

- dependency injection systems
- state frameworks
- complicated event buses
- monorepos
- UI frameworks

The initial implementation may be only a few hundred lines.

That is desirable.

---

# Coding Style

Use TypeScript where practical.

Prefer:

```ts
const
```

over mutable globals where possible.

Keep input state centralized.

Use explicit types for controller state.

Separate:

```text
physical input
```

from:

```text
virtual controller state
```

Example:

```text
KeyboardState
      ↓
Mapping layer
      ↓
VirtualGamepadState
      ↓
Gamepad API adapter
```

This separation will make rebinding easier later.

---

# Repository Goal

The eventual repository should be understandable immediately by another developer.

README should eventually include:

```text
What it does
How it works
How to install
Default controls
Development instructions
Known limitations
Privacy statement
License
```

---

# First Task for Codex

Start by proving the core mechanism.

Implement the smallest possible Manifest V3 Chromium extension that:

1. Loads on Xbox Cloud Gaming.
2. Injects JavaScript into the page's main execution world.
3. Wraps or overrides `navigator.getGamepads()`.
4. Returns one neutral Xbox-style standard gamepad.
5. Handles controller connection semantics if necessary.
6. Logs enough diagnostic information during development to verify detection.
7. Does not yet implement the popup or advanced settings.

Once the fake controller is visible and accepted by Xbox Cloud Gaming, commit that milestone separately.

Then implement keyboard mapping.

Do not spend time polishing UI until controller detection has been proven.