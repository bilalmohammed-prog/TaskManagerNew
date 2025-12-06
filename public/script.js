// ------------------- UTILS -------------------
let a = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
export const nanoid = (e = 10) => {
  let t = "", r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) t += a[63 & r[n]];
  return t;
};



// ------------------- TASK MANAGER CLASS -------------------
class TaskManager {
  constructor() {
    // State
    this.currentSection = localStorage.getItem("currentSection") || "manager";

    this.info = JSON.parse(localStorage.getItem("info")) || [];
    this.currentEmpID = localStorage.getItem("currentEmpID") || null;
this.currentEmpName = localStorage.getItem("currentEmpName") || null;

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
    this.switchEmpBtn=document.querySelector(".switchEmp");
    this.empDisplay=document.querySelector(".empDisplay");
    this.actualEmpDisplay=document.querySelector(".actualEmpDisplay");
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

    this.openpopup.addEventListener('click', () => this.endDayConfirm());
    //this.closepopup.addEventListener("click", () => this.closepopupf());
    //this.confirm.addEventListener("click", () => this.endDayConfirm());
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
    let retrieveFrom = "";
    if (this.currentSection==="employees"){
      retrieveFrom = this.actualEmpID || localStorage.getItem("actualEmpID") || "";
    }else if(this.currentSection==="manager"){
      retrieveFrom=this.currentEmpID;
    }
    try {
    const res = await fetch(`http://localhost:5500/getCurrentTasks?empID=${retrieveFrom}`, {
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
  const email = prompt("Enter email");

if (!email) {
  alert("Email is required.");
  return;
}

// Ask for manager ID
const managerID = prompt("Enter manager ID");

if (!managerID) {
  alert("Manager ID is required.");
  return;
}
  
  try {
        const res = await fetch("http://localhost:5500/createEmp", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            managerID: managerID
          })
        });
        const result = await res.json();
        if (result.message) {
          console.log("Complete task response:", result.data);
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

    // Show list of employees for user to pick
    const listString = data.employees
      .map(e => `${e.empID} — ${e.name}`)
      .join("\n");

    

    // find matched employee object
    const emp = data.employees.find(e => e.empID === chosenID);
    if (!emp) {
      alert("Invalid employee ID");
      return;
    }

    this.currentEmpID = emp.empID;
    this.currentEmpName = emp.name;

    // Save both to localStorage
    localStorage.setItem("currentEmpID", this.currentEmpID);
    localStorage.setItem("currentEmpName", this.currentEmpName);

    console.log("Switched to:", this.currentEmpID, this.currentEmpName);

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
    }//main render tasks
  renderTasks() {
    this.currentEmpID = localStorage.getItem("currentEmpID");
  this.currentEmpName = localStorage.getItem("currentEmpName");
  this.actualEmpName = localStorage.getItem("actualEmpName");
  this.actualEmpID = localStorage.getItem("actualEmpID");

  if (this.empDisplay) {
    if (this.currentEmpID && this.currentEmpName) {
      this.empDisplay.innerHTML = `Employee Name: ${this.currentEmpName} <br><br>Employee ID: ${this.currentEmpID}`
      this.actualEmpDisplay.innerHTML = `<br><br>Logged in as:<br> ${this.actualEmpName}
      <br><br>Your ID: ${this.actualEmpID}`;
    } else {
      this.empDisplay.innerHTML = "No employee selected";
    }
  }
    
    this.cobox.innerHTML = "";

    this.info.forEach((item) => {
      if (this.currentSection==="manager"){
  this.cobox.innerHTML += `
    <div class="container3" data-class="${item.id}">
      <div class="taskText">
        ${item.task} :<br> ${item.startTime} to ${item.endTime}
      </div>
      <div class="container2">
        <button class="delete-button" data-class="${item.id}">X</button>
        <button class="update-button" data-class="${item.id}">U</button>
        <button class="checkbox" data-class="${item.id}" disabled></button>
      </div>
    </div>
  `;
}

        else if (this.currentSection==="employees"){
          this.cobox.innerHTML += `
        <div class="container3" data-class="${item.id}">
        <div class="taskText">
          ${item.task} :<br> ${item.startTime} to ${item.endTime}
          </div>
          <div class="container2">
          <button class="completed-button" data-class="${item.id}">/</button>
          <button class="checkbox" data-class="${item.id}" disabled></button>
        </div></div>
        
        `;
        }
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
    if (!this.currentEmpID) {
    alert("Select an employee first");
    return;
}

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
    container.classList.add("editing");

    if (!container) return;

    const id = container.dataset.class;
    const item = this.info.find(i => i.id === id);
    if (!item) return;
    if (item.sta === "complete") return; // do not allow edits on completed tasks
    if (item.overdue) return; // do not allow edits on overdue tasks
    // avoid opening multiple editors on same item
    if (container.querySelector('.edit-input') || container.querySelector('.edit-start') || container.querySelector('.edit-end')) return;

    // Clear the task text area (don't remove buttons or other elements)
    const taskTextDiv = container.querySelector('.taskText');
    if (taskTextDiv) taskTextDiv.innerHTML = '';

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

    // insert inputs before the controls container so the buttons remain visible
    const controls = container.querySelector('.container2');
    container.insertBefore(textInput, controls || null);
    container.insertBefore(startInput, controls || null);
    container.insertBefore(endInput, controls || null);

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
      container.classList.remove("editing");

      this.renderTasks();

      // also persist updated task to backend
      try {
        const res = await fetch("http://localhost:5500/updateTask", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empID: item.empID,
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
      container.classList.remove("editing");

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
  
  this.currentEmpID = null;
this.currentEmpName = null;
localStorage.removeItem("currentEmpID");
localStorage.removeItem("currentEmpName");

this.empDisplay.innerHTML = "No employee selected";

  this.info = [];
  this.save();
  this.renderTasks();
  this.closepopupf();
  /**(async () => {
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
  })();**/
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

    // Extract empID and system collections
    const empIDCollection = collections.empID || [];
    const systemCollections = {};
    
    // Gather all non-empID collections as "system" data
    for (const [collectionName, documents] of Object.entries(collections)) {
      if (collectionName === 'empID' || collectionName.startsWith('system.')) {
        continue; // Skip empID and MongoDB system collections
      }
      systemCollections[collectionName] = documents;
    }

    // Build the HTML output
    let html = this.renderEmployeeSection(empIDCollection);
    html += this.renderSystemSection(systemCollections, empIDCollection);

    this.recordContent.innerHTML = html || "<em>No collections found</em>";
  } catch (err) {
    console.error("Error fetching collections:", err);
    this.recordContent.innerHTML = `<em>Error loading collections: ${err.message}</em>`;
  }
}

/**
 * Renders the Employee ID section
 * @param {Array} empIDCollection - Array of employee objects with id and name
 * @returns {string} HTML string for employee section
 */
renderEmployeeSection(empIDCollection) {
  let html = `<div style="margin-bottom: 30px;">
    <strong style="font-size: 22px; display: block; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 8px;">
      Employee Collection
    </strong>`;

  if (!empIDCollection || empIDCollection.length === 0) {
    html += `<em style="margin-left: 15px;">No employees found</em>`;
  } else {
    empIDCollection.forEach(employee => {
      html += `<div style="
  margin: 15px 0;
  padding: 12px;
  background-color: rgba(0,0,0,0.05);
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
  line-height: 1.4;
">

  <!-- Name + empID at top -->
  <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
    ${employee.name} 
    <span style="color: rgba(0,0,0,0.6);"> (ID: ${employee.empID})</span>
  </div>

  <!-- Details -->
  <div style="font-size: 14px;">
    <div><strong>Google ID:</strong> ${employee.googleId || "—"}</div>
    <div><strong>Email:</strong> ${employee.email || "—"}</div>
    <div><strong>Manager ID:</strong> ${employee.managerID || "—"}</div>
    <div><strong>Verified:</strong> ${employee.verified}</div>
    <div><strong>Status:</strong> ${employee.status}</div>
    <div><strong>Last Login:</strong> ${employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : "—"}</div>
    <div><strong>Created At:</strong> ${employee.createdAt ? new Date(employee.createdAt).toLocaleString() : "—"}</div>
    <div><strong>Roles:</strong> ${employee.roles?.join(", ") || "—"}</div>
  </div>

</div>
`;
    });
  }

  html += `</div>`;
  return html;
}

/**
 * Renders the System section with tasks grouped by employee
 * @param {Object} systemCollections - Object containing all system collections
 * @param {Array} empIDCollection - Array of employee objects for name lookup
 * @returns {string} HTML string for system section
 */
renderSystemSection(systemCollections, empIDCollection) {
  // Create employee lookup map for quick name resolution
  const employeeMap = new Map();
  if (empIDCollection) {
    empIDCollection.forEach(emp => {
      employeeMap.set(emp.empID, emp.name);
    });
  }

  let html = `<div style="margin-bottom: 30px;">
    <strong style="font-size: 22px; display: block; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 8px;">
      System Collection
    </strong>`;

  const collectionNames = Object.keys(systemCollections);
  
  if (collectionNames.length === 0) {
    html += `<em style="margin-left: 15px;">No system collections found</em></div>`;
    return html;
  }

  // Process each collection
  collectionNames.forEach(collectionName => {
    const documents = systemCollections[collectionName];
    
    if (!documents || documents.length === 0) {
      html += `<div style="margin-left: 15px; margin-bottom: 20px;">
        <strong style="font-size: 18px; color: rgba(0,0,0,0.7);">Collection: ${collectionName}</strong><br>
        <em style="margin-left: 15px;">No tasks in this collection</em>
      </div>`;
      return;
    }

    // Group tasks by employee ID
    const tasksByEmployee = this.groupTasksByEmployee(documents);

    html += `<div style="margin-left: 15px; margin-bottom: 25px;">
      <strong style="font-size: 18px; color: rgba(0,0,0,0.8); display: block; margin-bottom: 12px;">
        Collection: ${collectionName}
      </strong>`;

    // Render each employee's tasks
    const employeeIDs = Array.from(tasksByEmployee.keys()).sort();
    
    employeeIDs.forEach(empID => {
      const employeeName = employeeMap.get(empID) || "Unknown Employee";
      const tasks = tasksByEmployee.get(empID);

      html += `<div style="margin-left: 20px; margin-bottom: 18px; padding: 12px; background-color: rgba(0,0,0,0.03); border-radius: 6px; border-left: 3px solid rgba(0,0,0,0.2);">
        <strong style="font-size: 16px; display: block; margin-bottom: 10px;">
          Employee: ${employeeName} <span style="color: rgba(0,0,0,0.6);">(ID: ${empID})</span>
        </strong>`;

      // Render each task for this employee
      tasks.forEach((task, index) => {
        html += this.renderTaskItem(task, index);
      });

      html += `</div>`; // Close employee div
    });

    html += `</div>`; // Close collection div
  });

  html += `</div>`; // Close system section
  return html;
}

/**
 * Groups task documents by employee ID
 * @param {Array} documents - Array of task documents
 * @returns {Map} Map of empID -> array of tasks
 */
groupTasksByEmployee(documents) {
  const grouped = new Map();

  documents.forEach(doc => {
    const empID = doc.empID || "unassigned";
    
    if (!grouped.has(empID)) {
      grouped.set(empID, []);
    }
    
    grouped.get(empID).push(doc);
  });

  return grouped;
}

/**
 * Renders a single task item
 * @param {Object} task - Task document object
 * @param {number} index - Task index for numbering
 * @returns {string} HTML string for task item
 */
renderTaskItem(task, index) {
  return `<div style="margin-left: 15px; margin-top: 8px; padding: 8px; background-color: rgba(255,255,255,0.5); border-radius: 4px;">
    <strong style="font-size: 14px;">Task ${index + 1}:</strong> ${task.task || 'N/A'}<br>
    <span style="font-size: 13px; color: rgba(0,0,0,0.7);">
      Time: ${task.startTime || 'N/A'} - ${task.endTime || 'N/A'}<br>
      Status: ${task.status || 'N/A'}<br>
      ID: ${task.id || task._id || 'N/A'}
    </span>
  </div>`;
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

// ===============================================
// SWITCH EMPLOYEE MODAL CLASS
// Add this class definition to script.js, after the AssignTaskModal class
// ===============================================

class SwitchEmpModal {
    constructor(taskManagerInstance) {
        this.taskManager = taskManagerInstance;
        
        // DOM elements
        this.triggerBtn = document.querySelector('.switchEmp');
        this.modalOverlay = document.getElementById('switchEmpModalOverlay');
        this.modal = document.querySelector('.switch-emp-modal');
        this.closeBtn = document.getElementById('closeSwitchEmpModalBtn');
        this.cancelBtn = document.getElementById('switchEmpCancelBtn');
        this.listContainer = document.getElementById('switchEmpListContainer');
        this.employeeList = document.getElementById('switchEmpList');
        this.loadingState = document.getElementById('switchEmpLoading');
        this.errorState = document.getElementById('switchEmpError');
        this.emptyState = document.getElementById('switchEmpEmpty');
        this.retryBtn = document.getElementById('switchEmpRetryBtn');
        
        this.employees = [];
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Open modal when switchEmp button is clicked
        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', () => this.openModal());
        }
        
        // Close modal handlers
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
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
            if (e.key === 'Escape' && 
                this.modalOverlay && 
                this.modalOverlay.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Retry button
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => this.loadEmployees());
        }
        
        // Delegate employee selection clicks
        if (this.employeeList) {
            this.employeeList.addEventListener('click', (e) => {
                const item = e.target.closest('.switch-emp-item');
                if (item && !item.classList.contains('current')) {
                    const empID = item.dataset.empId;
                    const empName = item.dataset.empName;
                    this.selectEmployee(empID, empName);
                }
            });
        }
    }
    
    async openModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Load employees when modal opens
            await this.loadEmployees();
        }
    }
    
    closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    async loadEmployees() {
        this.showLoading();
        
        try {
            const res = await fetch("http://localhost:5500/switchEmp");
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            this.employees = data.employees || [];
            
            if (this.employees.length === 0) {
                this.showEmpty();
            } else {
                this.renderEmployeeList();
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
            this.showError();
        }
    }
    
    showLoading() {
        if (this.loadingState) this.loadingState.style.display = 'flex';
        if (this.errorState) this.errorState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.employeeList) this.employeeList.style.display = 'none';
    }
    
    showError() {
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.errorState) this.errorState.style.display = 'flex';
        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.employeeList) this.employeeList.style.display = 'none';
    }
    
    showEmpty() {
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.errorState) this.errorState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'flex';
        if (this.employeeList) this.employeeList.style.display = 'none';
    }
    
    renderEmployeeList() {
        if (!this.employeeList) return;
        
        // Hide loading/error states
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.errorState) this.errorState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';
        
        // Show list
        this.employeeList.style.display = 'flex';
        
        // Clear existing items
        this.employeeList.innerHTML = '';
        
        // Get current employee ID from taskManager
        const currentEmpID = this.taskManager.currentEmpID;
        const actualEmpID = localStorage.getItem("actualEmpID");
        
        // Render each employee (excluding the logged-in user)
        this.employees.forEach(emp => {
            // Skip if this is the logged-in user
            if (emp.empID === actualEmpID) return;
            
            const isCurrent = emp.empID === currentEmpID;
            
            const item = document.createElement('div');
            item.className = 'switch-emp-item' + (isCurrent ? ' current' : '');
            item.dataset.empId = emp.empID;
            item.dataset.empName = emp.name;
            
            item.innerHTML = `
                <div class="switch-emp-item-name">
                    ${this.escapeHtml(emp.name)}
                    ${isCurrent ? '<span class="switch-emp-item-badge">Current</span>' : ''}
                </div>
                <div class="switch-emp-item-id">ID: ${this.escapeHtml(emp.empID)}</div>
            `;
            
            this.employeeList.appendChild(item);
        });
    }
    
    async selectEmployee(empID, empName) {
        if (!empID || !empName) {
            console.error("Invalid employee selection");
            return;
        }
        
        // Update taskManager's current employee
        this.taskManager.currentEmpID = empID;
        this.taskManager.currentEmpName = empName;
        
        // Save to localStorage
        localStorage.setItem("currentEmpID", empID);
        localStorage.setItem("currentEmpName", empName);
        
        console.log("Switched to employee:", empID, empName);
        
        // Reload tasks for the selected employee
        await this.taskManager.loadTasksFromDatabase();
        this.taskManager.renderTasks();
        
        // Close the modal
        this.closeModal();
    }
    
    // Utility function to escape HTML and prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
const app1 = new TaskManager();
const assignModal = new AssignTaskModal(app1);
const switchEmpModal = new SwitchEmpModal(app1);
//switching sections
window.addEventListener("load", () => {
    const section = localStorage.getItem("currentSection") || "tasks";
    showSection(section);
    
    app1.renderTasks();
});

function showSection(section) {
    localStorage.setItem("currentSection", section);
    app1.currentSection = section;
    
    app1.renderTasks();
    // show/hide areas here
}



document.querySelector(".inbox").addEventListener("click", () => {
    showSection("tasks");
    location.reload();
});

document.querySelector(".empAccess").addEventListener("click", () => {
    showSection("employees");
    location.reload();
});

document.querySelector(".managerAccess").addEventListener("click", () => {
    showSection("manager");
    location.reload();
});


// Initialize the modal after TaskManager is created
// Modify the existing initialization section:
// Replace: const app1 = new TaskManager();
// With:

  // <-- THIS WAS MISSING!

// reload on device minute change
/**(function scheduleMinuteReload() {
  let timeoutId = null;

  const scheduleNext = () => {
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timeoutId = setTimeout(onBoundary, msUntilNextMinute);
  };

  const onBoundary = () => {
    const active = document.activeElement;
    const inCobox = active && active.closest && active.closest('.cobox');
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable) && !inCobox;
    const anyPopupActive = !!document.querySelector('.popup.active, .reason_popup.active');

    if (!isTyping && !anyPopupActive) {
      location.reload();
    }
    scheduleNext();
  };

  scheduleNext();

  window.cancelMinuteReload = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
})();**/

