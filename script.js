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
    this.reason_popup = document.querySelector(".reason_popup");
    this.rcancel = document.querySelector(".rcancel");
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
    this.cobox.addEventListener('click', (e) => this.updateTask(e));
    this.openpopup.addEventListener('click', () => this.popupGenerator());
    this.closepopup.addEventListener("click", () => this.closepopupf());
    this.confirm.addEventListener("click", () => this.endDayConfirm());
//barrier
let reasonInput = this.reason_popup.querySelector(".reason_input");
    let reason = reasonInput.value.trim();
    let buttonId = reasonInput.dataset.buttonId;
reasonInput.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        let reasonInput = this.reason_popup.querySelector(".reason_input");
    let reason = reasonInput.value.trim();
    let buttonId = reasonInput.dataset.buttonId;
    reasonInput.value = "";
        try {
          const res = await fetch("http://localhost:5500/evaluate-reason", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
          });
          
          const data = await res.json();
          console.log(res)
          console.log("AI evaluation:", data.evaluation);
        } catch (err) {
          console.error("Error:", err);
        }

        
        
      }
    });
//barrier

    document.addEventListener("click", async(e) => {
  const button = e.target.closest(".reason_button");



  if (button) {
    
    this.openReasonPopup();

    const buttonId = button.id;
    const reasonInput = this.reason_popup.querySelector(".reason_input");

    if (reasonInput) {
      reasonInput.dataset.buttonId = buttonId;
      console.log("ReasonInput linked to:", reasonInput.dataset.buttonId);
    }
  }

  if (e.target.classList.contains("rcancel")) {
    this.closeReasonPopup();
  }
  if (e.target.classList.contains("rconfirm")){
    let reasonInput = this.reason_popup.querySelector(".reason_input");
    let reason = reasonInput.value.trim();
    let buttonId = reasonInput.dataset.buttonId;
    reasonInput.value = "";
    
    //barrier
     // Only add once per popup open
  
//barrier

    try {
      const res = await fetch("http://localhost:5500/evaluate-reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }) // sending only the reason
      });
      console.log(res)
      const data = await res.json();
      console.log("AI evaluation:", data.evaluation);

      alert(`AI evaluation: ${data.evaluation}`);
      reasonInput.value = ""; // clear input
    } catch (err) {
      console.error("Error:", err);
    }

  // Assume buttonId corresponds to a task id in this.info array




  }
});


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
          <button class="update-button" data-class="${item.id}">U</button>
          <button class="checkbox" data-class="${item.id}"></button>
        </p>
        
        `;

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

  async generateTask(event) {
    if (event.key === 'Enter' && this.task.value && this.time.value) {
      let [startTime, endTime] = this.time.value.split("-").map(s => s.trim());
      let id = nanoid();//setting id for each task
      let [hStr, mStr] = endTime.split(":");
      let hours = parseInt(hStr, 10);
      let mins = parseInt(mStr, 10);
      let obj={
        id,
        startTime,
        endTime,
        hours,
        mins,
        task: this.task.value,
        sta: "pending",
        overdue: false
      }
      this.info.push(obj);

      this.task.value = "";
      this.time.value = "";
      this.save();
      this.renderTasks();

      const taskObj = this.info.find(item => item.id === obj.id);
console.log("TaskObj found:", taskObj);
if (taskObj) {
  try {
    const res = await fetch("http://localhost:5500/addTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: taskObj.id,
        task: taskObj.task,
        startTime: taskObj.startTime,
        endTime: taskObj.endTime,
        status: taskObj.sta
      })
    });
    const result = await res.json();
    console.log(result.message || JSON.stringify(result));
  } catch (err) {
    console.error("Error adding task to DB:", err);
  }
} else {
  console.error("Task not found for id", buttonId);
}
    }



  }

  deleteTask(event) {
    if (event.target.classList.contains('delete-button')) {
      const id = event.target.dataset.class;
      

      const taskObj = this.info.find(item => item.id === id); // get this dynamically
      console.log("TaskObj to delete:", taskObj);
      console.log(id);
      if (!taskObj) {
  console.error("Task not found with id:", id);
  return; // or handle error appropriately
}
const taskId = taskObj.id
fetch("http://localhost:5500/deleteTask", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: taskId })
})
  .then(res => res.json())
  .then(data => {
    console.log(data.message || JSON.stringify(data));
    this.info = this.info.filter(item => item.id !== id);
      this.save();
      this.renderTasks();
  })
  .catch(err => console.error("Error deleting task:", err));    }
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

  //update
  // ...existing code...
  updateTask(event) {
    // support clicks on child elements
    const btn = event.target instanceof Element && event.target.closest('.update-button');
    if (!btn) return;

    const container = btn.closest('.container3');
    if (!container) return;

    const id = container.dataset.class;
    const item = this.info.find(i => i.id === id);
    if (!item) return;

    // avoid opening multiple editors on same item
    if (container.querySelector('.edit-input') || container.querySelector('.edit-start') || container.querySelector('.edit-end')) return;

    // remove leading text nodes (the task/time text) so we can insert the inputs
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) container.removeChild(node);
    });

    // create inline inputs: one for task, one for start time, one for end time
    const textInput = document.createElement('input');
    textInput.className = 'edit-input';
    textInput.value = item.task;
    textInput.setAttribute('aria-label', 'Edit task');

    const startInput = document.createElement('input');
    startInput.className = 'edit-start';
    startInput.value = item.startTime;
    startInput.setAttribute('aria-label', 'Edit start time (HH:MM)');

    const endInput = document.createElement('input');
    endInput.className = 'edit-end';
    endInput.value = item.endTime;
    endInput.setAttribute('aria-label', 'Edit end time (HH:MM)');

    // insert inputs before the first button so buttons remain visible
    const firstButton = container.querySelector('button');
    container.insertBefore(textInput, firstButton || null);
    container.insertBefore(startInput, firstButton || null);
    container.insertBefore(endInput, firstButton || null);

    // focus the task input first
    textInput.focus();
    textInput.select();

    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;

    const saveChanges = async () => {
      const newTask = textInput.value.trim();
      const newStart = startInput.value.trim();
      const newEnd = endInput.value.trim();

      if (newTask) item.task = newTask;

      // validate and apply times separately
      if (timeRegex.test(newStart)) {
        item.startTime = newStart;
      }
      if (timeRegex.test(newEnd)) {
        item.endTime = newEnd;
        const [hStr, mStr] = newEnd.split(':');
        item.hours = parseInt(hStr, 10);
        item.mins = parseInt(mStr, 10);
      }

      // recompute overdue
      const nowH = dayjs().hour();
      const nowM = dayjs().minute();
      item.overdue = (item.hours < nowH) || (item.hours === nowH && item.mins < nowM);

      // save locally and re-render
      this.save();
      this.renderTasks();

      // also persist updated task to backend
      try {
        const res = await fetch("http://localhost:5500/updateTask", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            task: item.task,
            startTime: item.startTime,
            endTime: item.endTime,
            status: item.sta
          })
        });
        const result = await res.json();
        console.log("Update response:", result.message || result);
      } catch (err) {
        console.error("Error updating task on server:", err);
      }
    };

    const cancelChanges = () => {
      this.renderTasks();
    };

    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelChanges();
      }
    };

    textInput.addEventListener('keydown', keyHandler);
    startInput.addEventListener('keydown', keyHandler);
    endInput.addEventListener('keydown', keyHandler);

    // When focus leaves both time & task inputs, save (small timeout to allow switching between them)
    const blurCheck = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (active !== textInput && active !== startInput && active !== endInput) {
          saveChanges();
        }
      }, 120);
    };

    textInput.addEventListener('blur', blurCheck);
    startInput.addEventListener('blur', blurCheck);
    endInput.addEventListener('blur', blurCheck);
  }
 // ...existing code...

 //update end
  popupGenerator() {
    this.popup.classList.add('active');
    this.overlay.style.zIndex = 999;
    this.taskStatus.innerHTML = "";
    let c = 0, t = 0;
    this.info.forEach((item) => {
      t++;
      this.taskStatus.innerHTML += `<p>${item.task}: ${item.sta}
      <button class="reason_button" id="${item.id}">r</button>
      </p>`;
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

  closeReasonPopup() {
    this.reason_popup.classList.remove('active');
  }

  openReasonPopup(){
    this.reason_popup.classList.add('active');
  }

  // ------------------- UTIL -------------------
  save() {
    localStorage.setItem("info", JSON.stringify(this.info));
  }
}

// ------------------- INIT -------------------
// ...existing code...
const app = new TaskManager();

// reload on device minute change (fires at the next exact minute boundary, then every minute).
// skips reload when user is actively typing in an input/textarea or an editable element
// ...existing code...
// reload on device minute change (fires at the next exact minute boundary, then every minute).
(function scheduleMinuteReload() {
  let timeoutId = null;

  const scheduleNext = () => {
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timeoutId = setTimeout(onBoundary, msUntilNextMinute);
  };

  const onBoundary = () => {
    const active = document.activeElement;//returns dom elemtent that is currently focused
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    const anyPopupActive = !!document.querySelector('.popup.active, .reason_popup.active');

    if (!isTyping && !anyPopupActive) {
      location.reload();
    }
    scheduleNext();
  };

  scheduleNext();

  // optional: expose cancel if needed for debugging
  window.cancelMinuteReload = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
})();
// first it estimates how much time before min is over. then it checks again but the default will always be 60 seconds
// then it reloads
