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
    this.currentEmpID = null;

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
    this.recordButton = document.querySelector(".record");
    this.recordPopup = document.querySelector(".record_popup");
    this.recordCancel = document.querySelector(".record_cancel");
    this.recordContent = document.querySelector(".record_content");
    this.createEmpBtn=document.querySelector(".createEmp");
    this.switchEmpBtn=document.querySelector(".switchEmp")
    // Bind events once
    this.bindEvents();
  }


  // ------------------- EVENT BINDING -------------------
  bindEvents() {
    window.addEventListener('load', async () => {
      await this.loadTasksFromDatabase();
      await this.loadempID();
      this.renderTasks();
    });
    window.addEventListener('keydown', (e) => this.generateTask(e));

    // single delegated click handler to avoid overlapping handlers and accidental dblclick deletes
    if (this.cobox) this.cobox.addEventListener('click', (e) => this.handleCoboxClick(e));

    this.openpopup.addEventListener('click', () => this.popupGenerator());
    this.closepopup.addEventListener("click", () => this.closepopupf());
    this.confirm.addEventListener("click", () => this.endDayConfirm());
    this.createEmpBtn.addEventListener("click",()=>this.createEmp());
    this.switchEmpBtn.addEventListener("click",()=>this.switchEmp());
    if (this.recordButton) this.recordButton.addEventListener('click', () => this.openRecordPopup());
    if (this.recordCancel) this.recordCancel.addEventListener("click", () => this.closeRecordPopup());
    // Handle Enter key in reason input via delegation (bind once)
    if (this.reason_popup) {
      this.reason_popup.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        const input = event.target.closest('.reason_input');
        if (!input) return;
        event.preventDefault();
        const reason = input.value.trim();
        input.value = "";
        await this.submitReason(reason);
      });
    }

    document.addEventListener("click", async (e) => {
      const button = e.target.closest && e.target.closest(".reason_button");

      if (button) {
        this.openReasonPopup();

        const buttonId = button.id;
        const reasonInput = this.reason_popup.querySelector(".reason_input");

        if (reasonInput) {
          reasonInput.dataset.buttonId = buttonId;
          console.log("ReasonInput linked to:", reasonInput.dataset.buttonId);
        }
      }

      if (e.target.classList && e.target.classList.contains("rcancel")) {
        this.closeReasonPopup();
      }
      if (e.target.classList && e.target.classList.contains("rconfirm")) {
        const reasonInput = this.reason_popup.querySelector(".reason_input");
        const reason = reasonInput ? reasonInput.value.trim() : "";
        if (reasonInput) reasonInput.value = "";
        await this.submitReason(reason);
      }
    });
  }

  // Delegated click handler to dispatch to delete/complete/update safely
  handleCoboxClick(event) {
    if (!(event.target instanceof Element)) return;
    const btn = event.target.closest('.delete-button, .completed-button, .update-button');
    if (!btn) return;

    // call corresponding method with event-like object where target is the button
    const fakeEvent = { target: btn };

    if (btn.classList.contains('delete-button')) {
      // require explicit click on delete button to remove (prevents accidental dblclick deletion)
      this.deleteTask(fakeEvent);
      return;
    }
    if (btn.classList.contains('completed-button')) {
      this.completeTask(fakeEvent);
      return;
    }
    if (btn.classList.contains('update-button')) {
      this.updateTask(fakeEvent);
      return;
    }
  }

  // ------------------- CORE METHODS -------------------
  async loadTasksFromDatabase() {
    try {
      // Use the endpoint that knows about the current collection on the server
      const res = await fetch("http://localhost:5500/getCurrentTasks", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }
      
      const data = await res.json();
      const tasks = data.tasks;
      const collectionName = data.collection;
      
      // Convert database format to frontend format
      this.info = tasks.map(doc => ({
        id: doc.id,
        task: doc.task,
        startTime: doc.startTime,
        endTime: doc.endTime,
        sta: doc.status === 'complete' ? 'complete' : 'pending',
        hours: parseInt(doc.endTime.split(':')[0], 10),
        mins: parseInt(doc.endTime.split(':')[1], 10),
        overdue: false
      }));
      
      console.log(`Loaded ${this.info.length} tasks from database collection '${collectionName}'`);
      
      // Save to localStorage so it persists during the session
      this.save();
    } catch (err) {
      console.error("Error loading tasks from database:", err);
      // Fall back to localStorage data if database fetch fails
      this.info = JSON.parse(localStorage.getItem("info")) || [];
    }
  }
async createEmp(){
  const name=prompt("Enter name");
  const id=nanoid();
  try {
        const res = await fetch("http://localhost:5500/createEmp", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id,
            name: name
          })
        });
        const result = await res.json();
        if (result.message) {
          console.log("Complete task response:", result.message);
        }
        // Re-render to reflect any changes
        this.renderTasks();
      } catch (err) {
        console.error("Error updating task status on server:", err);
      }
}
async switchEmp() {
  try {
    const res = await fetch("http://localhost:5500/switchEmp");
    const data = await res.json();

    const ids = data.employees.map(e => e.empID);
    const chosen = prompt(`Enter employee ID:\n${ids.join("\n")}`);
    if (!chosen) return;

    this.currentEmpID = chosen;   // <-- SAVE EMPLOYEE ID
    console.log("Switched to employee:", this.currentEmpID);

    await this.loadTasksFromDatabase();
    this.renderTasks();
  } catch (err) {
    console.error("Error switching employee:", err);
  }
}


async loadempID() {
    try {
      // Use the endpoint that knows about the current collection on the server
      const res = await fetch("http://localhost:5500/getempID", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }
    else{
        const data = await res.json();
        console.log(data);
    }} catch(err){
        console.log(err);
      }
    }
  renderTasks() {
    this.cobox.innerHTML = "";

    this.info.forEach((item) => {
      this.cobox.innerHTML += `
        <p class="container3" data-class="${item.id}">
          ${item.task} :<br> ${item.startTime} to ${item.endTime}
          <button class="delete-button" data-class="${item.id}">X</button>
          <button class="completed-button" data-class="${item.id}">/</button>
          <button class="update-button" data-class="${item.id}">U</button>
          <button class="checkbox" data-class="${item.id}" disabled></button>
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
//enter task
  async generateTask(event) {
    if (event.key === 'Enter' && this.task.value && this.time.value) {
      let [startTime, endTime] = this.time.value.split("-").map(s => s.trim());
      
      let id = nanoid();//setting id for each task
      let [hStr, mStr] = endTime.split(":");
      let hours = parseInt(hStr, 10);
      let mins = parseInt(mStr, 10);
      let obj={
        empID: this.currentEmpID,
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
              empID: taskObj.empID,
              id: taskObj.id,
              task: taskObj.task,
              startTime: taskObj.startTime,
              endTime: taskObj.endTime,
              status: taskObj.sta
            })
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
          }
          
          const result = await res.json();
          console.log("Task added to database:", result.message || JSON.stringify(result));
        } catch (err) {
          console.error("Error adding task to DB:", err);
          console.error("Error details:", err.message);
        }
      } else {
        console.error("Task not found for id", obj.id);
      }
    }
  }

  async deleteTask(event) {
    const btn = event.target instanceof Element ? event.target.closest('.delete-button') : null;
    if (!btn) return;
    const id = btn.dataset.class;
    const taskObj = this.info.find(item => item.id === id);
    console.log("TaskObj to delete:", taskObj);
    if (!taskObj) {
      console.error("Task not found with id:", id);
      return;
    }

    // confirmation to avoid accidental deletion
    if (!confirm("Delete this task?")) return;

    try {
      const res = await fetch("http://localhost:5500/deleteTask", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskObj.id })
      });
      const data = await res.json();
      console.log(data.message || JSON.stringify(data));
      this.info = this.info.filter(item => item.id !== id);
      this.save();
      this.renderTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  }

  async completeTask(event) {
    const btn = event.target instanceof Element ? event.target.closest('.completed-button') : null;
    if (!btn) return;
    const id = btn.dataset.class;
    const taskObj = this.info.find(item => item.id === id);
    
    if (!taskObj) {
      console.warn("Task not found in local state with id:", id, "- updating database only");
      // Task might exist in database but not in local state
      // Try to update database with status toggle (backend now supports partial updates)
      try {
        const res = await fetch("http://localhost:5500/updateTask", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id,
            status: "complete" // Set to complete (backend will handle partial update)
          })
        });
        const result = await res.json();
        if (result.message) {
          console.log("Complete task response:", result.message);
        }
        // Re-render to reflect any changes
        this.renderTasks();
      } catch (err) {
        console.error("Error updating task status on server:", err);
      }
      return;
    }
    
    if (!taskObj.overdue) {
      const newStatus = (taskObj.sta === "pending") ? "complete" : "pending";
      taskObj.sta = newStatus;
      
      // Update database
      try {
        const res = await fetch("http://localhost:5500/updateTask", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empID: taskObj.empID,
            id: taskObj.id,
            task: taskObj.task,
            startTime: taskObj.startTime,
            endTime: taskObj.endTime,
            status: taskObj.sta
          })
        });
        const result = await res.json();
        console.log("Complete task response:", result.message || result);
      } catch (err) {
        console.error("Error updating task status on server:", err);
      }
    }
    
    this.save();
    this.renderTasks();
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
    if (item.sta === "complete") return; // do not allow edits on completed tasks
    if (item.overdue) return; // do not allow edits on overdue tasks
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
    container.insertBefore(textInput, firstButton || null);//so para stays in place and search is under
    container.insertBefore(startInput, firstButton || null);//parentNode.insertBefore(newNode, referenceNode);

    container.insertBefore(endInput, firstButton || null);

    // focus the task input first
    textInput.focus();
    textInput.select();

    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;//checks for a valid input of time

    const saveChanges = async () => {
      const newTask = textInput.value.trim();
      const newStart = startInput.value.trim();
      const newEnd = endInput.value.trim();

      if (newTask) item.task = newTask;//testing the condition

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
            empID: taskObj.empID,
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
    this.overlay.classList.add('active');
    this.taskStatus.innerHTML = "";
    let c = 0, t = 0;
    this.info.forEach((item) => {
      t++;
      this.taskStatus.innerHTML += `<p class='popupContainer'>${item.task}: ${item.sta}
      <button class="reason_button" id="${item.id}">r</button>
      </p>`;
      if (item.sta === "complete") c++;
    });
    this.taskStatus.innerHTML += `<p class="notaskc">No of tasks completed: ${c}/${t}</p>`;
  }

  closepopupf() {
    this.popup.classList.remove('active');
    this.overlay.classList.remove('active');
  }

 endDayConfirm() {
  const title = prompt("Enter the title for the day");
  if (!title) return;
  (async () => {
    try {
      const res = await fetch("http://localhost:5500/endDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed with ${res.status}`);
      }
      console.log("Day ended successfully");
      this.info = [];
      this.save();
      this.renderTasks();
      this.closepopupf();
    } catch (error) {
      console.error("Error ending the day:", error);
    }
  })();
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

  async submitReason(reason) {
    try {
      const res = await fetch("http://localhost:5500/evaluate-reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      const AIp = document.querySelector(".AIp");
      if (AIp) AIp.innerText = data.evaluation;
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async openRecordPopup() {
  this.recordPopup.classList.add('active');
  this.overlay.classList.add('active');
  this.recordContent.innerHTML = "Loading collections...";

  try {
    const res = await fetch("http://localhost:5500/getAllCollections", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Request failed with ${res.status}`);
    }

    const data = await res.json();
    const collections = data.collections;

    let html = "";

    for (const [collectionName, documents] of Object.entries(collections)) {
      html += `<div style="margin-bottom: 20px;">
        <strong style="font-size: 20px;">Collection: ${collectionName}</strong><br>`;

      if (documents.length === 0) {
        html += `<em>No documents in this collection</em>`;
      } else {
        // Detect type of collection by checking first document
        const firstDoc = documents[0];

        const isTaskCollection =
          firstDoc.task !== undefined ||
          firstDoc.startTime !== undefined ||
          firstDoc.endTime !== undefined;

        const isEmpCollection =
          firstDoc.empID !== undefined &&
          firstDoc.name !== undefined;

        if (isTaskCollection) {
          // Display tasks
          documents.forEach((doc, index) => {
            html += `<div style="margin-left: 15px; margin-top: 10px;">
            <strong>Emp ID: ${doc.empID}</strong>
              <strong>Task ${index + 1}:</strong> ${doc.task || 'N/A'}<br>
              Time: ${doc.startTime || 'N/A'} - ${doc.endTime || 'N/A'}<br>
              Status: ${doc.status || 'N/A'}<br>
              ID: ${doc.id || doc._id || 'N/A'}<br>
            </div>`;
          });
        } else if (isEmpCollection) {
          // Display employee IDs
          documents.forEach(doc => {
            html += `<div style="margin-left: 15px; margin-top: 10px;">
              <strong>Employee:</strong> ${doc.name} <br>
              ID: ${doc.empID}<br>
            </div>`;
          });
        } else {
          // Unknown collection type — show raw JSON
          documents.forEach(doc => {
            html += `<pre style="margin-left: 15px; margin-top: 10px;">${JSON.stringify(doc, null, 2)}</pre>`;
          });
        }
      }

      html += `</div><hr style="margin: 15px 0;">`;
    }

    this.recordContent.innerHTML = html || "<em>No collections found</em>";
  } catch (err) {
    console.error("Error fetching collections:", err);
    this.recordContent.innerHTML = `<em>Error loading collections: ${err.message}</em>`;
  }
}


  closeRecordPopup() {
    this.recordPopup.classList.remove('active');
    this.overlay.classList.remove('active');
  }
}

// ------------------- INIT -------------------
// ...existing code...
//claude
// Add this section to script1.js, after the TaskManager class definition
// and before the initialization (before const app1 = new TaskManager();)

// ===============================================
// TASK ASSIGNMENT MODAL INTEGRATION
// ===============================================

class AssignTaskModal {
    constructor(taskManagerInstance) {
        this.taskManager = taskManagerInstance;
        
        // DOM elements
        this.openBtn = document.getElementById('openAssignModalBtn');
        this.modalOverlay = document.getElementById('assignModalOverlay');
        this.closeBtn = document.getElementById('closeAssignModalBtn');
        this.cancelBtn = document.getElementById('assignCancelBtn');
        this.form = document.getElementById('assignTaskForm');
        this.taskInput = document.getElementById('assignTaskInput');
        this.timeInput = document.getElementById('assignTimeInput');
        this.okBtn = document.getElementById('assignOkBtn');
        this.taskValidation = document.getElementById('assignTaskValidation');
        this.timeValidation = document.getElementById('assignTimeValidation');
        
        this.bindEvents();
    }
    
    bindEvents() {
        if (this.openBtn) this.openBtn.addEventListener('click', () => this.openModal());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());
        
        // Close on overlay click
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    this.closeModal();
                }
            });
        }
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay && this.modalOverlay.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Validate on input
        if (this.taskInput) this.taskInput.addEventListener('input', () => this.validateForm());
        if (this.timeInput) this.timeInput.addEventListener('input', () => this.validateForm());
        
        // Handle form submission
        if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Allow Enter key in time input to submit
        if (this.timeInput) {
            this.timeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.okBtn.disabled) {
                    e.preventDefault();
                    this.handleSubmit(e);
                }
            });
        }
    }
    
    openModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('active');
            if (this.taskInput) this.taskInput.focus();
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('active');
            this.resetForm();
            document.body.style.overflow = '';
        }
    }
    
    resetForm() {
        if (this.form) this.form.reset();
        if (this.okBtn) this.okBtn.disabled = true;
        if (this.taskValidation) this.taskValidation.classList.remove('show');
        if (this.timeValidation) this.timeValidation.classList.remove('show');
        if (this.okBtn) this.okBtn.classList.remove('loading');
    }
    
    validateForm() {
        const taskValue = this.taskInput ? this.taskInput.value.trim() : '';
        const timeValue = this.timeInput ? this.timeInput.value.trim() : '';
        
        // Enable OK button only if both fields have values
        if (this.okBtn) {
            this.okBtn.disabled = !(taskValue && timeValue);
        }
        
        // Hide validation messages when user starts typing
        if (taskValue && this.taskValidation) {
            this.taskValidation.classList.remove('show');
        }
        if (timeValue && this.timeValidation) {
            this.timeValidation.classList.remove('show');
        }
    }
    
    showValidationErrors() {
        const taskValue = this.taskInput ? this.taskInput.value.trim() : '';
        const timeValue = this.timeInput ? this.timeInput.value.trim() : '';
        
        if (!taskValue && this.taskValidation) {
            this.taskValidation.classList.add('show');
        }
        if (!timeValue && this.timeValidation) {
            this.timeValidation.classList.add('show');
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        const taskValue = this.taskInput ? this.taskInput.value.trim() : '';
        const timeValue = this.timeInput ? this.timeInput.value.trim() : '';
        
        // Validate inputs
        if (!taskValue || !timeValue) {
            this.showValidationErrors();
            return;
        }
        
        // Show loading state
        if (this.okBtn) {
            this.okBtn.classList.add('loading');
            this.okBtn.disabled = true;
        }
        
        try {
            // Use the existing TaskManager instance to create the task
            await this.createTaskViaManager(taskValue, timeValue);
            
            // Close modal on success
            this.closeModal();
            
            console.log('Task assigned successfully via modal!');
        } catch (error) {
            // Handle errors
            console.error('Failed to assign task:', error);
            alert('Failed to assign task. Please try again.');
            
            // Remove loading state
            if (this.okBtn) {
                this.okBtn.classList.remove('loading');
                this.okBtn.disabled = false;
            }
        }
    }
    
    async createTaskViaManager(taskDescription, timeRange) {
        // Validate inputs
        if (!taskDescription || !timeRange) {
            console.error('Task description and time range are required');
            throw new Error('Task description and time range are required');
        }
        
        try {
            // Parse time range
            let [startTime, endTime] = timeRange.split("-").map(s => s.trim());
            
            // Validate time format
            if (!startTime || !endTime) {
                throw new Error('Invalid time format');
            }
            
            // Generate unique ID
            let id = nanoid();
            
            // Parse end time for hours and minutes
            let [hStr, mStr] = endTime.split(":");
            let hours = parseInt(hStr, 10);
            let mins = parseInt(mStr, 10);
            
            // Validate parsed values
            if (isNaN(hours) || isNaN(mins)) {
                throw new Error('Invalid time values');
            }
            
            // Create task object
            let obj = {
              empID: this.taskManager.currentEmpID,
                id,
                startTime,
                endTime,
                hours,
                mins,
                task: taskDescription,
                sta: "pending",
                overdue: false
            };
            
            // Add to info array in TaskManager
            this.taskManager.info.push(obj);
            
            // Save and render using TaskManager methods
            this.taskManager.save();
            this.taskManager.renderTasks();
            
            // Find the task object
            const taskObj = this.taskManager.info.find(item => item.id === obj.id);
            console.log("TaskObj found:", taskObj);
            
            if (taskObj) {
                try {
                    // Send to backend
                    const res = await fetch("http://localhost:5500/addTask", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          empID:taskObj.empID,
                            id: taskObj.id,
                            task: taskObj.task,
                            startTime: taskObj.startTime,
                            endTime: taskObj.endTime,
                            status: taskObj.sta
                        })
                    });
                    
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
                    }
                    
                    const result = await res.json();
                    console.log("Task added to database:", result.message || JSON.stringify(result));
                    return true; // Success
                } catch (err) {
                    console.error("Error adding task to DB:", err);
                    console.error("Error details:", err.message);
                    throw err; // Re-throw to handle in UI
                }
            } else {
                console.error("Task not found for id", obj.id);
                throw new Error("Task not found after creation");
            }
        } catch (error) {
            console.error("Error in createTaskViaManager:", error);
            throw error; // Re-throw to handle in UI
        }
    }
}

// Initialize the modal after TaskManager is created
// Modify the existing initialization section:
// Replace: const app1 = new TaskManager();
// With:

const app1 = new TaskManager();
const assignModal = new AssignTaskModal(app1);

// Rest of the code remains the same...
//claude


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
    const inCobox = active && active.closest && active.closest('.cobox');
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable) && !inCobox;
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

// Export completeTask bound to app1 instance
export const completeTask = app1.completeTask.bind(app1);