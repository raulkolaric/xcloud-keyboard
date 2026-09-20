const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

test("exposes one neutral standard pad and preserves physical pads", () => {
  const events = {};
  const physical = { id: "physical", index: 0 };
  const navigator = { getGamepads: () => [physical] };
  const window = {
    addEventListener: (name, fn) => { events[name] = fn; },
    dispatchEvent: event => { events.dispatched = event; }
  };
  class Event {
    constructor(type) { this.type = type; }
  }
  const source = fs.readFileSync(path.join(__dirname, "../gamepad.js"), "utf8");
  vm.runInNewContext(source, {
    navigator, window, Event,
    document: { readyState: "loading", addEventListener() {} },
    requestAnimationFrame() {},
    performance: { now: () => 42 },
    console: { info() {} }
  });

  const pads = navigator.getGamepads();
  assert.equal(pads[0], physical);
  assert.equal(pads[1].index, 1);
  assert.equal(pads[1].mapping, "standard");
  assert.deepEqual(Array.from(pads[1].axes), [0, 0, 0, 0]);
  assert.equal(pads[1].buttons.length, 17);
  assert.ok(pads[1].buttons.every(button => !button.pressed && !button.touched && button.value === 0));
  assert.equal(pads[1].timestamp, 42);
  events.load();
  assert.equal(events.dispatched.type, "gamepadconnected");
  assert.equal(events.dispatched.gamepad, pads[1]);
});

test("uses an empty native slot before adding a fifth controller", () => {
  const navigator = { getGamepads: () => [null, null, null, null] };
  const source = fs.readFileSync(path.join(__dirname, "../gamepad.js"), "utf8");
  vm.runInNewContext(source, {
    navigator,
    window: { addEventListener() {} },
    Event: class {},
    document: { readyState: "loading", addEventListener() {} },
    requestAnimationFrame() {},
    performance: { now: () => 0 },
    console: { info() {} }
  });
  const pads = navigator.getGamepads();
  assert.equal(pads.length, 4);
  assert.equal(pads[0].index, 0);
});

test("F8 gates keyboard input and normalizes diagonal movement", () => {
  const listeners = {};
  const dispatched = [];
  const navigator = { getGamepads: () => [] };
  const document = { readyState: "loading", hasFocus: () => true, addEventListener() {},
    body: { requestPointerLock: () => Promise.resolve() }, exitPointerLock() {} };
  const source = fs.readFileSync(path.join(__dirname, "../gamepad.js"), "utf8");
  vm.runInNewContext(source, {
    navigator,
    window: { addEventListener: (type, fn) => { listeners[type] = fn; }, dispatchEvent: event => dispatched.push(event) },
    Event: class { constructor(type) { this.type = type; } }, HTMLElement: class {},
    document,
    requestAnimationFrame() {},
    performance: { now: () => 0 },
    console: { info() {} }
  });
  const pad = navigator.getGamepads()[0];
  const key = (type, code) => listeners[type]({ code, repeat: false, target: null,
    preventDefault() {}, stopImmediatePropagation() {} });
  key("keydown", "KeyW");
  assert.equal(pad.axes[1], 0);
  key("keydown", "F8");
  assert.ok(dispatched.some(event => event.type === "gamepadconnected" && event.gamepad === pad));
  key("keydown", "KeyW");
  key("keydown", "KeyD");
  assert.ok(Math.abs(pad.axes[0] - Math.SQRT1_2) < 0.001);
  assert.ok(Math.abs(pad.axes[1] + Math.SQRT1_2) < 0.001);
  key("keydown", "Space");
  assert.equal(pad.buttons[0].value, 1);
  key("keyup", "Space");
  assert.equal(pad.buttons[0].value, 0);
  document.pointerLockElement = document.body;
  listeners.mousemove({ movementX: 100, movementY: -10 });
  assert.equal(pad.axes[2], 1);
  assert.equal(pad.axes[3], -0.25);
  listeners.XCLOUD_KBM_SETTINGS({ detail: JSON.stringify({ sensitivity: 0.05 }) });
  listeners.mousemove({ movementX: 0, movementY: -10 });
  assert.equal(pad.axes[3], -0.75);
  listeners.mousedown({ button: 0, preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(pad.buttons[7].value, 1);
  listeners.mouseup({ button: 0, preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(pad.buttons[7].value, 0);
  listeners.blur();
  assert.equal(pad.axes[0], 0);
  assert.equal(pad.axes[2], 0);
  key("keydown", "F8");
  key("keydown", "Space");
  assert.equal(pad.buttons[0].value, 0);
});

test("settings bridge publishes local values and stores F8 toggles", () => {
  const listeners = {};
  const published = [];
  const saved = [];
  const chrome = { storage: {
    local: {
      get: (_defaults, callback) => callback({ enabled: false, sensitivity: 0.025 }),
      set: value => saved.push(value)
    },
    onChanged: { addListener: callback => { listeners.storage = callback; } }
  } };
  const source = fs.readFileSync(path.join(__dirname, "../settings.js"), "utf8");
  vm.runInNewContext(source, {
    chrome,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: { addEventListener: (type, callback) => { listeners[type] = callback; },
      dispatchEvent: event => published.push(JSON.parse(event.detail)) }
  });
  assert.equal(published[0].sensitivity, 0.025);
  listeners.XCLOUD_KBM_TOGGLE();
  assert.equal(saved[0].enabled, true);
  listeners.storage({ sensitivity: { newValue: 0.05 } }, "local");
  assert.equal(published[1].sensitivity, 0.05);
});
