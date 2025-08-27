let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";export let nanoid=(e=21)=>{let t="",r=crypto.getRandomValues(new Uint8Array(e));for(let n=0;n<e;n++)t+=a[63&r[n]];return t};

let task=document.querySelector('.task');
let time=document.querySelector('.time');
let obj={};

let cobox =document.querySelector('.cobox');

addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let id=nanoid();
        if (task.value !=="" && time.value !== "") {
            let newtime=String(time.value);
            let n=newtime.split("-");
            let startTime = n[0];
            let endTime = n[1];
//barrier extracting endTime and comparing with actual time
            let currentTime=dayjs();
            let hours=parseInt(endTime.split(":")[0]);
            let mins=parseInt(endTime.split(":")[1]);
            console.log(hours,mins)
// barrier
            obj[task.value]=time.value;
            cobox.innerHTML += `<p class="container3" data-class="${id}">
                                    ${task.value} : ${time.value}
                                    <button class="delete-button" data-class="${id}">D</button>
                                    <button class="completed-button" data-class="${id}">C</button>
                                    <button class="checkbox" data-class="${id}"></button>
                                </p>`;

    }}
});

// ...existing code...

cobox.addEventListener('dblclick', function(event) {
    if (event.target.classList.contains('delete-button')) {
        const para = event.target.closest('.container3');
        if (para) {
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

