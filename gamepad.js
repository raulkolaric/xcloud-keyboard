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
