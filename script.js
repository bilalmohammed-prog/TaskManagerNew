let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";export let nanoid=(e=21)=>{let t="",r=crypto.getRandomValues(new Uint8Array(e));for(let n=0;n<e;n++)t+=a[63&r[n]];return t};
let info=JSON.parse(localStorage.getItem("info")) || [];
let task=document.querySelector('.task');
let time=document.querySelector('.time');


let cobox =document.querySelector('.cobox');
//storing_data open
addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        
        if (task.value !=="" && time.value !== "") {
            let newtime=String(time.value);
            let n=newtime.split("-");
            let startTime = n[0];
            let endTime = n[1];
            let id=nanoid();
            let currentTime=dayjs();
            let hours=parseInt(endTime.split(":")[0]);
            let mins=parseInt(endTime.split(":")[1]);
            let newtask={
                id:id,
                endTime:endTime,
                startTime:startTime,
                hours:hours,
                mins:mins,
                task:task.value
            }
            console.log(hours,mins)
            info.push(newtask);
            localStorage.setItem("info",JSON.stringify(info));
            console.log(info);

            cobox.innerHTML += `<p class="container3" data-class="${newtask.id}">
                                    ${newtask.task} : ${newtask.startTime} to ${newtask.endTime}
                                    <button class="delete-button">D</button>
                                    <button class="completed-button">C</button>
                                    <button class="checkbox" data-class-"${newtask.id}"></button>
                                </p>`;

    }}
});
//storing_data closed

cobox.addEventListener('dblclick', function(event) {
    if (event.target.classList.contains('delete-button')) {
        const para = event.target.closest('.container3');
        if (para) {
            const checkbox=para.querySelector(".checkbox");
            const id=checkbox.dataset.class;
            info.forEach((event)=>{
                if(event.id===id){
                    info.splice(info.indexOf(event),1);
                    localStorage.setItem("info",JSON.stringify(info));
                }
            })

            para.remove();
        }
    }
});

cobox.addEventListener('dblclick', function(event) {
    if (event.target.classList.contains('completed-button')) {
        const container = event.target.closest('.container3');
        if (container) {
            const checkbox = container.querySelector('.checkbox');
            if (checkbox) {
                checkbox.style.backgroundColor = "#b6ffb3"; // Example: light green for completed
            }
        }
    }
});             

console.log(dayjs());


window.onload = info.forEach((item)=>{
    cobox.innerHTML += `<p class="container3" data-class="${item.id}">
                            ${item.task} : ${item.startTime} to ${item.endTime}
                            <button class="delete-button" data-class="${item.id}">D</button>
                            <button class="completed-button" data-class="${item.id}">C</button>
                            <button class="checkbox" data-class="${item.id}"></button>
                        </p>`;

    if (item.hours <= dayjs().hour()) {
        const container = document.querySelector(`.container3[data-class="${item.id}"]`);
    if (container) {
        const checkbox = container.querySelector('.checkbox');
        if (checkbox) {
            checkbox.style.backgroundColor = "red";
      }
    }
  }

})

console.log(dayjs().hour());


