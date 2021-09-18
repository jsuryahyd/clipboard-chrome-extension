/// <reference path="./chrome.d.ts"/>
/// <reference path="./quill.min.js"/>
// let port = chrome.tabs.connect(chrome.tabs[0]);

// port.onMessage.addListener(msg => {});
// port.onDisconnect.addListener(s => {
//     bkg.console.log(">>>>>>>>",focusedNoteId)
//   if (focusedNoteId) {
//     onEditComplete(focusedNoteId);
//   }
// });
var focusedNoteId = null;
var cards = document.getElementById("cards_container");
var mainSection = document.getElementById("main_section");
var bkg = chrome.extension.getBackgroundPage();

// submitBtn.onclick = e => {
//   let color = e.target.getAttribute("color");
//   // eslint-disable-next-line no-undef
//   chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//     // eslint-disable-next-line no-undef
//     chrome.tabs.executeScript(tabs[0].id, {
//       code: `document.body.style.backgroundColor="${color}";`
//     });
//   });
// };

function addCardOnClick() {
  console.log("clicked");
  let noteId = new Date().valueOf();
  let note = { text: "", noteId };
  appendCard(note, true);
  let content = document.querySelector(`[data-content-id="${noteId}"]`);
  console.log(content);
  content.focus();
  createCaretPlacer(true)(content);
  getNotesAnd((notes) => {
    notes.push(note);
    chrome.storage.sync.set({ notes });
  });
}

console.log("wth");
// document.addEventListener("DOMContentLoaded", e => {
// document.body.style.backgroundColor
chrome.storage.sync.get(["color", "card-bg-color", "text-color"], (data) => {
  let color = data.color;
  console.log(data);
  // document.body.style.backgroundColor = color;
  document.body.style.setProperty("--theme-color", color);
  document.body.style.setProperty("--card-bg", data["card-bg-color"]);
  document.body.style.setProperty("--text-color", data["text-color"]);
  let cardBorderColor = data["text-color"];
  if (!isDark(data["card-bg-color"]) && isDark(data["color"])) {
    cardBorderColor = data["card-bg-color"];
  }
  document.body.style.setProperty("--card-border-color", cardBorderColor);
  if (document.body.style.getPropertyValue("--theme-color") == "#ffffff") {
    let textColor = document.body.style.getPropertyValue("--text-color");
    if (textColor == "#ffffff") {
      textColor = document.body.style.getPropertyValue("--card-bg");
    }
    //SET app title and ctrl+v to card color
    document.getElementsByClassName("app-title")[0].style.color = textColor;
    document.getElementsByClassName("content_card--dummy")[0].style.color =
      textColor;
  }
});
let el = document.getElementsByClassName("content_card--dummy")[0];
el && (el.onclick = addCardOnClick);

let add_notes_btn = document.getElementById("add_notes_btn");
add_notes_btn.onclick = addCardOnClick;

var optionsBtn = document.getElementById("options_btn");
optionsBtn.onclick = () => {
  chrome.runtime.openOptionsPage();
};
// });

//append previously pasted cards
getNotesAnd((notes) => {
  notes = notes && Array.isArray(notes) ? notes.filter((n) => !!n.text) : [];
  notes.forEach((note) => appendCard(note));
  chrome.storage.sync.set({ notes: notes }, () => {
    //success
  });
  scrollToBottom(mainSection);
  //remove empty notes
});

document.body.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key == "v") {
    // const text = await navigator.clipboard.readText().catch(err=>alert(err));
    // const text = window.clipboardData.getData('Text')
    if (e.target.className == "note-content") {
      return false;
    }
    const text = getClipboardData();
    const noteId = new Date().valueOf();
    appendCard({ text, noteId }, true);

    scrollToBottom(mainSection);

    getNotesAnd((notes) => {
      bkg.console.log(notes);
      chrome.storage.sync.set(
        {
          notes: (Array.isArray(notes) ? notes : []).concat([{ text, noteId }]),
        },
        () => {
          //success | fail?
        }
      );
    });
  }
});

function getClipboardData() {
  let input = document.createElement("input");
  //   input.setAttribute('hidden',true);
  input.style.width = "0px";
  input.style.height = "0px";
  document.body.appendChild(input);
  input.focus();
  document.execCommand("paste");
  let text = input.value;
  document.body.removeChild(input);
  //   bkg.console.log(input);
  return text;
}

/**
 *
 * @param {object} param0
 * @param {boolean} animation
 */
function appendCard({ text, noteId }, animation) {
  let contentCard = document.createElement("div");
  contentCard.setAttribute("data-note-id", noteId);
  contentCard.classList.add("content_card");
  let date = new Date(noteId);
  //   let dateString = date.toString();
  let dateString = formatDate(date);
  contentCard.innerHTML = `<div class="card__header"><h4 class="card__title">${dateString}</h4><div class="card__actions">
  <!--<button class="btn--no_style edit-card-btn card__action-btn" data-edit-id="${noteId}" >${editIcon} 
  </button>-->
  <button class="btn--no_style save-card-btn card__action-btn card__action--save" data-save-id="${noteId}" >Save</button>
  <button class="btn--no_style card__action-btn delete-card-btn" data-remove-id="${noteId}" >${deleteIcon()}</button>
  <button class="btn--no_style card__action-btn" data-copy-id="${noteId}" >${copyIcon}</button>
  </div></div><div class="notes_input_wrapper editor-container"  id="editor--${noteId}"> 
  <!--<textarea placeholder="Enter Notes or Paste Text" class="note-content" rows=4 data-content-id="${noteId}">${text}</textarea>-->
  </div>`; //.replace(/\n/g, "<br/>")
  cards.appendChild(contentCard);

  const editor = new Quill(document.getElementById("editor--" + noteId),{
    placeholder:'Enter or paste your content'
  });

  document.querySelector(`[data-remove-id="${noteId}"]`).onclick = () =>
    removeNote(noteId);
  let content = contentCard.getElementsByClassName("note-content")[0];

  let actionsDiv = contentCard.getElementsByClassName("card__actions")[0];
  content.onfocus = (e) => {
    focusedNoteId = noteId;
    // let actionBtns = contentCard.getElementsByClassName("card__action_btn");
    // [...actionBtns].forEach(a => {
    //   a.classList.add("d-none");
    // });
    //remove the save icon if any, from other cards or this card
    [...document.getElementsByClassName("card__actions")].forEach((el) =>
      el.classList.remove("edit-mode")
    );
    actionsDiv.classList.add("edit-mode");
    createCaretPlacer(false)(content);
  };
  // content.onblur = e=>{
  //   console.log(e.target.nodeName)
  //   if(e.target.getEventListeners()) return false;
  // }
  let saveBtn = contentCard.getElementsByClassName("card__action--save")[0];
  // alert(!!saveBtn);
  saveBtn &&
    (saveBtn.onclick = function () {
      //use of 'this' so, no arrow function
      onEditComplete(content, noteId);
      this.innerText = "Saved";
      setTimeout(() => {
        actionsDiv.classList.remove("edit-mode");
        this.innerText = "Save";
      }, 700);
    });

  // content.onblur = () => {
  //   actionsDiv.classList.remove("edit-mode");
  // };

  let saveOnPause = null;
  content.onkeyup = function (e) {
    if (e.keyCode >= 37 && e.keyCode <= 40) {
      return false;
    }
    clearTimeout(saveOnPause);
    saveOnPause = setTimeout(() => {
      onEditComplete(content, noteId, () => {
        saveBtn.innerText = "Auto Saved";
        setTimeout(() => {
          saveBtn.innerText = "Save";
          // actionsDiv.classList.remove("edit-mode")
        }, 700);
      });
    }, 1500);

    // this.style.height = Math.max(this.scrollHeight+ 8, 60) + "px";//4+4 padding
    // this.parentElement.height = "auto"
  };
  content.addEventListener("paste", pasteAsPlainText);
  // document.querySelector(`[data-edit-id="${noteId}"]`).onclick = () => {
  //   // content.focus();
  //   createCaretPlacer(false)(content);
  // };

  document.querySelector(`[data-copy-id="${noteId}"]`).onclick = () => {
    selectText(content);
    // actionsDiv.classList.remove("edit-mode");
  };
  if (animation) contentCard.style.animation = "glow 1s linear 0s 1";

  setTimeout(() => {
    content.focus();
    createCaretPlacer(false)(content);
  }, 0);
}

function getNotesAnd(cb) {
  chrome.storage.sync.get("notes", (data) => {
    // bkg.console.log(data);
    cb(data.notes);
  });
}

function scrollToBottom(el) {
  el.scrollTo(0, el.scrollHeight);
}

function selectText(node) {
  node.select();
  document.execCommand("copy");
  let saveBtn = document.getElementById("save_card_btn");
  saveBtn && saveBtn.parentNode.removeChild(saveBtn);
}

function deleteIcon(className) {
  return `<img src="data:image/svg+xml;base64,
  PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDQ1OSA0NTkiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1OSA0NTk7IiB4bWw6c3BhY2U9InByZXNlcnZlIiBjbGFzcz0iIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjkwNDM4MiAwIDAgMC45MDQzODIgMjEuOTQ0MyAyMS45NDQzKSI+PGc+Cgk8ZyBpZD0iZGVsZXRlIj4KCQk8cGF0aCBkPSJNNzYuNSw0MDhjMCwyOC4wNSwyMi45NSw1MSw1MSw1MWgyMDRjMjguMDUsMCw1MS0yMi45NSw1MS01MVYxMDJoLTMwNlY0MDh6IE00MDgsMjUuNWgtODkuMjVMMjkzLjI1LDBoLTEyNy41bC0yNS41LDI1LjUgICAgSDUxdjUxaDM1N1YyNS41eiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojQ0NDQ0NDIiBkYXRhLW9sZF9jb2xvcj0iI2NjY2NjYyI+PC9wYXRoPgoJPC9nPgo8L2c+PC9nPiA8L3N2Zz4=" />`;
}

const editIcon = `<img src="data:image/svg+xml;base64,
PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUyOC44OTkgNTI4Ljg5OSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTI4Ljg5OSA1MjguODk5OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgY2xhc3M9IiI+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMC45MjI2NTIgMCAwIDAuOTIyNjUyIDIwLjQ1NDUgMjAuNDU0NSkiPjxnPgoJPHBhdGggZD0iTTMyOC44ODMsODkuMTI1bDEwNy41OSwxMDcuNTg5bC0yNzIuMzQsMjcyLjM0TDU2LjYwNCwzNjEuNDY1TDMyOC44ODMsODkuMTI1eiBNNTE4LjExMyw2My4xNzdsLTQ3Ljk4MS00Ny45ODEgICBjLTE4LjU0My0xOC41NDMtNDguNjUzLTE4LjU0My02Ny4yNTksMGwtNDUuOTYxLDQ1Ljk2MWwxMDcuNTksMTA3LjU5bDUzLjYxMS01My42MTEgICBDNTMyLjQ5NSwxMDAuNzUzLDUzMi40OTUsNzcuNTU5LDUxOC4xMTMsNjMuMTc3eiBNMC4zLDUxMi42OWMtMS45NTgsOC44MTIsNS45OTgsMTYuNzA4LDE0LjgxMSwxNC41NjVsMTE5Ljg5MS0yOS4wNjkgICBMMjcuNDczLDM5MC41OTdMMC4zLDUxMi42OXoiIGRhdGEtb3JpZ2luYWw9IiMwMDAwMDAiIGNsYXNzPSJhY3RpdmUtcGF0aCIgc3R5bGU9ImZpbGw6I0NDQ0NDQyIgZGF0YS1vbGRfY29sb3I9IiNjY2NjY2MiPjwvcGF0aD4KPC9nPjwvZz4gPC9zdmc+" />`;

const copyIcon = `<img src="data:image/svg+xml;base64,
PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDU2MSA1NjEiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDU2MSA1NjE7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjkxMzUxNyAwIDAgMC45MTM1MTcgMjQuMjU4NCAyNC4yNTg0KSI+PGc+Cgk8ZyBpZD0iY29udGVudC1jb3B5Ij4KCQk8cGF0aCBkPSJNMzk1LjI1LDBoLTMwNmMtMjguMDUsMC01MSwyMi45NS01MSw1MXYzNTdoNTFWNTFoMzA2VjB6IE00NzEuNzUsMTAyaC0yODAuNWMtMjguMDUsMC01MSwyMi45NS01MSw1MXYzNTcgICAgYzAsMjguMDUsMjIuOTUsNTEsNTEsNTFoMjgwLjVjMjguMDUsMCw1MS0yMi45NSw1MS01MVYxNTNDNTIyLjc1LDEyNC45NSw0OTkuOCwxMDIsNDcxLjc1LDEwMnogTTQ3MS43NSw1MTBoLTI4MC41VjE1M2gyODAuNVY1MTAgICAgeiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojQ0NDQ0NDIiBkYXRhLW9sZF9jb2xvcj0iI2NjY2NjYyI+PC9wYXRoPgoJPC9nPgo8L2c+PC9nPiA8L3N2Zz4=" />`;

const saveIcon = `<img src="data:image/svg+xml;base64,
PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDkgNDkiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ5IDQ5OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGNsYXNzPSIiPjxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODc3NTIxIDAgMCAwLjg3NzUyMSAzLjAwMDczIDMuMDAwNzMpIj48Zz4KCTxyZWN0IHg9IjI3LjUiIHk9IjUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBkYXRhLW9yaWdpbmFsPSIjMDAwMDAwIiBjbGFzcz0iYWN0aXZlLXBhdGgiIHN0eWxlPSJmaWxsOiNDQ0NDQ0MiIGRhdGEtb2xkX2NvbG9yPSIjY2NjY2NjIj48L3JlY3Q+Cgk8cGF0aCBkPSJNMzkuOTE0LDBIMC41djQ5aDQ4VjguNTg2TDM5LjkxNCwweiBNMTAuNSwyaDI2djE2aC0yNlYyeiBNMzkuNSw0N2gtMzFWMjZoMzFWNDd6IiBkYXRhLW9yaWdpbmFsPSIjMDAwMDAwIiBjbGFzcz0iYWN0aXZlLXBhdGgiIHN0eWxlPSJmaWxsOiNDQ0NDQ0MiIGRhdGEtb2xkX2NvbG9yPSIjY2NjY2NjIj48L3BhdGg+Cgk8cGF0aCBkPSJNMTMuNSwzMmg3YzAuNTUzLDAsMS0wLjQ0NywxLTFzLTAuNDQ3LTEtMS0xaC03Yy0wLjU1MywwLTEsMC40NDctMSwxUzEyLjk0NywzMiwxMy41LDMyeiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojQ0NDQ0NDIiBkYXRhLW9sZF9jb2xvcj0iI2NjY2NjYyI+PC9wYXRoPgoJPHBhdGggZD0iTTEzLjUsMzZoMTBjMC41NTMsMCwxLTAuNDQ3LDEtMXMtMC40NDctMS0xLTFoLTEwYy0wLjU1MywwLTEsMC40NDctMSwxUzEyLjk0NywzNiwxMy41LDM2eiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojQ0NDQ0NDIiBkYXRhLW9sZF9jb2xvcj0iI2NjY2NjYyI+PC9wYXRoPgoJPHBhdGggZD0iTTI2LjUsMzZjMC4yNywwLDAuNTItMC4xMSwwLjcxLTAuMjljMC4xOC0wLjE5LDAuMjktMC40NSwwLjI5LTAuNzFzLTAuMTEtMC41MjEtMC4yOS0wLjcxYy0wLjM3LTAuMzctMS4wNC0wLjM3LTEuNDEsMCAgIGMtMC4xOSwwLjE4OS0wLjMsMC40MzktMC4zLDAuNzFjMCwwLjI3LDAuMTA5LDAuNTIsMC4yOSwwLjcxQzI1Ljk3OSwzNS44OSwyNi4yMjksMzYsMjYuNSwzNnoiIGRhdGEtb3JpZ2luYWw9IiMwMDAwMDAiIGNsYXNzPSJhY3RpdmUtcGF0aCIgc3R5bGU9ImZpbGw6I0NDQ0NDQyIgZGF0YS1vbGRfY29sb3I9IiNjY2NjY2MiPjwvcGF0aD4KPC9nPjwvZz4gPC9zdmc+" />`;

const plusIcon = `<img src="data:image/svg+xml;base64,
PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUyIDUyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGNsYXNzPSIiPjxnPjxwYXRoIGQ9Ik0yNiwwQzExLjY2NCwwLDAsMTEuNjYzLDAsMjZzMTEuNjY0LDI2LDI2LDI2czI2LTExLjY2MywyNi0yNlM0MC4zMzYsMCwyNiwweiBNMzguNSwyOEgyOHYxMWMwLDEuMTA0LTAuODk2LDItMiwyICBzLTItMC44OTYtMi0yVjI4SDEzLjVjLTEuMTA0LDAtMi0wLjg5Ni0yLTJzMC44OTYtMiwyLTJIMjRWMTRjMC0xLjEwNCwwLjg5Ni0yLDItMnMyLDAuODk2LDIsMnYxMGgxMC41YzEuMTA0LDAsMiwwLjg5NiwyLDIgIFMzOS42MDQsMjgsMzguNSwyOHoiIGRhdGEtb3JpZ2luYWw9IiMwMDAwMDAiIGNsYXNzPSJhY3RpdmUtcGF0aCIgc3R5bGU9ImZpbGw6I0NDQ0NDQyIgZGF0YS1vbGRfY29sb3I9IiNjY2NjY2MiPjwvcGF0aD48L2c+IDwvc3ZnPg==" />`;

const settingsIcon = `<img src="data:image/svg+xml;base64,
PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjY4Ljc2NSAyNjguNzY1IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNjguNzY1IDI2OC43NjU7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgY2xhc3M9IiI+PGc+PGcgaWQ9IlNldHRpbmdzIj4KCTxnPgoJCTxwYXRoIHN0eWxlPSJmaWxsOiNDQ0NDQ0MiIGQ9Ik0yNjcuOTIsMTE5LjQ2MWMtMC40MjUtMy43NzgtNC44My02LjYxNy04LjYzOS02LjYxNyAgICBjLTEyLjMxNSwwLTIzLjI0My03LjIzMS0yNy44MjYtMTguNDE0Yy00LjY4Mi0xMS40NTQtMS42NjMtMjQuODEyLDcuNTE1LTMzLjIzMWMyLjg4OS0yLjY0MSwzLjI0LTcuMDYyLDAuODE3LTEwLjEzMyAgICBjLTYuMzAzLTguMDA0LTEzLjQ2Ny0xNS4yMzQtMjEuMjg5LTIxLjVjLTMuMDYzLTIuNDU4LTcuNTU3LTIuMTE2LTEwLjIxMywwLjgyNWMtOC4wMSw4Ljg3MS0yMi4zOTgsMTIuMTY4LTMzLjUxNiw3LjUyOSAgICBjLTExLjU3LTQuODY3LTE4Ljg2Ni0xNi41OTEtMTguMTUyLTI5LjE3NmMwLjIzNS0zLjk1My0yLjY1NC03LjM5LTYuNTk1LTcuODQ5Yy0xMC4wMzgtMS4xNjEtMjAuMTY0LTEuMTk3LTMwLjIzMi0wLjA4ICAgIGMtMy44OTYsMC40My02Ljc4NSwzLjc4Ni02LjY1NCw3LjY4OWMwLjQzOCwxMi40NjEtNi45NDYsMjMuOTgtMTguNDAxLDI4LjY3MmMtMTAuOTg1LDQuNDg3LTI1LjI3MiwxLjIxOC0zMy4yNjYtNy41NzQgICAgYy0yLjY0Mi0yLjg5Ni03LjA2My0zLjI1Mi0xMC4xNDEtMC44NTNjLTguMDU0LDYuMzE5LTE1LjM3OSwxMy41NTUtMjEuNzQsMjEuNDkzYy0yLjQ4MSwzLjA4Ni0yLjExNiw3LjU1OSwwLjgwMiwxMC4yMTQgICAgYzkuMzUzLDguNDcsMTIuMzczLDIxLjk0NCw3LjUxNCwzMy41M2MtNC42MzksMTEuMDQ2LTE2LjEwOSwxOC4xNjUtMjkuMjQsMTguMTY1Yy00LjI2MS0wLjEzNy03LjI5NiwyLjcyMy03Ljc2Miw2LjU5NyAgICBjLTEuMTgyLDEwLjA5Ni0xLjE5NiwyMC4zODMtMC4wNTgsMzAuNTYxYzAuNDIyLDMuNzk0LDQuOTYxLDYuNjA4LDguODEyLDYuNjA4YzExLjcwMi0wLjI5OSwyMi45MzcsNi45NDYsMjcuNjUsMTguNDE1ICAgIGM0LjY5OCwxMS40NTQsMS42NzgsMjQuODA0LTcuNTE0LDMzLjIzYy0yLjg3NSwyLjY0MS0zLjI0LDcuMDU1LTAuODE3LDEwLjEyNmM2LjI0NCw3Ljk1MywxMy40MDksMTUuMTksMjEuMjU5LDIxLjUwOCAgICBjMy4wNzksMi40ODEsNy41NTksMi4xMzEsMTAuMjI4LTAuODFjOC4wNC04Ljg5MywyMi40MjctMTIuMTg0LDMzLjUwMS03LjUzNmMxMS41OTksNC44NTIsMTguODk1LDE2LjU3NSwxOC4xODEsMjkuMTY3ICAgIGMtMC4yMzMsMy45NTUsMi42Nyw3LjM5OCw2LjU5NSw3Ljg1YzUuMTM1LDAuNTk5LDEwLjMwMSwwLjg5OCwxNS40ODEsMC44OThjNC45MTcsMCw5LjgzNS0wLjI3LDE0Ljc1Mi0wLjgxNyAgICBjMy44OTctMC40Myw2Ljc4NC0zLjc4Niw2LjY1My03LjY5NmMtMC40NTEtMTIuNDU0LDYuOTQ2LTIzLjk3MywxOC4zODYtMjguNjU3YzExLjA1OS00LjUxNywyNS4yODYtMS4yMTEsMzMuMjgxLDcuNTcyICAgIGMyLjY1NywyLjg5LDcuMDQ3LDMuMjM5LDEwLjE0MiwwLjg0OGM4LjAzOS02LjMwNCwxNS4zNDktMTMuNTM0LDIxLjc0LTIxLjQ5NGMyLjQ4LTMuMDc5LDIuMTMtNy41NTktMC44MDMtMTAuMjEzICAgIGMtOS4zNTMtOC40Ny0xMi4zODgtMjEuOTQ2LTcuNTI5LTMzLjUyNGM0LjU2OC0xMC44OTksMTUuNjEyLTE4LjIxNywyNy40OTEtMTguMjE3bDEuNjYyLDAuMDQzICAgIGMzLjg1MywwLjMxMyw3LjM5OC0yLjY1NSw3Ljg2NS02LjU4OEMyNjkuMDQ0LDEzOS45MTcsMjY5LjA1OCwxMjkuNjM5LDI2Ny45MiwxMTkuNDYxeiBNMTM0LjU5NSwxNzkuNDkxICAgIGMtMjQuNzE4LDAtNDQuODI0LTIwLjEwNi00NC44MjQtNDQuODI0YzAtMjQuNzE3LDIwLjEwNi00NC44MjQsNDQuODI0LTQ0LjgyNGMyNC43MTcsMCw0NC44MjMsMjAuMTA3LDQ0LjgyMyw0NC44MjQgICAgQzE3OS40MTgsMTU5LjM4NSwxNTkuMzEyLDE3OS40OTEsMTM0LjU5NSwxNzkuNDkxeiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBkYXRhLW9sZF9jb2xvcj0iI2NjY2NjYyI+PC9wYXRoPgoJPC9nPgo8L2c+PC9nPiA8L3N2Zz4=" />`;

function removeNote(noteId) {
  //getNotes
  getNotesAnd((notes) => {
    if (!notes || !Array.isArray(notes)) {
      //   bkg.console.log("removenote error", notes, noteId);
      return false;
    }
    //remove this note
    notes = (notes || []).filter((n) => n.noteId != noteId);
    //and set notes to storage
    chrome.storage.sync.set({ notes }, () => {
      //   bkg && bkg.console.log("updated notes after remove item:", noteId);
    });
    //remove card instead of rerender
    let el = document.querySelector('[data-note-id="' + String(noteId) + '"]');
    el.parentNode.removeChild(el);
  });
}

function onEditComplete(content, noteId, cb) {
  // bkg.console.log(content,noteId)
  focusedNoteId = null;

  getNotesAnd((notes) => {
    notes = notes.reduce((nts, n) => {
      if (n.noteId == noteId) {
        n.text = content.value; //content.innerHTML
      }
      nts.push(n);
      return nts;
    }, []);
    chrome.storage.sync.set({ notes }, () => {
      cb && cb();
    });
    // content.setAttribute('contentEditable',false);
  });
}

function formatDate(date) {
  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[date.getDay()]} ${date.getDate()}-${doubleDigits(
    date.getMonth() + 1
  )}-${date.getFullYear()} ${doubleDigits(date.getHours())}:${doubleDigits(
    date.getMinutes()
  )}:${doubleDigits(date.getSeconds())}`;
}

function doubleDigits(d) {
  return Number(d) < 10 ? "0" + d : d;
}

function createCaretPlacer(atStart) {
  return function (el) {
    el.focus();
    if (
      typeof window.getSelection != "undefined" &&
      typeof document.createRange != "undefined"
    ) {
      var range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(atStart);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
      var textRange = document.body.createTextRange();
      textRange.moveToElementText(el);
      textRange.collapse(atStart);
      textRange.select();
    }
  };
}

function pasteAsPlainText(e) {
  // cancel paste
  e.preventDefault();
  // get text representation of clipboard
  var text = (e.originalEvent || e).clipboardData.getData("text/plain");
  // insert text manually
  document.execCommand("insertHTML", false, text);
}

// createIframe(iframeStyles);
