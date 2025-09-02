let a = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
export let nanoid = (e = 21) => {
  let t = "", r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) t += a[63 & r[n]];
  return t;
};

// global variables
let info = JSON.parse(localStorage.getItem("info")) || [];
let task = document.querySelector('.task');
let time = document.querySelector('.time');
let cobox = document.querySelector('.cobox');

//opening and closing popup window
let popup = document.querySelector(".popup");
let openpopup = document.querySelector(".endDay");
let overlay = document.querySelector(".overlay");
let taskStatus = document.querySelector(".taskStatus");
let closepopup = document.querySelector(".cancel");
const confirm = document.querySelector(".confirm");

// ------------------- FUNCTIONS -------------------
let functions = {
  renderTasks() {
    cobox.innerHTML = "<summary>Task : Time</summary>"; // clear

    info.forEach((item) => {
      // add HTML
      cobox.innerHTML += `
        <p class="container3" data-class="${item.id}">
          ${item.task} : ${item.startTime} to ${item.endTime}
          <button class="delete-button" data-class="${item.id}">X</button>
          <button class="completed-button" data-class="${item.id}">/</button>
          <button class="checkbox" data-class="${item.id}"></button>
        </p>`;

      // check overdue (only if not complete)

        const nowH = dayjs().hour();
        const nowM = dayjs().minute();
        if (item.hours < nowH) item.overdue = true;
        else if (item.hours === nowH && item.mins < nowM) item.overdue = true;


      const container = document.querySelector(`.container3[data-class="${item.id}"]`);
      if (container) {
        const checkbox = container.querySelector('.checkbox');
        if (item.sta === "complete") {
          checkbox.style.backgroundColor = "rgb(68, 255, 136)"; // green
        } else if (item.overdue === true && item.sta !== "complete") {
          checkbox.style.backgroundColor = "rgb(218, 62, 62)"; // red
          item.sta = "incomplete";
        } else {
          checkbox.style.backgroundColor = ""; // reset
        }
      }
    });

    // save updated info
    localStorage.setItem("info", JSON.stringify(info));
  },

  generateTask(event) {
    if (event.key === 'Enter') {
      if (task.value !== "" && time.value !== "") {
        let [startTime, endTime] = time.value.split("-").map(s => s.trim());
        let id = nanoid();
        let [hStr, mStr] = endTime.split(":");
        let hours = parseInt(hStr, 10);
        let mins = parseInt(mStr, 10);
        let newtask = {
          id,
          startTime,
          endTime,
          hours,
          mins,
          task: task.value,
          sta: "pending",
          overdue: false
        };

        info.push(newtask);
        localStorage.setItem("info", JSON.stringify(info));
        task.value = "";
        time.value = "";
        functions.renderTasks();
      }
    }
  },

  deleteTask(event) {
    if (event.target.classList.contains('delete-button')) {
      const id = event.target.dataset.class;
      info = info.filter(item => item.id !== id);
      localStorage.setItem("info", JSON.stringify(info));
      functions.renderTasks();
    }
  },

  completeTask(event) {
    if (event.target.classList.contains('completed-button')) {
      const id = event.target.dataset.class;
      info.forEach((item) => {
        if (!item.overdue && item.id === id) {
          item.sta = (item.sta === "pending") ? "complete" : "pending";
        }
      });
      localStorage.setItem("info", JSON.stringify(info));
      functions.renderTasks();
    }
  },

  popupGenerator() {
    popup.classList.add('active');
    overlay.style.zIndex = 999;
    taskStatus.innerHTML = "";
    let c = 0;
    let t = 0;
    info.forEach((item) => {
      t++;
      taskStatus.innerHTML += `<p>${item.task}: ${item.sta}</p>`;
      if (item.sta === "complete") c++;
    });
    taskStatus.innerHTML += `<p class="notaskc">No of task completed: ${c}/${t}</p>`;
  },

  closepopupf() {
    popup.classList.remove('active');
    overlay.style.zIndex = -1;
  },

  endDayConfirm() {
    functions.closepopupf();
    info = [];
    localStorage.setItem("info", JSON.stringify(info));
    functions.renderTasks();
  }
};

// ------------------- EVENT WIRING -------------------
// IMPORTANT: pass function references, do NOT call them here.
window.addEventListener('load', functions.renderTasks);
addEventListener('keydown', functions.generateTask);
cobox.addEventListener('dblclick', functions.deleteTask);
cobox.addEventListener('click', functions.completeTask);
openpopup.addEventListener('click', functions.popupGenerator);
closepopup.addEventListener("click", functions.closepopupf);
confirm.addEventListener("click", functions.endDayConfirm);