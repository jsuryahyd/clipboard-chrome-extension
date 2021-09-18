///<reference path="./chrome.d.ts" />
chrome.runtime.onInstalled.addListener(function (...args) {
  onInstalled(...args);
});

function onInstalled({reason}) {
  console.log(reason)
  if (reason === "install") {
    chrome.storage.sync.set(
      {
        color: "#606060",
        "card-bg-color": "#606060",
        "text-color": "#fdffff",//https://stackoverflow.com/a/47471487/7314900
        notes: [],
      },
      function () {
        console.log("installed.");
      }
    );
  }
}

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { openApp: true }, function (response) {
      console.log("open app response :", response);
    });
  });
});


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "popupInit") console.log("popup");
  console.log("message");
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  if (request.greeting == "hello") sendResponse({ farewell: "goodbye" });
  return true;
});
