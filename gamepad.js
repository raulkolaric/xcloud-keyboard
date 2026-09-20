(() => {
  const nativeGetGamepads = navigator.getGamepads.bind(navigator);
  const gamepad = {
    id: "Xbox 360 Controller (XInput STANDARD GAMEPAD) - XCLOUD KBM",
    index: 0,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    get timestamp() { return performance.now(); },
    vibrationActuator: null,
    hapticActuators: []
  };
  const keys = new Set();
  const buttonKeys = {
    Space: 0, KeyC: 1, KeyR: 2, KeyE: 3,
    KeyQ: 4, KeyF: 5, ShiftLeft: 10,
    Tab: 8, Enter: 9,
    ArrowUp: 12, ArrowDown: 13, ArrowLeft: 14, ArrowRight: 15
  };
  let enabled = false;

  const updateKeyboard = () => {
    let x = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    let y = Number(keys.has("KeyS")) - Number(keys.has("KeyW"));
    const length = Math.hypot(x, y) || 1;
    gamepad.axes[0] = x / length;
    gamepad.axes[1] = y / length;
    for (const [key, index] of Object.entries(buttonKeys)) {
      const pressed = keys.has(key);
      Object.assign(gamepad.buttons[index], { pressed, touched: pressed, value: Number(pressed) });
    }
  };

  const clearKeyboard = () => {
    keys.clear();
    updateKeyboard();
  };

  for (const type of ["keydown", "keyup"]) {
    window.addEventListener(type, event => {
      if (event.code === "F8" && type === "keydown" && !event.repeat) {
        enabled = !enabled;
        clearKeyboard();
        console.info("[Xbox Cloud KBM] Keyboard", enabled ? "enabled" : "disabled");
        event.preventDefault();
        return;
      }
      if (!enabled || !document.hasFocus() ||
          event.target instanceof HTMLElement &&
          (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
      if (event.code.startsWith("Arrow") || event.code in buttonKeys ||
          ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        if (type === "keydown") keys.add(event.code);
        else keys.delete(event.code);
        updateKeyboard();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
  window.addEventListener("blur", clearKeyboard);

  navigator.getGamepads = () => {
    const pads = Array.from(nativeGetGamepads());
    gamepad.index = pads.findIndex(pad => pad == null);
    if (gamepad.index < 0) gamepad.index = pads.length;
    pads[gamepad.index] = gamepad;
    return pads;
  };

  const announce = () => {
    navigator.getGamepads();
    const event = new Event("gamepadconnected");
    Object.defineProperty(event, "gamepad", { value: gamepad });
    window.dispatchEvent(event);
    console.info("[Xbox Cloud KBM] Virtual controller exposed at index", gamepad.index);
  };
  if (document.readyState === "complete") announce();
  else window.addEventListener("load", announce, { once: true });
})();
