// Firebase SDK 모듈 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: 본인의 Firebase 프로젝트 설정 값으로 대체하세요!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
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
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');
const consultInput = document.getElementById('consult-input');
const btnSaveConsult = document.getElementById('btn-save-consult');
const consultHistory = document.getElementById('consult-history');

let currentUser = null;
let unsubscribeHistory = null; // 실시간 리스너 해제용

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

// [4] 인증 상태 감지 (로그인 상태인지 로그아웃 상태인지 실시간 체크)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인 성공 상태
        currentUser = user;
        authSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
        userInfo.textContent = `🩺 ${user.email} 님 로그인 중`;
        authEmail.value = '';
        authPassword.value = '';
        
        // 해당 유저의 상담 기록 불러오기 시작
        loadConsultHistory(user.uid);
    } else {
        // 로그아웃 상태
        currentUser = null;
        authSection.classList.remove('hidden');
        mainSection.classList.add('hidden');
        consultHistory.innerHTML = `<p class="empty-msg">저장된 상담 기록이 없습니다.</p>`;
        
        // 이전에 켜져있던 실시간 리스너 꺼주기
        if (unsubscribeHistory) unsubscribeHistory();
    }
});

// [5] 상담 내용 저장 기능 (Firestore)
btnSaveConsult.addEventListener('click', async () => {
    const content = consultInput.value.trim();
    if(!content) return alert('내용을 입력해주세요.');
    if(!currentUser) return alert('로그인이 필요합니다.');

    try {
        await addDoc(collection(db, "consultations"), {
            userId: currentUser.uid,          // 유저 고유 ID 식별자
            userEmail: currentUser.email,
            content: content,                 // 상담 내용
            createdAt: new Date()             // 생성 시간
        });
        alert('상담 내용이 안전하게 저장되었습니다.');
        consultInput.value = ''; // 입력창 초기화
    } catch (error) {
        alert('저장 실패: ' + error.message);
    }
});

// [6] 특정 유저의 상담 기록 실시간 조회 (Firestore)
function loadConsultHistory(uid) {
    const q = query(
        collection(db, "consultations"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc") // 최신순 정렬
    );

    // 실시간으로 데이터베이스 변화 감지 및 화면 갱신
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
            item.innerHTML = `
                <div class="history-date">📅 ${date}</div>
                <div class="history-text">${escapeHtml(data.content)}</div>
            `;
            consultHistory.appendChild(item);
        });
    }, (error) => {
        console.error("기록 불러오기 오류:", error);
    });
}

// XSS 방지를 위한 안전한 문자열 치환 함수
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
