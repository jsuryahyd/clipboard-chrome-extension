///<reference path="../chrome.d.ts"/>
///<reference path="../gapi.d.ts"/>
console.log = (...args) => {
  return;
  // console.info("some thing logging " + args.length + " items");
};

document.addEventListener("DOMContentLoaded", onPageLoad);
function onPageLoad() {
  //add eventlisteners
  let bgColorPicker = document.getElementById("background-color-picker");
  let cardBgColorPicker = document.getElementById("card-bg-color-picker");
  let textColorPicker = document.getElementById("text-color-picker");
  let resetBtn = document.getElementById("options_reset_btn");
  let downloadNotes = document.getElementById("download_notes");
  let uploadNotesInput = document.getElementById("upload_notes");
  let backupBtn = document.getElementById("backup");
  let backupSections = document.getElementsByClassName("backup-section");
  const lastBackupTime = document.getElementById("last_backup_time");
  const fetchBackupBtn = document.getElementById("fetch_backup");
  chrome.storage.sync.get(["color", "card-bg-color", "text-color"], data => {
    console.log(data);
    bgColorPicker.value = data.color;
    bgColorPicker.parentElement.style.backgroundColor = data.color;
    bgColorPicker.parentElement.style.color = invertColor(data.color, true);
    bgColorPicker.onchange = e => saveValues("color", e);
    cardBgColorPicker.value = data["card-bg-color"];
    cardBgColorPicker.onchange = e => saveValues("card-bg-color", e);
    console.log(cardBgColorPicker.parentElement);
    cardBgColorPicker.parentElement.style.backgroundColor =
      data["card-bg-color"];
    cardBgColorPicker.parentElement.style.color = invertColor(
      data["card-bg-color"],
      true
    );
    textColorPicker.value = data["text-color"];
    textColorPicker.onchange = e => saveValues("text-color", e);
    textColorPicker.parentElement.style.backgroundColor = data["text-color"];
    textColorPicker.parentElement.style.color = invertColor(
      data["text-color"],
      true
    );
    resetBtn.onclick = () => {
      reset({ bgColorPicker, cardBgColorPicker, textColorPicker });
      bgColorPicker.parentElement.style.backgroundColor = "#606060";
      bgColorPicker.parentElement.style.color = "initial";

      textColorPicker.parentElement.style.backgroundColor =
        "var(--text-color, '#333333')";
      textColorPicker.parentElement.style.color = "initial";

      cardBgColorPicker.parentElement.style.backgroundColor =
        "var(--card-bg, '#f3f3f3')";
      cardBgColorPicker.parentElement.style.color = "initial";
    };
  });

  downloadNotes.onclick = downloadContent;

  uploadNotesInput.onchange = function() {
    uploadNotes(this);
  };

  setTimeout(() => {
    gapi.client.load("drive", "v3", () => {
      backupSections[0].style.display = "block";
      backupSections[1].style.display = "block";
      backupBtn.onclick = () => {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
          chrome.storage.sync.get("notes", data => {
            driveBackup(data, token);
          });
        });
      };
      chrome.storage.sync.get("last_backup", data => {
        let lastBackedupTime = (data.last_backup || {}).time || "";
        if (lastBackedupTime) {
          lastBackupTime.parentElement.style.display = "block";
          lastBackupTime.textContent = new Date(
            lastBackedupTime
          ).toLocaleString();
        }
      });

      fetchBackupBtn.onclick = () => {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
          fetchBackup(token);
        });
      };
    });
  }, 2000);
}

function saveValues(name, event) {
  let value = event.target.value;
  chrome.storage.sync.set({ [name]: value }, () => {
    // console.log('done')
  });
  event.target.parentElement.style.backgroundColor = value;
  event.target.parentElement.style.color = invertColor(value, true);
}

function reset({ bgColorPicker, cardBgColorPicker, textColorPicker }) {
  chrome.storage.sync.set(
    {
      color: "#606060",
      "card-bg-color": "#606060",
      "text-color": "#ffffff"
    },
    () => {
      //console.log('reset finished')
    }
  );

  bgColorPicker.value = "#606060";
  cardBgColorPicker.value = "#606060";
  textColorPicker.value = "#ffffff";
}

function downloadContent() {
  chrome.storage.sync.get("notes", data => {
    // bkg.console.log(data);
    downloadObjectAsJson(
      data.notes,
      "ClipBoard and Notes : " + new Date().toLocaleString()
    );
  });
}

/*
- https://stackoverflow.com/a/30800715/7314900
*/
function downloadObjectAsJson(exportObj, exportName) {
  var dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function uploadNotes(input) {
  const file = input.files[0];
  if (!file) return alert("No file");
  const reader = new FileReader();
  reader.onload = ev => {
    console.log(ev.target.result);

    let content = ev.target.result;
    chrome.storage.sync.get("notes", data => {
      chrome.storage.sync.set({
        notes: [...data.notes, ...JSON.parse(content + "")]
      });
    });
  };

  reader.onerror = ev => {
    console.error(ev);
    alert("Error while reading the file.");
  };
  reader.readAsText(file, "UTF-8");
}

function driveBackup(data, token) {
  var fileMetadata = {
    name: "data.json",
    parents: ["appDataFolder"]
  };

  const formData = new FormData();
  formData.append(
    "data",
    new File(
      [new Blob([JSON.stringify(data)], { type: "application/json" })],
      "data.json"
    )
  );
  var media = {
    mimeType: "application/json",
    // body: new Blob([JSON.stringify(data)], { type: "application/json" })
    // body: new File(
    //   [new Blob([JSON.stringify(data)], { type: "application/json" })],
    //   "data.json"
    // )
    body: data
    // "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data))
  };

  createFileWithJSONContent(
    `ClipBoardAndNotesBackup (${new Date().toLocaleString()}).json`,
    data,
    token,
    (...args) => {
      if (args && args[0] && args[0].id)
        alert("Successfully backedup to your google drive");
      else {
        return alert("An error occured while saving backup to drive");
      }
      chrome.storage.sync.get("last_backup", data => {
        let oldBackupId = (data.last_backup || {}).id;
        //delete old backup file
        console.log("deleting old backup with id :", oldBackupId);
        deleteFromDrive(oldBackupId, token);
      });
      chrome.storage.sync.set({
        last_backup: { id: args[0].id, time: new Date().getTime() }
      });
    }
  );

  //  createWithDriveApi(fileMetadata,token)
  // createWithRestApi(fileMetadata,token);
}

function fetchBackup(token) {
  chrome.storage.sync.get("last_backup", data => {
    console.log(data);
    if (!data.last_backup || !data.last_backup.id) {
      return false;
    }

    const filesReq = gapi.client.drive.files.get({
      fileId: data.last_backup.id,
      oauth_token: token,
      // fields: 'webContentLink'
      alt: "media" //==> this will get file content, without this only metadata is returned
    });
    filesReq.execute(
      (...args) => {
        console.log(args);
        const backupNotes = args[0].result.notes;
        chrome.storage.sync.get("notes", data => {
          chrome.storage.sync.set(
            {
              notes: [
                ...data.notes,
                ...backupNotes.filter(n => {
                  //donot include notes with existing ids(backup might include some local cached notes too.)
                  return !data.notes.find(dn => dn.noteId == n.noteId);
                })
              ].sort((a, b) => {
                return a.noteId > b.noteId ? 1 : -1;
              })
            },
            (...args) => {
              console.log(args);
              alert("Successfully added notes from backup");
            }
          );
        });
      },
      (...args) => {
        console.error(args);
      }
    );
  });
}

/**
 * @description working!!!
 * @link https://stackoverflow.com/a/39408884/7314900
 * @param {*} name
 * @param {*} data
 * @param {*} token
 * @param {*} callback
 */
var createFileWithJSONContent = function(name, data, token, callback) {
  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const contentType = "application/json";

  var metadata = {
    name: name,
    mimeType: contentType
  };

  var multipartRequestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " +
    contentType +
    "\r\n\r\n" +
    JSON.stringify(data, null, 2) +
    close_delim;

  var request = gapi.client.request({
    path: "/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "multipart" },
    headers: {
      "Content-Type": 'multipart/related; boundary="' + boundary + '"',
      authorization: "Bearer " + token
    },
    body: multipartRequestBody
  });
  if (!callback) {
    callback = function(file) {
      console.log(file);
    };
  }
  request.execute(callback);
};

function deleteFromDrive(fileId, token) {
  var request = gapi.client.drive.files.delete({
    fileId: fileId,
    oauth_token: token
  });
  request.execute(function(resp) {
    console.log(resp);
  });
}

/**
 * @description not working :(
 * @param {*} metadata
 * @param {*} token
 */
function createWithDriveApi(metadata, token) {
  const createRequest = gapi.client.drive.files.create({
    resource: metadata,
    fields: "id",
    oauth_token: token
  });

  createRequest.execute((...args) => {
    console.log(args);

    chrome.storage.sync.set({
      last_backup: { id: args[0].id, time: new Date().getTime() }
    });
  });
}

/**
 * not working
 */
function createWithRestApi(data, token) {
  fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=media&spaces=appDataFolder`,
    {
      method: "POST",
      // body: new Blob([JSON.stringify(data)], { type: "application/json" }),
      body: JSON.stringify(data),
      // body: {
      //   media: new Blob([JSON.stringify(data)], { type: "application/json" }),
      //   parents: ["appDataFolder"],
      //   name: "data.json"
      // },
      // body: formData,
      // body:
      //   "data:text/json;charset=utf-8," +
      //   encodeURIComponent(JSON.stringify(data)),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token
      }
    }
  )
    .then(response => {
      if (response.ok) return response;
      else
        throw Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
    })
    .then(response => console.log(response.text()))
    .catch(err => {
      console.error(err);
    });
}
