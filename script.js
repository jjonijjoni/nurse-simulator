let lastAnswer = "";

const userInput = document.getElementById("userInput");
const answer = document.getElementById("answer");
const historyBox = document.getElementById("history");

const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

sendBtn.addEventListener("click", async () => {

    const text = userInput.value.trim();

    if(text===""){

        alert("증상을 입력하세요.");

        return;

    }

    answer.innerHTML="AI가 답변을 생성하는 중...";

    try{

        if(window.askAI){

            const aiAnswer = await window.askAI(text);

            lastAnswer = aiAnswer;

            answer.innerHTML = aiAnswer;

            addHistory(text, aiAnswer);

            if(window.saveConsultation){

                window.saveConsultation(
                    text,
                    aiAnswer
                );

            }

        }

        else{

            const demo =
            "안녕하세요.\n\n"
            +"증상을 확인했습니다.\n\n"
            +"언제부터 증상이 있었나요?\n"
            +"열이나 기침은 있으신가요?\n"
            +"현재 가장 불편한 증상을 말씀해주세요.";

            lastAnswer = demo;

            answer.innerHTML = demo;

            addHistory(text,demo);

        }

    }

    catch(e){

        answer.innerHTML="오류가 발생했습니다.";

        console.log(e);

    }

});

voiceBtn.addEventListener("click",()=>{

    if(lastAnswer===""){

        alert("먼저 상담을 진행하세요.");

        return;

    }

    speechSynthesis.cancel();

    const speech =
    new SpeechSynthesisUtterance();

    speech.lang="ko-KR";

    speech.text=lastAnswer;

    speech.rate=1;

    speech.pitch=1;

    speechSynthesis.speak(speech);

});

function addHistory(user, ai){

    const time =
    new Date().toLocaleString();

    historyBox.innerHTML +=

    "----------------------\n"

    +"시간\n"

    +time

    +"\n\n"

    +"사용자\n"

    +user

    +"\n\n"

    +"AI\n"

    +ai

    +"\n\n";

}

window.clearHistory=function(){

    historyBox.innerHTML="";

}

window.showLoginUser=function(email){

    const status =
    document.getElementById(
    "loginStatus"
    );

    status.innerHTML=
    "로그인 : "+email;

}

window.showLogout=function(){

    const status =
    document.getElementById(
    "loginStatus"
    );

    status.innerHTML=
    "로그인 안됨";

}
