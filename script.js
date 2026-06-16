// Firebase SDK 모듈 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 프로젝트 설정 (본인 설정 유지)
const firebaseConfig = {
  apiKey: "AIzaSyBwMSX60e_IY3O9wIJf8GWlZnfE6bABldQ",
  authDomain: "jjonijjoni-4fc75.firebaseapp.com",
  databaseURL: "https://jjonijjoni-4fc75-default-rtdb.firebaseio.com",
  projectId: "jjonijjoni-4fc75",
  storageBucket: "jjonijjoni-4fc75.firebasestorage.app",
  messagingSenderId: "66509055047",
  appId: "1:66509055047:web:62fcc8b1ee0487e707fd62",
  measurementId: "G-WPGJ18M2M0"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소 가져오기
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btnLogout'); // HTML ID와 매칭 수정
const userInfo = document.getElementById('user-info');
const consultInput = document.getElementById('consult-input');
const btnSaveConsult = document.getElementById('btn-save-consult');
const consultHistory = document.getElementById('consult-history');

// API Key 관련 DOM 요소
const openaiKeyInput = document.getElementById('openai-key-input');
const btnSaveKey = document.getElementById('btn-save-key');

let currentUser = null;
let unsubscribeHistory = null; 
let openAiApiKey = ""; // 사용자가 입력한 API 키 저장 변수

// [추가] 브라우저 로컬 스토리지에서 기존에 저장된 API Key가 있다면 불러오기
if (localStorage.getItem('openai_api_key')) {
    openAiApiKey = localStorage.getItem('openai_api_key');
    openaiKeyInput.value = openAiApiKey;
}

// API Key 저장 버튼 이벤트
btnSaveKey.addEventListener('click', () => {
    const key = openaiKeyInput.value.trim();
    if (!key) return alert('API Key를 입력해주세요.');
    openAiApiKey = key;
    localStorage.setItem('openai_api_key', key); // 브라우저에 보안 저장
    alert('API Key가 안전하게 저장되었습니다.');
});

// [1] 회원가입 기능
btnSignup.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if(!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('회원가입이 완료되었습니다!');
    } catch (error) {
        alert('회원가입 실패: ' + error.message);
    }
});

// [2] 로그인 기능
btnLogin.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if(!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('로그인 실패: ' + error.message);
    }
});

// [3] 로그아웃 기능
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert('로그아웃 되었습니다.');
    } catch (error) {
        alert('로그아웃 실패: ' + error.message);
    }
});

// [4] 인증 상태 감지
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
        userInfo.textContent = `🩺 ${user.email} 님`;
        authEmail.value = '';
        authPassword.value = '';
        
        loadConsultHistory(user.uid);
    } else {
        currentUser = null;
        authSection.classList.remove('hidden');
        mainSection.classList.add('hidden');
        consultHistory.innerHTML = `<p class="empty-msg">저장된 상담 기록이 없습니다.</p>`;
        
        if (unsubscribeHistory) unsubscribeHistory();
    }
});

// [진짜 OpenAI API 호출 함수]
async function fetchGptResponse(symptoms) {
    if (!openAiApiKey) {
        throw new Error("OpenAI API Key가 설정되지 않았습니다. 상단에서 키를 먼저 입력하고 저장해주세요.");
    }

    // OpenAI Chat Completions API 호출
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // 가성비가 좋고 빠른 모델 사용
            messages: [
                { 
                    role: "system", 
                    content: "당신은 친절하고 전문적인 '친절한 간호사'입니다. 사용자가 증상을 말하면 전문적이면서도 따뜻한 어조로 일차적인 대처 방법(휴식, 수분 섭취, 시판약 권고 등)을 안내하고, 증상이 심할 경우 병원 방문을 권유하는 답변을 3줄 내외로 간결하게 작성하세요. 진단명 확정은 피해 주세요." 
                },
                { role: "user", content: symptoms }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API 호출 중 오류가 발생했습니다.");
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();
}

// [5] 간호사 상담 및 내용 저장 기능 (진짜 AI 연동 버전)
btnSaveConsult.addEventListener('click', async () => {
    const userContent = consultInput.value.trim();
    if(!userContent) return alert('증상을 입력해주세요.');
    if(!currentUser) return alert('로그인이 필요합니다.');
    if(!openAiApiKey) return alert('상단의 OpenAI API Key를 먼저 입력하고 저장해주세요.');

    // 로딩 표시
    btnSaveConsult.disabled = true;
    btnSaveConsult.textContent = "AI 간호사가 답변을 생각하는 중...";

    try {
        // 1. 진짜 OpenAI API를 통해 답변 생성
        const nurseAnswer = await fetchGptResponse(userContent);
        
        // 사용자에게 답변 알림
        alert(`🩺 AI 간호사 답변:\n\n${nurseAnswer}`);

        // 2. 사용자의 증상과 간호사의 답변을 함께 Firestore에 저장
        await addDoc(collection(db, "consultations"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userSymptoms: userContent,   
            nurseResponse: nurseAnswer,  
            createdAt: new Date()
        });
        
        alert('상담 내역이 안전하게 저장되었습니다.');
        consultInput.value = ''; 
    } catch (error) {
        alert('오류 발생: ' + error.message);
    } finally {
        // 버튼 상태 원복
        btnSaveConsult.disabled = false;
        btnSaveConsult.textContent = "AI 간호사에 물어보기 & 저장";
    }
});

// [6] 특정 유저의 상담 기록 실시간 조회 (Firestore)
function loadConsultHistory(uid) {
    const q = query(
        collection(db, "consultations"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
    );

    unsubscribeHistory = onSnapshot(q, (querySnapshot) => {
        consultHistory.innerHTML = '';
        
        if(querySnapshot.empty) {
            consultHistory.innerHTML = `<p class="empty-msg">저장된 상담 기록이 없습니다.</p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleString('ko-KR') : '시간 정보 없음';

            const item = document.createElement('div');
            item.className = 'history-item';
            
            // 기존 코드의 data.content 오류를 수정하여 증상과 답변이 모두 출력되도록 변경
            item.innerHTML = `
                <div class="history-date">📅 ${date}</div>
                <div class="history-symptom"><strong>내 증상:</strong> ${escapeHtml(data.userSymptoms || '')}</div>
                <div class="history-response"><strong>간호사 답변:</strong> ${escapeHtml(data.nurseResponse || '')}</div>
            `;
            consultHistory.appendChild(item);
        });
    }, (error) => {
        console.error("기록 불러오기 오류:", error);
    });
}

// XSS 방지 함수
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
