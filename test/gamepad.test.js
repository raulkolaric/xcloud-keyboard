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
  class GamepadEvent {
    constructor(type, options) { this.type = type; this.gamepad = options.gamepad; }
  }
  const source = fs.readFileSync(path.join(__dirname, "../gamepad.js"), "utf8");
  vm.runInNewContext(source, {
    navigator, window, GamepadEvent,
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
