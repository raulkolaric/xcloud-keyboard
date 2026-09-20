const enabled = document.getElementById("enabled");
const sensitivity = document.getElementById("sensitivity");
const value = document.getElementById("value");
chrome.storage.local.get({ enabled: false, sensitivity: 0.025 }, settings => {
  enabled.checked = settings.enabled;
  sensitivity.value = settings.sensitivity;
  value.textContent = settings.sensitivity;
});
enabled.addEventListener("change", () => chrome.storage.local.set({ enabled: enabled.checked }));
sensitivity.addEventListener("input", () => { value.textContent = sensitivity.value; });
sensitivity.addEventListener("change", () => chrome.storage.local.set({ sensitivity: Number(sensitivity.value) }));
