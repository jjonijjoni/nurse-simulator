import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// [Firebase 프로젝트 설정] - 질문자님의 고유 키 값이 그대로 반영되어 있습니다.
const firebaseConfig = {
  apiKey: "AIzaSyBwMSX60e_IY3O9wIJf8GWlZnfE6bABldQ",
  authDomain: "jjonijjoni-4fc75.firebaseapp.com",
  databaseURL: "https://jjonijjoni-4fc75-default-rtdb.firebaseio.com",
  projectId: "jjonijjoni-4fc75",
  storageBucket: "jjonijjoni-4fc75.firebasestorage.app",
  messagingSenderId: "66509055047",
  appId: "1:66509055047:web:9b734e794e4556ca07fd62",
  measurementId: "G-DC3P80HT9H"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소 연결
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');
const consultInput = document.getElementById('consult-input');
const btnSaveConsult = document.getElementById('btn-save-consult');
const consultHistory = document.getElementById('consult-history');
const openaiKeyInput = document.getElementById('openai-key');
const btnSaveKey = document.getElementById('btn-save-key');

let currentUser = null;
let unsubscribeHistory = null;

// [1] 브라우저 내장 TTS 음성 재생 함수 (안전성 보완 버전)
function speakText(text) {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // 이미 재생 중인 음성이 있다면 즉시 중지
    } else {
        alert("이 브라우저는 음성 안내(TTS) 기능을 지원하지 않습니다.");
        return;
    }

    // 발음을 꼬이게 만드는 특수 기호 및 HTML 태그 등 제거
    const cleanText = text
        .replace(/---/g, "")
        .replace(/🩺|👤|📅|<strong>|<\/strong>|\*/g, "")
        .replace("AI 간호사 답변:", "")
        .replace("내 증상:", "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR'; 
    utterance.rate = 1.0; // 속도     
    utterance.pitch = 1.0; // 톤    

    // 비동기 실행으로 인한 브라우저 오디오 먹통 현상 방지
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 150);

    utterance.onerror = (event) => {
        console.error("TTS 재생 오류:", event.error);
    };
}

// [2] OpenAI API 키 로컬 저장 기능
btnSaveKey.addEventListener('click', () => {
    const key = openaiKeyInput.value.trim();
    if(!key) return alert('API 키를 입력해주세요.');
    localStorage.setItem('openai_api_key', key);
    alert('OpenAI API 키가 안전하게 브라우저에 저장되었습니다.');
});

// [3] 회원가입 기능
btnSignup.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    if(!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');
    if(password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('회원가입이 완료되었습니다!');
    } catch (error) { alert('회원가입 실패: ' + error.message); }
});

// [4] 로그인 기능
btnLogin.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    if(!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert('로그인 실패: ' + error.message); }
});

// [5] 로그아웃 기능
btnLogout.addEventListener('click', async () => {
    try { 
        window.speechSynthesis.cancel(); // 말하고 있던 음성 종료
        await signOut(auth); 
        alert('로그아웃 되었습니다.'); 
    } catch (error) { alert('로그아웃 실패: ' + error.message); }
});

// [6] 사용자 인증 상태 감지 (로그인/로그아웃 대응)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
        userInfo.textContent = `🩺 ${user.email} 님`;
        
        // 브라우저에 저장해둔 API 키 자동 복원
        const savedKey = localStorage.getItem('openai_api_key');
        if(savedKey) openaiKeyInput.value = savedKey;

        // 로그인 성공 시 실시간으로 파이어베이스 데이터 연결
        loadConsultHistory(user.uid);
    } else {
        currentUser = null;
        authSection.classList.remove('hidden');
        mainSection.classList.add('hidden');
        consultHistory.innerHTML = `<p class="empty-msg">저장된 상담 기록이 없습니다.</p>`;
        if (unsubscribeHistory) unsubscribeHistory();
    }
});

// [7] 진짜 OpenAI ChatGPT API 연동 함수
async function askChatGPT(apiKey, userMessage) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "당신은 친절하고 전문적인 가상 '종합병원 수석 간호사'입니다. 환자가 증상을 말하면 따뜻하게 공감해주고, 예상되는 의학적 조언과 대처법을 친절한 문체로 나누어 설명해 주세요. 마지막에는 '정확한 진단은 의사의 진료가 필요합니다'라는 문구를 덧붙여주세요." 
                },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7
        })
    });

    if(!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "GPT 응답을 받아오지 못했습니다.");
    }

    const result = await response.json();
    return result.choices[0].message.content;
}

// [8] 상담받기 버튼 클릭 시 작동하는 로직
btnSaveConsult.addEventListener('click', async () => {
    const userContent = consultInput.value.trim();
    const apiKey = localStorage.getItem('openai_api_key');

    if(!apiKey) return alert('상단에 OpenAI API 키를 먼저 입력하고 [Key 저장]을 눌러주세요.');
    if(!userContent) return alert('증상을 입력해주세요.');
    if(!currentUser) return alert('로그인이 필요합니다.');

    // 중복 클릭 방지 및 상태 표시
    btnSaveConsult.disabled = true;
    btnSaveConsult.textContent = "🔄 AI 간호사가 증상을 분석하고 있습니다...";

    try {
        // 1. 진짜 GPT API에 메시지 보내 답변 받기
        const nurseAnswer = await askChatGPT(apiKey, userContent);

        // 2. 파이어베이스 데이터베이스에 저장하기
        await addDoc(collection(db, "consultations"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userSymptoms: userContent,
            nurseResponse: nurseAnswer,
            createdAt: new Date()
        });
        
        consultInput.value = ''; // 입력창 초기화
        
        // 3. 답변이 완료되면 즉시 음성(TTS) 실행
        speakText(nurseAnswer);

    } catch (error) {
        alert('AI 상담 실패: ' + error.message);
    } finally {
        // 버튼 상태 복구
        btnSaveConsult.disabled = false;
        btnSaveConsult.textContent = "AI 간호사에게 상담받기";
    }
});

// [9] 파이어베이스에서 실시간으로 대화 기록 가져와 화면에 그리기
function loadConsultHistory(uid) {
    const q = query(collection(db, "consultations"), where("userId", "==", uid), orderBy("createdAt", "desc"));

    unsubscribeHistory = onSnapshot(q, (querySnapshot) => {
        consultHistory.innerHTML = '';
        if(querySnapshot.empty) {
            consultHistory.innerHTML = `<p class="empty-msg">저장된 상담 기록이 없습니다.</p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleString('ko-KR') : '시간 정보 없음';

            // 💡 옛날 데이터 형식과 새 데이터 형식이 섞여도 에러 나지 않도록 방어 처리
            const userSymptoms = data.userSymptoms || data.userContent || "입력된 증상이 없습니다.";
            const nurseResponse = data.nurseResponse || data.nurseAnswer || "AI 답변을 불러오지 못했습니다.";

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-date">📅 기록 일시: ${date}</div>
                <button class="btn-tts">🔊 다시 듣기</button>
                <div class="history-user">👤 <strong>내 증상:</strong> ${escapeHtml(userSymptoms)}</div>
                <div class="history-nurse">🩺 <strong>AI 간호사 답변:</strong>\n${escapeHtml(nurseResponse)}</div>
            `;

            // 과거 기록 카드 속 각각의 [다시 듣기] 버튼 기능 연결
            item.querySelector('.btn-tts').addEventListener('click', () => {
                speakText(nurseResponse);
            });

            consultHistory.appendChild(item);
        });
    }, (error) => { 
        console.error("데이터 수신 오류:", error); 
        consultHistory.innerHTML = `<p class="empty-msg" style="color: red;">데이터 권한 오류가 발생했습니다. 파이어베이스 규칙을 확인하세요.</p>`;
    });
}

// 보안용 특수문자 변환 함수
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
