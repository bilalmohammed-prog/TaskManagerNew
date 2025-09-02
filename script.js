// ------------------- UTILS -------------------
let a = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
export const nanoid = (e = 21) => {
  let t = "", r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) t += a[63 & r[n]];
  return t;
};

// ------------------- TASK MANAGER CLASS -------------------
class TaskManager {
  constructor() {
    // State
    this.info = JSON.parse(localStorage.getItem("info")) || [];

    // DOM elements
    this.task = document.querySelector('.task');
    this.time = document.querySelector('.time');
    this.cobox = document.querySelector('.cobox');
    this.popup = document.querySelector(".popup");
    this.openpopup = document.querySelector(".endDay");
    this.overlay = document.querySelector(".overlay");
    this.taskStatus = document.querySelector(".taskStatus");
    this.closepopup = document.querySelector(".cancel");
    this.confirm = document.querySelector(".confirm");

    // Bind events once
    this.bindEvents();
  }

  // ------------------- EVENT BINDING -------------------
  bindEvents() {
    window.addEventListener('load', () => this.renderTasks());
    window.addEventListener('keydown', (e) => this.generateTask(e));
    this.cobox.addEventListener('dblclick', (e) => this.deleteTask(e));
    this.cobox.addEventListener('click', (e) => this.completeTask(e));
    this.openpopup.addEventListener('click', () => this.popupGenerator());
    this.closepopup.addEventListener("click", () => this.closepopupf());
    this.confirm.addEventListener("click", () => this.endDayConfirm());
  }

  // ------------------- CORE METHODS -------------------
  renderTasks() {
    this.cobox.innerHTML = "<summary>Task : Time</summary>";

    this.info.forEach((item) => {
      this.cobox.innerHTML += `
        <p class="container3" data-class="${item.id}">
          ${item.task} : ${item.startTime} to ${item.endTime}
          <button class="delete-button" data-class="${item.id}">X</button>
          <button class="completed-button" data-class="${item.id}">/</button>
          <button class="checkbox" data-class="${item.id}"></button>
        </p>`;

      // check overdue
      const nowH = dayjs().hour();
      const nowM = dayjs().minute();
      if (item.hours < nowH || (item.hours === nowH && item.mins < nowM)) {
        item.overdue = true;
      }

      const container = this.cobox.querySelector(`.container3[data-class="${item.id}"]`);
      if (container) {
        const checkbox = container.querySelector('.checkbox');
        if (item.sta === "complete") {
          checkbox.style.backgroundColor = "rgb(68, 255, 136)"; // green
        } else if (item.overdue && item.sta !== "complete") {
          checkbox.style.backgroundColor = "rgb(218, 62, 62)"; // red
          item.sta = "incomplete";
        } else {
          checkbox.style.backgroundColor = "";
        }
      }
    });

    this.save();
  }

  generateTask(event) {
    if (event.key === 'Enter' && this.task.value && this.time.value) {
      let [startTime, endTime] = this.time.value.split("-").map(s => s.trim());
      let id = nanoid();
      let [hStr, mStr] = endTime.split(":");
      let hours = parseInt(hStr, 10);
      let mins = parseInt(mStr, 10);

      this.info.push({
        id,
        startTime,
        endTime,
        hours,
        mins,
        task: this.task.value,
        sta: "pending",
        overdue: false
      });

      this.task.value = "";
      this.time.value = "";
      this.save();
      this.renderTasks();
    }
  }

  deleteTask(event) {
    if (event.target.classList.contains('delete-button')) {
      const id = event.target.dataset.class;
      this.info = this.info.filter(item => item.id !== id);
      this.save();
      this.renderTasks();
    }
  }

  completeTask(event) {
    if (event.target.classList.contains('completed-button')) {
      const id = event.target.dataset.class;
      this.info.forEach((item) => {
        if (!item.overdue && item.id === id) {
          item.sta = (item.sta === "pending") ? "complete" : "pending";
        }
      });
      this.save();
      this.renderTasks();
    }
  }

  popupGenerator() {
    this.popup.classList.add('active');
    this.overlay.style.zIndex = 999;
    this.taskStatus.innerHTML = "";
    let c = 0, t = 0;
    this.info.forEach((item) => {
      t++;
      this.taskStatus.innerHTML += `<p>${item.task}: ${item.sta}</p>`;
      if (item.sta === "complete") c++;
    });
    this.taskStatus.innerHTML += `<p class="notaskc">No of tasks completed: ${c}/${t}</p>`;
  }

  closepopupf() {
    this.popup.classList.remove('active');
    this.overlay.style.zIndex = -1;
  }

  endDayConfirm() {
    this.closepopupf();
    this.info = [];
    this.save();
    this.renderTasks();
  }

  // ------------------- UTIL -------------------
  save() {
    localStorage.setItem("info", JSON.stringify(this.info));
  }
}

// ------------------- INIT -------------------
const app = new TaskManager();
