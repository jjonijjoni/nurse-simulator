let lastAnswer = "";

const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

const userInput = document.getElementById("userInput");
const answer = document.getElementById("answer");
const history = document.getElementById("history");

sendBtn.addEventListener("click", async () => {

    const text = userInput.value.trim();

    if(text==""){

        alert("증상을 입력하세요.");

        return;

    }

    answer.innerHTML="AI가 생각하는 중...";

    if(window.askAI){

        const aiResult = await window.askAI(text);

        lastAnswer=aiResult;

        answer.innerHTML=aiResult;

        addHistory(text,aiResult);

    }

    else{

        const demoAnswer=
        "안녕하세요.\n\n"
        +"증상을 확인했습니다.\n\n"
        +"언제부터 증상이 시작되었나요?\n"
        +"통증의 정도는 어느 정도인가요?\n"
        +"열이나 기침 등의 다른 증상이 있으신가요?";

        lastAnswer=demoAnswer;

        answer.innerHTML=demoAnswer;

        addHistory(text,demoAnswer);

    }

});

voiceBtn.addEventListener("click",()=>{

    if(lastAnswer==""){

        alert("먼저 상담을 진행하세요.");

        return;

    }

    const msg=new SpeechSynthesisUtterance();

    msg.lang="ko-KR";

    msg.text=lastAnswer;

    speechSynthesis.speak(msg);

});

function addHistory(user,ai){

    const time=new Date().toLocaleString();

    history.innerHTML+=
    "<hr>"
    +"<b>시간</b><br>"
    +time
    +"<br><br>"
    +"<b>사용자</b><br>"
    +user
    +"<br><br>"
    +"<b>AI</b><br>"
    +ai
    +"<br>";

}

function clearHistory(){

    history.innerHTML="";

}

window.clearHistory=clearHistory;
