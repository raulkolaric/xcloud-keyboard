const defaults = { enabled: false, sensitivity: 0.025 };
const publish = settings => window.dispatchEvent(new CustomEvent("XCLOUD_KBM_SETTINGS", {
  detail: JSON.stringify(settings)
}));
chrome.storage.local.get(defaults, publish);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") publish(Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])));
});
window.addEventListener("XCLOUD_KBM_TOGGLE", () => {
  chrome.storage.local.get({ enabled: false }, ({ enabled }) => chrome.storage.local.set({ enabled: !enabled }));
});
