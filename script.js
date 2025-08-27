let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";export let nanoid=(e=21)=>{let t="",r=crypto.getRandomValues(new Uint8Array(e));for(let n=0;n<e;n++)t+=a[63&r[n]];return t};
let task=document.querySelector('.task');
let time=document.querySelector('.time');
let obj={};

let cobox =document.querySelector('.cobox');

addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if (task.value !=="" && time.value !== "") {
            obj[task.value]=time.value;
            console.log(obj);
            cobox.innerHTML += `<p class="container3">
                                    ${task.value} : ${time.value}
                                    <button class="delete-button">D</button>
                                    <button class="completed-button">C</button>
                                    <button class="checkbox"></button>
                                </p>`;
    }}
});

let del=document.querySelectorAll('.delete-button');
del.forEach(button => {
    button.addEventListener('dblclick', (event) => {
        event.target.parentElement.remove();
    });
});

const id=nanoid();
console.log(id);