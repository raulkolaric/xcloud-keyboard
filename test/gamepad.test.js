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
    document: { readyState: "loading" },
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
    document: { readyState: "loading" },
    performance: { now: () => 0 },
    console: { info() {} }
  });
  const pads = navigator.getGamepads();
  assert.equal(pads.length, 4);
  assert.equal(pads[0].index, 0);
});

test("F8 gates keyboard input and normalizes diagonal movement", () => {
  const listeners = {};
  const navigator = { getGamepads: () => [] };
  const source = fs.readFileSync(path.join(__dirname, "../gamepad.js"), "utf8");
  vm.runInNewContext(source, {
    navigator,
    window: { addEventListener: (type, fn) => { listeners[type] = fn; } },
    Event: class {}, HTMLElement: class {},
    document: { readyState: "loading", hasFocus: () => true },
    performance: { now: () => 0 },
    console: { info() {} }
  });
  const pad = navigator.getGamepads()[0];
  const key = (type, code) => listeners[type]({ code, repeat: false, target: null,
    preventDefault() {}, stopImmediatePropagation() {} });
  key("keydown", "KeyW");
  assert.equal(pad.axes[1], 0);
  key("keydown", "F8");
  key("keydown", "KeyW");
  key("keydown", "KeyD");
  assert.ok(Math.abs(pad.axes[0] - Math.SQRT1_2) < 0.001);
  assert.ok(Math.abs(pad.axes[1] + Math.SQRT1_2) < 0.001);
  key("keydown", "Space");
  assert.equal(pad.buttons[0].value, 1);
  key("keyup", "Space");
  assert.equal(pad.buttons[0].value, 0);
  listeners.blur();
  assert.equal(pad.axes[0], 0);
  key("keydown", "F8");
  key("keydown", "Space");
  assert.equal(pad.buttons[0].value, 0);
});
