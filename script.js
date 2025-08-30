// random ID generator
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

// ------------------- RENDER FUNCTION -------------------
function renderTasks() {
  cobox.innerHTML = ""; // clear

  info.forEach((item) => {
    // add HTML
    cobox.innerHTML += `
      <p class="container3" data-class="${item.id}">
        ${item.task} : ${item.startTime} to ${item.endTime}
        <button class="delete-button" data-class="${item.id}">D</button>
        <button class="completed-button" data-class="${item.id}">C</button>
        <button class="checkbox" data-class="${item.id}"></button>
      </p>`;

    // check overdue

    if (item.hours < dayjs().hour() && item.sta) {
      item.overdue = true;
    } else if (item.hours === dayjs().hour() && item.mins < dayjs().minute()) {
      item.overdue = true;
    }

    const container = document.querySelector(`.container3[data-class="${item.id}"]`);
    if (container) {
      const checkbox = container.querySelector('.checkbox');

      if (item.sta === "complete") {
        checkbox.style.backgroundColor = "#b6ffb3"; // green
      } else if (item.overdue === true && item.sta !== "complete") {
        checkbox.style.backgroundColor = "red";
        item.sta = "incomplete"; // mark overdue
      }
    }
  });

  // save updated info
  localStorage.setItem("info", JSON.stringify(info));
}

// ------------------- PAGE LOAD -------------------
window.onload = renderTasks;

// ------------------- ADD NEW TASK -------------------
addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (task.value !== "" && time.value !== "") {
      let [startTime, endTime] = time.value.split("-");
      let id = nanoid();
      let hours = parseInt(endTime.split(":")[0]);
      let mins = parseInt(endTime.split(":")[1]);
      let overdue = false;
      let newtask = {
        id,
        startTime,
        endTime,
        hours,
        mins,
        task: task.value,
        sta: "pending",
        overdue
      };

      info.push(newtask);
      localStorage.setItem("info", JSON.stringify(info));
      renderTasks();
    }
  }
});

// ------------------- DELETE TASK -------------------
cobox.addEventListener('dblclick', function(event) {
  if (event.target.classList.contains('delete-button')) {
    const id = event.target.dataset.class;

    info = info.filter(item => item.id !== id);
    localStorage.setItem("info", JSON.stringify(info));
    renderTasks();
  }
});

// ------------------- COMPLETE TASK -------------------
cobox.addEventListener('click', function(event) {
  if (event.target.classList.contains('completed-button')) {
    const id = event.target.dataset.class;
    
    info.forEach((item) => {

        if (!item.overdue) {
          if (item.id === id && item.sta === "pending") {
            item.sta = "complete";
          } else if (item.id === id && item.sta === "complete") {
            item.sta = "pending";
          }
        }
    });
    localStorage.setItem("info", JSON.stringify(info));
    renderTasks();
  }
});

// ------------------- END DAY BUTTON -------------------
const end = document.querySelector('.endDay');





//opening and closing popup window
let popup=document.querySelector(".popup");
let openpopup=document.querySelector(".endDay");
let overlay=document.querySelector(".overlay");
let taskStatus=document.querySelector(".taskStatus");
openpopup.addEventListener('click',()=>{
    popup.classList.add('active');
    overlay.style.zIndex=999;
    taskStatus.innerHTML="";
    let c=0;
    let t=0;
    info.forEach((item)=>{
        t++;
        taskStatus.innerHTML+=`<p>${item.task}: ${item.sta}</p>`;
        if (item.sta==="complete"){
            c++;
        }
    })
    taskStatus.innerHTML+=`<p class=notaskc>No of task completed: ${c}/${t}</p>`;
})
let closepopup=document.querySelector(".cancel");
function closepopupf(){
    popup.classList.remove('active');
    overlay.style.zIndex=-1;
}
closepopup.addEventListener("click",()=>{closepopupf()});

//end_day_confirm button         should add AI evaluation
const confirm=document.querySelector(".confirm");
confirm.addEventListener("click", () => {
    closepopupf()
  info = [];
  localStorage.setItem("info", JSON.stringify(info));
  renderTasks();
});