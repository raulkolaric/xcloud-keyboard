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
  let sensitivity = 0.025;

  const setEnabled = (value, lock = false) => {
    enabled = value;
    clearKeyboard();
    clearMouse();
    if (enabled && lock) document.body?.requestPointerLock().catch(error => console.warn("[Xbox Cloud KBM] Pointer lock failed", error));
    if (!enabled && document.pointerLockElement) document.exitPointerLock();
    console.info("[Xbox Cloud KBM] Keyboard and mouse", enabled ? "enabled" : "disabled");
  };

  window.addEventListener("XCLOUD_KBM_SETTINGS", event => {
    const settings = JSON.parse(event.detail);
    if (typeof settings.sensitivity === "number" && Number.isFinite(settings.sensitivity))
      sensitivity = Math.max(0.005, Math.min(0.1, settings.sensitivity));
    if (typeof settings.enabled === "boolean" && settings.enabled !== enabled)
      setEnabled(settings.enabled);
  });

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
  const clearMouse = () => {
    gamepad.axes[2] = gamepad.axes[3] = 0;
    for (const index of [6, 7, 11]) Object.assign(gamepad.buttons[index], { pressed: false, touched: false, value: 0 });
  };

  window.addEventListener("mousemove", event => {
    if (!enabled || !document.pointerLockElement) return;
    gamepad.axes[2] = Math.max(-1, Math.min(1, gamepad.axes[2] + event.movementX * sensitivity));
    gamepad.axes[3] = Math.max(-1, Math.min(1, gamepad.axes[3] + event.movementY * sensitivity));
  }, true);
  for (const type of ["mousedown", "mouseup"]) {
    window.addEventListener(type, event => {
      if (!enabled || !document.pointerLockElement || ![0, 1, 2].includes(event.button)) return;
      const index = [7, 11, 6][event.button];
      const pressed = type === "mousedown";
      Object.assign(gamepad.buttons[index], { pressed, touched: pressed, value: Number(pressed) });
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  window.addEventListener("contextmenu", event => {
    if (enabled && document.pointerLockElement) event.preventDefault();
  }, true);
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement) clearMouse();
  });
  const decayMouse = () => {
    gamepad.axes[2] *= 0.65;
    gamepad.axes[3] *= 0.65;
    if (Math.abs(gamepad.axes[2]) < 0.001) gamepad.axes[2] = 0;
    if (Math.abs(gamepad.axes[3]) < 0.001) gamepad.axes[3] = 0;
    requestAnimationFrame(decayMouse);
  };
  requestAnimationFrame(decayMouse);

  for (const type of ["keydown", "keyup"]) {
    window.addEventListener(type, event => {
      if (event.code === "F8" && type === "keydown" && !event.repeat) {
        setEnabled(!enabled, true);
        window.dispatchEvent(new Event("XCLOUD_KBM_TOGGLE"));
        event.preventDefault();
        return;
      }
      if (!enabled ||
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
  window.addEventListener("pointerdown", () => {
    if (enabled && !document.pointerLockElement) document.body?.requestPointerLock().catch(() => {});
  }, true);
  window.addEventListener("blur", () => { clearKeyboard(); clearMouse(); });

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
