// ------------------- UTILS -------------------
let a = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
export const nanoid = (e = 10) => {
  let t = "", r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) t += a[63 & r[n]];
  return t;
};

import { CONFIG } from "./config.js";

// Small utility used in several UI renderers
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function prettyDateTime(dt) {
  const d = new Date(dt);
  if (isNaN(d)) return dt;

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}


// ------------------- TASK MANAGER CLASS -------------------
class TaskManager {
  constructor() {
    // State
    this.currentSection = localStorage.getItem("currentSection") || "manager";

    this.info = JSON.parse(localStorage.getItem("info")) || [];
    this.currentEmpID = localStorage.getItem("currentEmpID") || null;
this.currentEmpName = localStorage.getItem("currentEmpName") || null;

    // DOM elements
    this.progress = document.querySelector(".progress");
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
    this.assignTaskBtn=document.querySelector(".assign-task-btn");
    this.switchEmpBtn=document.querySelector(".switchEmp");
    this.draftBtn=document.querySelector(".draft"); 
    this.empDisplay=document.querySelector(".empDisplay");
    this.actualEmpDisplay=document.querySelector(".actualEmpDisplay");
    this.logoutBtn=document.querySelector(".logout-btn");
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
    this.progress.addEventListener("click", () => this.progressDisplay());
    this.draftBtn.addEventListener("click", () => draft.openDraftPopup());

    document.addEventListener("click", (e) => {
  if (e.target.closest(".logout-btn")) this.logout();
});

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



  //Progress
progressDisplay(){
showSection("progress");
this.progressDisplayReload();
}

trustModifier(score) {
  if (score >= 90) return 0.9;
  if (score >= 75) return 1.0;
  if (score >= 60) return 1.2;
  if (score >= 40) return 1.5;
  return 2.0;
}



async progressDisplayReload() {
  this.cobox.innerHTML = `<div style="padding:12px;color:#666">Loading progress...</div>`;

  try {
    // -------------------------------
    // 1. Manager check
    // -------------------------------
    const managerID = localStorage.getItem("actualEmpID");
    if (!managerID) {
      this.cobox.innerHTML = "<div style='color:red'>Manager not logged in</div>";
      return;
    }

    // -------------------------------
    // 2. Fetch all DB collections
    // -------------------------------
    const res = await fetch(`${CONFIG.BASE_URL}/getAllCollections`);
    const data = await res.json();

    // Always fetch the up-to-date employee list (trustScore included)
const empRes = await fetch(`${CONFIG.BASE_URL}/getempID`);
const empData = await empRes.json();
const employees = empData.employees || [];

// Task collections still come from getAllCollections
const systemCollections = data.collections;


    // -------------------------------
    // 3. Get only employees managed by this manager
    // -------------------------------
    const myEmployees = employees.filter(emp => emp.managerID === managerID);
    if (myEmployees.length === 0) {
      this.cobox.innerHTML = "<div>No employees under you</div>";
      return;
    }

    // -------------------------------
    // 4. Combine tasks from ALL system collections
    // -------------------------------
    let allTasks = [];
    for (const [key, docs] of Object.entries(systemCollections)) {
      if (key !== "empID" && !key.startsWith("system.")) {
        allTasks.push(...docs);
      }
    }

    // -------------------------------
    // 5. Filter tasks belonging to your employees only
    // -------------------------------
    const totalCompanyTasks = allTasks.filter(t =>
      myEmployees.some(e => e.empID === t.empID)
    );

    const totalCompletedCompanyTasks =
      totalCompanyTasks.filter(t => 
        t.status === "complete" || t.status === "completedLate"
      ).length;


    const companyPercent =
      totalCompanyTasks.length === 0
        ? 0
        : Math.round((totalCompletedCompanyTasks / totalCompanyTasks.length) * 100);

    // -------------------------------
    // 6. TRUST + ESTIMATION ENGINE
    // -------------------------------

    // Group tasks by employee ID
    const tasksByEmp = {};
    totalCompanyTasks.forEach(t => {
      (tasksByEmp[t.empID] ||= []).push(t);
    });

    // Compute per-employee raw hours, trust score, and estimates
    const employeeResults = myEmployees.map(emp => {
      const empTasks = tasksByEmp[emp.empID] || [];
      let empRawHours = 0;

      let empPendingHours = 0;
const now = new Date(new Date().toISOString());


empTasks.forEach(t => {
  if (t.status === "complete" || t.status === "completedLate") return;

  const start = new Date(t.startTime);
  const end = new Date(t.endTime);

  if (isNaN(start) || isNaN(end)) return;

  // If task is overdue, count FULL duration as pending
if (now >= end) {
  empPendingHours += (end - start) / (1000 * 60 * 60);
  return;
}

// Otherwise count remaining scheduled time
const effectiveStart = new Date(Math.max(start.getTime(), now.getTime()));
empPendingHours += (end - effectiveStart) / (1000 * 60 * 60);

});

const modifier = this.trustModifier(emp.trustScore ?? 80);
const empEstimate = Math.round(empPendingHours * modifier);


return { emp, empTasks, empEstimate };


    });

    // Total team estimate = sum of all employee estimates
    const teamEstimate = employeeResults.reduce(
      (sum, r) => sum + r.empEstimate,
      0
    );

    // -------------------------------
    // 7. BUILD HTML OUTPUT
    // -------------------------------
    let html = `
      <h2 style="margin-bottom:15px">Employee Progress</h2>

      <div style="margin-bottom:20px;padding:10px;border:1px solid #ddd;border-radius:6px">
        <div style="font-weight:bold">Combined Team</div>

        <div style="font-size:13px">
          ${totalCompletedCompanyTasks} / ${totalCompanyTasks.length} tasks completed
        </div>

        <div style="background:#eee;height:18px;border-radius:10px;overflow:hidden">
          <div style="height:100%;width:${companyPercent}%;
            background:linear-gradient(90deg,#00c853,#64dd17);">
          </div>
        </div>

        <div style="font-size:12px">${companyPercent}%</div>

        <div style="margin-top:10px;font-size:13px">
          Estimated Team Completion: <b>${teamEstimate} hours</b>
        </div>
      </div>
    `;

    // -------------------------------
    // 8. EMPLOYEE-BY-EMPLOYEE CARDS
    // -------------------------------
    employeeResults.forEach(r => {
      const emp = r.emp;
      const empTasks = r.empTasks;
      const empEstimate = r.empEstimate;

      const total = empTasks.length;
      const completed = empTasks.filter(t =>
  t.status === "complete" || t.status === "completedLate"
).length;

      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

      html += `
        <div style="margin-bottom:20px;padding:10px;border:1px solid #ddd;border-radius:6px">
          <div style="margin-bottom:6px">
  <div style="font-weight:bold;">
    ${emp.name} <span style="color:#ddd">(ID: ${emp.empID})</span>
  </div>
  <div style="font-size:12px; color:#ddd; margin-top:2px;">
    ${emp.email || "No Email"}
  </div>
</div>


          <div style="font-size:13px">
            ${completed} / ${total} tasks completed
          </div>

          <div style="background:#eee;height:18px;border-radius:10px;overflow:hidden">
            <div style="height:100%;width:${percent}%;
              background:linear-gradient(90deg,#00c853,#64dd17);">
            </div>
          </div>

          <div style="font-size:12px">${percent}%</div>

          <div style="margin-top:8px;font-size:13px">
            Estimated Completion Time: <b>${empEstimate} hours</b>
          </div>

          <div style="margin-top:6px;font-size:12px;color:#ddd">
            Trust Score: <b style="color:#ddd">${emp.trustScore ?? 80}</b>
          </div>
        </div>
      `;
    });

    // -------------------------------
    // 9. Render final HTML
    // -------------------------------
    this.cobox.innerHTML = html;

  } catch (err) {
    console.error("Progress load error:", err);
    this.cobox.innerHTML = "<div style='color:red'>Failed to load progress</div>";
  }
}




  //Progress

  // ------------------- CORE METHODS -------------------
  async loadTasksFromDatabase() {
    let retrieveFrom = "";
    if (this.currentSection==="employees"){
      retrieveFrom = this.actualEmpID || localStorage.getItem("actualEmpID") || "";
    }else if(this.currentSection==="manager"){
      retrieveFrom=this.currentEmpID;
    }else if(this.currentSection==="inbox"){
      this.managerInboxRefresh();
    }
    try {
    const res = await fetch(`${CONFIG.BASE_URL}/getCurrentTasks?empID=${retrieveFrom}`, {
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
        sta: doc.status, // ✅ PRESERVE complete, completedLate, pending, incomplete

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
async createEmp() {
  const action = confirm("OK = Add Employee\nCancel = Drop Employee");

  if (action) {
    // ✅ ADD EMPLOYEE (existing logic)
    const email = prompt("Enter employee email");

    if (!email) return alert("Email is required.");

    const message = prompt("Optional message") || '';

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverEmail: email,
          message
        })
      });

      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Failed to send invite");
      }

      alert("Invitation sent");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }

  } else {
    // ✅ DROP EMPLOYEE
    const email = prompt("Enter Employee email to remove");

    if (!email) return alert("Employee email required");

    try {
      const res = await fetch("/api/employee/drop", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) return alert(data.error || "Drop failed");

      alert("Employee removed successfully");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  }
}

async switchEmp() {
  // simply open the modal, do NOT fetch or prompt here
  const modalOverlay = document.getElementById("switchEmpModalOverlay");
  if (modalOverlay) {
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}





async loadempID() {
    try {
      // Use the endpoint that knows about the current collection on the server
      const res = await fetch(`${CONFIG.BASE_URL}/getempID`, {
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
if (this.currentSection!=="manager"){
  if (this.createEmpBtn) this.createEmpBtn.style.display = 'none';
    if (this.switchEmpBtn) this.switchEmpBtn.style.display = 'none';
    if (this.openpopup) this.openpopup.style.display = 'none';
    if (this.assignTaskBtn) this.assignTaskBtn.style.display = 'none';
    if (this.empDisplay) this.empDisplay.style.display = 'none';
}else{
  if (this.createEmpBtn) this.createEmpBtn.style.display = 'block';
    if (this.switchEmpBtn) this.switchEmpBtn.style.display = 'block';
    if (this.openpopup) this.openpopup.style.display = 'block';
    if (this.assignTaskBtn) this.assignTaskBtn.style.display = 'block';
    if (this.empDisplay) this.empDisplay.style.display = 'block';
}
if (this.currentSection==="inbox"){
  this.draftBtn.style.display = 'block';
}else{
  this.draftBtn.style.display = 'none';
}
  if (this.empDisplay) {
  if (this.currentEmpID && this.currentEmpName) {
    this.empDisplay.innerHTML = `Employee Name: ${this.currentEmpName} <br>Employee ID: ${this.currentEmpID}`;
  } else {
    this.empDisplay.innerHTML = "No employee selected";
  }
if(this.actualEmpID && this.actualEmpDisplay){
  this.actualEmpDisplay.innerHTML = `
    <br><br>Logged in as:<br> ${this.actualEmpName}
    <br><button class="logout-btn">Logout</button>
    <br>Your ID: ${this.actualEmpID}
  `;
}}

    
    this.cobox.innerHTML = "";

    this.info.forEach((item) => {
      if (this.currentSection==="manager"){
  this.cobox.innerHTML += `
    <div class="container3" data-class="${item.id}">
      <div class="taskText">
        ${item.task} :<br>
${prettyDateTime(item.startTime)} → ${prettyDateTime(item.endTime)}

      </div>
      <div class="container2">
        <button class="action-btn delete-button" data-class="${item.id}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
        <button class="action-btn update-button" data-class="${item.id}"><svg viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M550.208 960H209.28A81.792 81.792 0 0 1 128 877.76V146.24A81.92 81.92 0 0 1 209.344 64h613.632a81.92 81.92 0 0 1 81.28 82.432v405.76a29.824 29.824 0 1 1-59.584 0V146.56a22.272 22.272 0 0 0-21.76-22.656H209.408a22.08 22.08 0 0 0-21.696 22.528v731.52a21.76 21.76 0 0 0 21.44 22.464h341.056a29.824 29.824 0 0 1 0.064 59.584z m196.352-600.96H285.824a29.824 29.824 0 1 1 0-59.712h460.8a29.824 29.824 0 1 1 0 59.712z m-204.8 156.8H285.824a29.824 29.824 0 1 1 0-59.712h255.936a29.824 29.824 0 1 1 0 59.648z m179.2 391.936c-101.12 0-183.424-83.84-183.424-186.624a29.824 29.824 0 1 1 59.712 0c0 70.016 55.552 126.976 123.584 126.976 17.408 0 34.24-3.712 50.048-10.88a29.888 29.888 0 0 1 24.768 54.336c-23.552 10.688-48.64 16.192-74.688 16.192z m153.6-156.8a29.824 29.824 0 0 1-29.824-29.824c0-70.016-55.552-126.976-123.648-126.976-16.32 0-32.384 3.2-47.36 9.6a29.888 29.888 0 0 1-23.424-54.912 180.224 180.224 0 0 1 70.784-14.336c101.12 0 183.424 83.84 183.424 186.624a30.016 30.016 0 0 1-29.952 29.824z m-204.8-104.576h-51.264a29.76 29.76 0 0 1-25.28-14.08 30.144 30.144 0 0 1-1.536-28.928l25.6-52.352a29.696 29.696 0 0 1 53.632 0l25.6 52.352a29.696 29.696 0 0 1-1.472 28.928 29.504 29.504 0 0 1-25.28 14.08z m127.552 269.568h-1.024a29.696 29.696 0 0 1-24.896-14.848l-25.6-44.288a29.888 29.888 0 0 1 23.808-44.672l58.048-4.032c11.392-0.704 22.144 5.12 27.904 14.848a30.016 30.016 0 0 1-1.024 31.616l-32.448 48.256a29.824 29.824 0 0 1-24.768 13.12z" fill="#000000"></path></g></svg></button>
        <button class="checkbox" data-class="${item.id}" disabled></button>
      </div>
    </div>
  `;
}

        else if (this.currentSection==="employees"){
          this.cobox.innerHTML += `
        <div class="container3" data-class="${item.id}">
        <div class="taskText">
          ${item.task} :<br> ${prettyDateTime(item.startTime)} to ${prettyDateTime(item.endTime)}
          </div>
          <div class="container2">
          <button class="action-btn completed-button" data-class="${item.id}"><svg width="22" height="22" viewBox="0 0 24 24" fill="black">
  <path d="M9.00039 16.2002L4.80039 12.0002L3.40039 13.4002L9.00039 19.0002L21.0004 7.0002L19.6004 5.6002L9.00039 16.2002Z"/>
</svg>
</button>
          <button class="checkbox" data-class="${item.id}" disabled></button>
        </div></div>
        
        `;
        }
      // check overdue
      const now = new Date(new Date().toISOString());

const taskEnd = new Date(item.endTime);

if (!isNaN(taskEnd) && taskEnd < now) {
  item.overdue = true;
} else {
  item.overdue = false;
}


      const container = this.cobox.querySelector(`.container3[data-class="${item.id}"]`);
      if (container) {
        const checkbox = container.querySelector('.checkbox');
        if (item.sta === "completedLate") {
  checkbox.style.backgroundColor = "rgb(255, 214, 0)"; //YELLOW (late but submitted)
}
else if (item.sta === "complete") {
  checkbox.style.backgroundColor = "rgb(68, 255, 136)"; // GREEN (on-time)
}
else if (item.overdue === true) {
  checkbox.style.backgroundColor = "rgb(218, 62, 62)"; // RED (late NOT submitted)
}
else {
  checkbox.style.backgroundColor = ""; // normal pending
}


      }
    });

    this.save();
  }
//enter task
async logout() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    // Clear everything
    localStorage.clear();

    window.location.href = "/login.html";
  } catch (err) {
    console.error("Logout failed", err);
    alert("Logout failed");
  }
}

  async generateTask(event) {
    if (!this.currentEmpID) {
    alert("Select an employee first");
    return;
}

    if (event.key === 'Enter' && this.task.value && this.time.value) {
      let [startTime, endTime] = this.time.value.split("-").map(s => s.trim());

// Parse full datetime safely
const startDate = new Date(startTime);
const endDate = new Date(endTime);

if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
  alert("Invalid date-time format. Use:\nYYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM");
  return;
}

// Store hours & mins only for overdue UI (no backend change)
let hours = endDate.getHours();
let mins = endDate.getMinutes();

      
      let id = nanoid();//setting id for each task
      
      
      let obj={
        empID: this.currentEmpID,
        id,
        startTime,
        endTime,
        hours,
        mins,
        task: this.task.value,
        sta: "pending",
        proof:"",
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
          const res = await fetch(`${CONFIG.BASE_URL}/addTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              empID: taskObj.empID,
              id: taskObj.id,
              task: taskObj.task,
              startTime: taskObj.startTime,
              endTime: taskObj.endTime,
              status: taskObj.sta,
              proof: taskObj.proof
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
      const res = await fetch(`${CONFIG.BASE_URL}/deleteTask`, {
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
    console.warn("Task not found:", id);
    return;
  }

  const proof = prompt("Please provide proof of completion (e.g., github link):");
  if (!proof) return;

  taskObj.proof = proof;

  // ✅ NEW LOGIC
  if (taskObj.overdue) {
    taskObj.sta = "completedLate";   // ✅ MARK LATE
  } else {
    taskObj.sta = "complete";        // ✅ NORMAL COMPLETE
  }

  // ✅ ALWAYS UPDATE BACKEND (even if overdue)
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/updateTask`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empID: taskObj.empID,
        id: taskObj.id,
        task: taskObj.task,
        startTime: taskObj.startTime,
        endTime: taskObj.endTime,
        status: taskObj.sta,
        proof: taskObj.proof,
        submittedAt: new Date().toISOString()
      })
    });

    const result = await res.json();
    console.log("Task updated:", result.message || result);

  } catch (err) {
    console.error("Error updating task:", err);
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
    // block only if submitted
if (item.sta === "complete" || item.sta === "completedLate") return;

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
startInput.type = "datetime-local";

// convert stored ISO => datetime-local format
try {
  startInput.value = new Date(item.startTime).toISOString().slice(0,16);
} catch {
  startInput.value = "";
}


const endInput = document.createElement('input');
endInput.className = 'edit-end';
endInput.type = "datetime-local";

try {
  endInput.value = new Date(item.endTime).toISOString().slice(0,16);
} catch {
  endInput.value = "";
}


    taskTextDiv.replaceChildren(textInput, startInput, endInput);


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
      if (newStart) item.startTime = newStart;
if (newEnd) {
  item.endTime = newEnd;

  // recompute overdue reference values safely
  const d = new Date(newEnd);
  if (!isNaN(d)) {
    item.hours = d.getHours();
    item.mins = d.getMinutes();
  }
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
        const res = await fetch(`${CONFIG.BASE_URL}/updateTask`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empID: item.empID,
            id: item.id,
            task: item.task,
            startTime: item.startTime,
            endTime: item.endTime,
            status: item.sta,
            submittedAt: item.submittedAt
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
      const res = await fetch(`${CONFIG.BASE_URL}/evaluate-reason`, {
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
  this.recordContent.innerHTML = "Loading employees...";

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/getempID`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) throw new Error(`Request failed with ${res.status}`);

    const data = await res.json();
    const empIDCollection = data.employees || [];

    let html = this.renderEmployeeSection(empIDCollection);

    this.recordContent.innerHTML = html || "<em>No employees found</em>";
  } catch (err) {
    console.error("Error fetching empID:", err);
    this.recordContent.innerHTML = `<em>Error loading employees: ${err.message}</em>`;
  }
}


  // ------------------- INVITATION / INBOX HELPERS -------------------
  async managerInboxRefresh() {
    try {
      const res = await fetch('/api/invitations?sent=true', { credentials: 'include' });
      if (!res.ok) {
        console.error('Failed to load sent invitations', res.status);
        return;
      }
      const data = await res.json();
      console.log('Sent invitations:', data.invitations);
      // Optionally render to a manager inbox UI when available
    } catch (err) {
      console.error('Error fetching manager inbox:', err);
    }
  }

  // Simple receiver inbox flow using prompts (lightweight fallback UI)
  async checkAndHandleReceivedInvitations() {
    try {
      const res = await fetch('/api/invitations?received=true', { credentials: 'include' });
      if (!res.ok) {
        console.error('Failed to load received invitations', res.status);
        return;
      }
      const data = await res.json();
      const invites = data.invitations || [];
      for (const inv of invites) {
        if (inv.status !== 'pending') continue;
        const from = inv.senderEmpID || 'a manager';
        const msg = inv.message ? `Message: ${inv.message}\n\n` : '';
        const accept = confirm(`Invitation from ${from} to join as employee.\n${msg}Accept invitation?`);
        if (accept) {
          const r = await fetch(`/api/invitations/${inv._id}/respond`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept' })
          });
          if (r.ok) {
            alert('Invitation accepted');
            // reload tasks / employee info
            await this.loadempID();
            await this.loadTasksFromDatabase();
            this.renderTasks();
          } else {
            const err = await r.json();
            alert('Could not accept invitation: ' + (err.error || err.message || r.status));
          }
        } else {
          const rj = await fetch(`/api/invitations/${inv._id}/respond`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject' })
          });
          if (rj.ok) alert('Invitation rejected');
          else {
            const err = await rj.json();
            alert('Could not reject invitation: ' + (err.error || err.message || rj.status));
          }
        }
      }
    } catch (err) {
      console.error('Error checking received invitations', err);
    }
  }

  // ---------------- INBOX UI (modal) ----------------
  openInboxModal() {
    const overlay = document.getElementById('inboxModalOverlay');
    if (!overlay) return;
    console.log('openInboxModal called');
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // render content
    this.renderInbox();
    // bind close
    const closeBtn = document.getElementById('closeInboxModalBtn');
    if (closeBtn) closeBtn.onclick = () => this.closeInboxModal();
    const refreshBtn = document.getElementById('inboxRefreshBtn');
    if (refreshBtn) refreshBtn.onclick = () => this.renderInbox();
    // delegate accept/reject clicks
    const receivedList = document.getElementById('inboxReceivedList');
    if (receivedList) {
      receivedList.onclick = async (e) => {
        const btn = e.target.closest && e.target.closest('[data-inv-action]');
        if (!btn) return;
        const invId = btn.dataset.invId;
        const action = btn.dataset.invAction;
        if (!invId || !action) return;
        try {
          btn.disabled = true;
          const res = await fetch(`/api/invitations/${invId}/respond`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
          });
          if (res.ok) {
            const data = await res.json();
            // refresh lists
            await this.renderInbox();
           if (action === 'accept') {
  await this.loadempID();
  await this.loadTasksFromDatabase();
}

await this.renderInboxToCobox();   // refresh once, at the end

          } else {
            const err = await res.json().catch(()=>({ error: res.status }));
            alert('Action failed: ' + (err.error || err.message || res.status));
            btn.disabled = false;
          }
        } catch (err) {
          console.error('Respond error', err);
          alert('Network error');
          btn.disabled = false;
        }
      };
    }
  }

  closeInboxModal() {
    const overlay = document.getElementById('inboxModalOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  async renderInbox() {
    // fetch received and sent invitations and render
    const receivedContainer = document.getElementById('inboxReceivedList');
    const sentContainer = document.getElementById('inboxSentList');
    if (receivedContainer) receivedContainer.innerHTML = 'Loading...';
    if (sentContainer) sentContainer.innerHTML = 'Loading...';
    console.log('renderInbox: fetching invitations');
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/invitations?received=true', { credentials: 'include' }),
        fetch('/api/invitations?sent=true', { credentials: 'include' })
      ]);

      // handle unauthenticated quickly
      if (r1.status === 401 || r2.status === 401) {
        if (receivedContainer) receivedContainer.innerHTML = '<div style="padding:12px;color:#c00">Not signed in. Please <a href="/login.html">sign in</a> to view your inbox.</div>';
        if (sentContainer) sentContainer.innerHTML = '<div style="padding:12px;color:#c00">Not signed in. Please <a href="/login.html">sign in</a> to view sent invitations.</div>';
        return;
      }

      if (!r1.ok) throw new Error('Failed loading received');
      if (!r2.ok) throw new Error('Failed loading sent');

      const text1 = await r1.text().catch(()=>null);
      const text2 = await r2.text().catch(()=>null);
      console.log('invitations received raw:', r1.status, text1);
      console.log('invitations sent raw:', r2.status, text2);
      let d1 = {};
      let d2 = {};
      try { d1 = text1 ? JSON.parse(text1) : {}; } catch(e) { console.error('parse d1', e); }
      try { d2 = text2 ? JSON.parse(text2) : {}; } catch(e) { console.error('parse d2', e); }
      const invites = d1.invitations || [];
      const sent = d2.invitations || [];

      // render received
      if (receivedContainer) {
        if (invites.length === 0) {
          receivedContainer.innerHTML = '<div style="padding:12px;color:#666">No invitations</div>';
        } else {
          receivedContainer.innerHTML = invites.map(inv => {
            const created = new Date(inv.createdAt).toLocaleString();
            const status = inv.status || 'pending';
            const from = inv.senderEmpID || 'manager';
            const msg = inv.message ? `<div style="margin-top:6px;color:#333">${escapeHtml(inv.message)}</div>` : '';
            const actions = status === 'pending' ? `\n<div style="margin-top:8px"><button data-inv-id="${inv._id}" data-inv-action="accept">Accept</button> <button data-inv-id="${inv._id}" data-inv-action="reject">Reject</button></div>` : `<div style="margin-top:8px;color:#777">${status.toUpperCase()}${inv.respondedAt? ' • ' + new Date(inv.respondedAt).toLocaleString(): ''}</div>`;
            return `<div style="border-bottom:1px solid #eee; padding:8px"> <div><strong>${escapeHtml(from)}</strong> <span style="color:#888">• ${created}</span></div> ${msg} ${actions} </div>`;
          }).join('');
        }
      }

      // render sent
      if (sentContainer) {
        if (sent.length === 0) {
          sentContainer.innerHTML = '<div style="padding:12px;color:#666">No sent invitations</div>';
        } else {
          sentContainer.innerHTML = sent.map(inv => {
            const created = new Date(inv.createdAt).toLocaleString();
            const status = inv.status || 'pending';
            const to = inv.receiverEmail || inv.receiverEmpID || 'recipient';
            const note = inv.message ? `<div style="margin-top:6px;color:#333">${escapeHtml(inv.message)}</div>` : '';
            return `<div style="border-bottom:1px solid #eee; padding:8px"> <div><strong>To: ${escapeHtml(to)}</strong> <span style="color:#888">• ${created}</span></div>${note}<div style="margin-top:8px;color:#777">${status.toUpperCase()}${inv.respondedAt? ' • ' + new Date(inv.respondedAt).toLocaleString(): ''}</div></div>`;
          }).join('');
        }
      }

    } catch (err) {
      console.error('Inbox render error', err);
      if (receivedContainer) receivedContainer.innerHTML = '<div style="padding:12px;color:#c00">Error loading inbox</div>';
      if (sentContainer) sentContainer.innerHTML = '<div style="padding:12px;color:#c00">Error loading sent</div>';
    }
  }

  // Render invitations directly into the main `.cobox` area (used when Inbox sidebar clicked)
  // Render invitations directly into the main `.cobox` area (used when Inbox sidebar clicked)
  async renderInboxToCobox() {
    if (!this.cobox) return console.warn('cobox element not found');
    this.cobox.innerHTML = '<div style="padding:12px;color:#666">Loading inbox...</div>';
    
    try {
      const actualEmpID = localStorage.getItem("actualEmpID");
      
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/invitations?received=true', { credentials: 'include' }),
        fetch('/api/invitations?sent=true', { credentials: 'include' }),
        fetch(`${CONFIG.BASE_URL}/draft?receiverID=${actualEmpID}`),
        fetch(`${CONFIG.BASE_URL}/draft/sent?senderID=${actualEmpID}`)
      ]);

      if (r1.status === 401 || r2.status === 401) {
        this.cobox.innerHTML = '<div style="padding:12px;color:#c00">Not signed in. Please <a href="/login.html">sign in</a> to view your inbox.</div>';
        return;
      }

      const d1 = await r1.json().catch(() => ({}));
      const d2 = await r2.json().catch(() => ({}));
      const d3 = await r3.json().catch(() => ({}));
      const d4 = await r4.json().catch(() => ({}));
      
      const invites = d1.invitations || [];
      const sent = d2.invitations || [];
      const sentDrafts = d3.drafts || [];
const receivedDrafts = d4.drafts || [];


      // build HTML
      let html = '<div style="padding:12px">';
      
      // RECEIVED INVITATIONS
      html += '<h3 style="margin:6px 0">Received Invitations</h3>';
      if (invites.length === 0) html += '<div style="color:#666">No invitations received</div>';
      else {
        invites.forEach(inv => {
          const created = inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '';
          const status = inv.status || 'pending';
          const from = inv.senderEmpID || 'manager';
          html += `<div style="border:1px solid #eee;padding:8px;margin:8px 0;border-radius:6px;background:#fff;color:#000">`;
          html += `<div><strong>From:</strong> ${escapeHtml(from)} <span style="color:#888">• ${created}</span></div>`;
          if (inv.message) html += `<div style="margin-top:6px">${escapeHtml(inv.message)}</div>`;
          if (status === 'pending') {
            html += `<div style="margin-top:8px"><button data-inv-id="${inv._id}" data-inv-action="accept">Accept</button> <button data-inv-id="${inv._id}" data-inv-action="reject">Reject</button></div>`;
          } else {
            html += `<div style="margin-top:8px;color:#666">${status.toUpperCase()}${inv.respondedAt? ' • ' + new Date(inv.respondedAt).toLocaleString(): ''}</div>`;
          }
          html += '</div>';
        });
      }

      // RECEIVED MESSAGES
      html += '<h3 style="margin:18px 0 6px 0">Received Messages</h3>';
      if (receivedDrafts.length === 0) html += '<div style="color:#666">No messages received</div>';
      else {
        receivedDrafts.forEach(draft => {
          const timestamp = draft.timestamp ? new Date(draft.timestamp).toLocaleString() : '';
          const from = draft.senderName || draft.senderID || 'Unknown';
          html += `<div style="border:1px solid #ddd;padding:8px;margin:8px 0;border-radius:6px;background:#f9f9f9;color:#000">`;
          html += `<div><strong>From:</strong> ${escapeHtml(from)} <span style="color:#888">• ${timestamp}</span></div>`;
          html += `<div style="margin-top:6px;color:#333">${escapeHtml(draft.message)}</div>`;
          html += '</div>';
        });
      }

      // SENT INVITATIONS
      html += '<h3 style="margin:18px 0 6px 0">Sent Invitations</h3>';
      if (sent.length === 0) html += '<div style="color:#666">No sent invitations</div>';
      else {
        sent.forEach(inv => {
          const created = inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '';
          const status = inv.status || 'pending';
          const to = inv.receiverEmail || inv.receiverEmpID || 'recipient';
          html += `<div style="border:1px solid #eee;padding:8px;margin:8px 0;border-radius:6px;background:#fff;color:#000">`;
          html += `<div><strong>To:</strong> ${escapeHtml(to)} <span style="color:#888">• ${created}</span></div>`;
          if (inv.message) html += `<div style="margin-top:6px">${escapeHtml(inv.message)}</div>`;
          html += `<div style="margin-top:8px;color:#666">${status.toUpperCase()}${inv.respondedAt? ' • ' + new Date(inv.respondedAt).toLocaleString(): ''}</div>`;
          html += '</div>';
        });
      }

      // SENT MESSAGES
      html += '<h3 style="margin:18px 0 6px 0">Sent Messages</h3>';
      if (sentDrafts.length === 0) html += '<div style="color:#666">No messages sent</div>';
      else {
        sentDrafts.forEach(draft => {
          const timestamp = draft.timestamp ? new Date(draft.timestamp).toLocaleString() : '';
          const to = draft.receiverID || 'Unknown';
          html += `<div style="border:1px solid #ddd;padding:8px;margin:8px 0;border-radius:6px;background:#f9f9f9;color:#000">`;
          html += `<div><strong>To:</strong> ${escapeHtml(to)} <span style="color:#888">• ${timestamp}</span></div>`;
          html += `<div style="margin-top:6px;color:#333">${escapeHtml(draft.message)}</div>`;
          html += '</div>';
        });
      }

      html += '</div>';
      this.cobox.innerHTML = html;

      // delegate buttons inside cobox for accept/reject
      this.cobox.onclick = async (e) => {
  const btn = e.target.closest?.('[data-inv-action]');
  if (!btn) return;

  const invId = btn.dataset.invId;
  const action = btn.dataset.invAction;

  try {
    btn.disabled = true;

    const res = await fetch(`/api/invitations/${invId}/respond`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      alert('Action failed: ' + (err.error || err.message || res.status));
      btn.disabled = false;
      return;
    }

    if (action === 'accept') {
      await this.loadempID();   // update manager/employee link
    }

    // ✅ stay in inbox
    this.currentSection = "inbox";
    await this.renderInboxToCobox();   // render ONCE only

  } catch (err) {
    console.error('Respond error', err);
    alert('Network error');
    btn.disabled = false;
  }
};


    } catch (err) {
      console.error('renderInboxToCobox error', err);
      this.cobox.innerHTML = '<div style="padding:12px;color:#c00">Error loading inbox</div>';
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
    const managerID = localStorage.getItem("actualEmpID");

empIDCollection
  .filter(e => e.managerID === managerID)
  .forEach(employee => {

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
        this.startInput = document.getElementById('assignStartInput');
this.endInput = document.getElementById('assignEndInput');

        this.okBtn = document.getElementById('assignOkBtn');
        this.taskValidation = document.getElementById('assignTaskValidation');
        
        
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
        if (this.startInput) this.startInput.addEventListener('input', () => this.validateForm());
if (this.endInput) this.endInput.addEventListener('input', () => this.validateForm());

        
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
  const startValue = this.startInput ? this.startInput.value.trim() : '';
  const endValue = this.endInput ? this.endInput.value.trim() : '';

  this.okBtn.disabled = !(taskValue && startValue && endValue);
}

    
    showValidationErrors() {
  const taskValue = this.taskInput ? this.taskInput.value.trim() : '';
  const startValue = this.startInput ? this.startInput.value.trim() : '';
  const endValue = this.endInput ? this.endInput.value.trim() : '';

  if (!taskValue && this.taskValidation) this.taskValidation.classList.add('show');
  if ((!startValue || !endValue) && this.timeValidation) this.timeValidation.classList.add('show');
}

    
    async handleSubmit(event) {
        event.preventDefault();
        
        const taskValue = this.taskInput ? this.taskInput.value.trim() : '';
        const startValue = this.startInput ? this.startInput.value.trim() : '';
const endValue = this.endInput ? this.endInput.value.trim() : '';

        
        // Validate inputs
        if (!taskValue || !startValue || !endValue) {
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
            await this.createTaskViaManager(taskValue, `${startValue} - ${endValue}`);

            
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
  if (!taskDescription || !timeRange) {
    throw new Error("Task description and time range are required");
  }

  try {
    console.log("RAW timeRange from modal:", timeRange);

    // ✅ CRITICAL FIX: split ONLY on " - " (space dash space)
    if (!timeRange.includes(" - ")) {
      throw new Error("Invalid format. Use: YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM");
    }

    let [startRaw, endRaw] = timeRange.split(" - ").map(s => s.trim());

    console.log("Parsed startRaw:", startRaw);
    console.log("Parsed endRaw:", endRaw);

    const startDate = new Date(startRaw);
    const endDate = new Date(endRaw);

    console.log("Parsed Dates:", startDate, endDate);

    if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
      throw new Error("Invalid datetime values after parsing");
    }

    // ✅ Always store ISO datetime for backend safety
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    // ✅ For overdue UI only
    const hours = endDate.getHours();
    const mins = endDate.getMinutes();

    const id = nanoid();

    const obj = {
      empID: this.taskManager.currentEmpID,
      id,
      startTime,
      endTime,
      hours,
      mins,
      task: taskDescription,
      sta: "pending",
      overdue: false,
      proof: ""
    };

    this.taskManager.info.push(obj);
    this.taskManager.save();
    this.taskManager.renderTasks();

    const res = await fetch(`${CONFIG.BASE_URL}/addTask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empID: obj.empID,
        id: obj.id,
        task: obj.task,
        startTime: obj.startTime,
        endTime: obj.endTime,
        status: obj.sta,
        proof: obj.proof
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return true;

  } catch (error) {
    console.error("Error in createTaskViaManager:", error);
    throw error;
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
            const res = await fetch(`${CONFIG.BASE_URL}/switchEmp`);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            const managerID = localStorage.getItem("actualEmpID");

// only employees belonging to this manager
this.employees = (data.employees || []).filter(e => e.managerID === managerID);

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

// ================= PROFILE DROPDOWN LOGIC =================
(function () {
  const profileIcon = document.querySelector(".profile-icon");
  const dropdown = document.getElementById("profileDropdown");

  if (!profileIcon) {
    console.warn("profile-icon NOT FOUND");
    return;
  }

  if (!dropdown) {
    console.warn("profileDropdown NOT FOUND");
    return;
  }

  function loadProfileData() {
    document.getElementById("profileName").textContent =
      localStorage.getItem("actualEmpName") || "Unknown";

    document.getElementById("profileID").textContent =
      "ID: " + (localStorage.getItem("actualEmpID") || "N/A");

    document.getElementById("profileEmail").textContent =
      "Email: " + (localStorage.getItem("actualEmpEmail") || "Not Set");

    document.getElementById("profileInitial").textContent =
      (localStorage.getItem("actualEmpName") || "?").charAt(0).toUpperCase();
  }

  profileIcon.addEventListener("click", () => {
    loadProfileData();
    dropdown.classList.toggle("show");
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".profile-wrapper")) {
      dropdown.classList.remove("show");
    }
  });
  loadProfileData();
})();




const assignModal = new AssignTaskModal(app1);
const switchEmpModal = new SwitchEmpModal(app1);
//switching sections
window.addEventListener("load", () => {
    const section = localStorage.getItem("currentSection") || "manager";
    showSection(section);

    if (section === "inbox") {
        app1.renderInboxToCobox();
    }else if(section==="progress"){
app1.progressDisplayReload();
    } else {
        app1.renderTasks();
    }
});


function showSection(section) {
  localStorage.setItem("currentSection", section);
  app1.currentSection = section;


  updateSidebarForSection(section);

  if (section === "inbox") {
    app1.renderInboxToCobox();
  } else if (section === "progress") {
    app1.progressDisplayReload();
  } else {
    app1.renderTasks(); 
  }
}

function updateSidebarForSection(section) {
  const showManagerUI = section === "manager";

  app1.createEmpBtn.style.display = showManagerUI ? "block" : "none";
  app1.switchEmpBtn.style.display = showManagerUI ? "block" : "none";
  app1.openpopup.style.display = showManagerUI ? "block" : "none";
  app1.assignTaskBtn.style.display = showManagerUI ? "block" : "none";
  app1.empDisplay.style.display = showManagerUI ? "block" : "none";

  app1.draftBtn.style.display = section === "inbox" ? "block" : "none";
}



// ensure inbox button is bound after DOM and app1 initialization
window.addEventListener('load', () => {
  const inboxBtn = document.querySelector('.inbox');
  if (!inboxBtn) return;
  inboxBtn.removeEventListener && inboxBtn.removeEventListener('click', () => {});
  inboxBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  showSection("inbox");
  app1.renderInboxToCobox();
});

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

class draftPopup {
  constructor(taskManager) {
    this.taskManager = taskManager;

    this.overlay = document.getElementById("draftModalOverlay");
    this.closeBtn = document.getElementById("closeDraftModalBtn");
    this.cancelBtn = document.getElementById("draftCancelBtn");
    this.sendBtn = document.getElementById("draftSendBtn");

    this.empInput = document.getElementById("draftEmpID");
    this.msgInput = document.getElementById("draftMessage");

    this.bindEvents();
  }

  bindEvents() {
    this.closeBtn.addEventListener("click", () => this.close());
    this.cancelBtn.addEventListener("click", () => this.close());
    this.sendBtn.addEventListener("click", () => this.send());
  }

  openDraftPopup() {
    this.empInput.value = "";
    this.msgInput.value = "";

    this.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  close() {
    this.overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  async send() {
    const targetID = this.empInput.value.trim();
    const message = this.msgInput.value.trim();
    const senderID = localStorage.getItem("actualEmpID");
    const senderName = localStorage.getItem("actualEmpName");

    if (!targetID) return alert("Enter an employee ID.");
    if (!message) return alert("Message cannot be empty.");

    const payload = {
      senderID,
      senderName,
      receiverID: targetID,
      message,
      timestamp: Date.now()
    };

    try {
      // backend send API
      await fetch(`${CONFIG.BASE_URL}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // append message to "Sent" inbox UI immediately
      this.taskManager.renderInboxToCobox();

      alert("Message sent!");

      this.close();
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message.");
    }
  }
}
const draft = new draftPopup(app1);
