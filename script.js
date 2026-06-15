// Firebase SDK 모듈 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: 본인의 Firebase 프로젝트 설정 값으로 대체하세요!
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

// [5] 간호사 상담 및 내용 저장 기능 (수정 버전)
btnSaveConsult.addEventListener('click', async () => {
    const userContent = consultInput.value.trim();
    if(!userContent) return alert('증상을 입력해주세요.');
    if(!currentUser) return alert('로그인이 필요합니다.');

    // 1. 간호사의 가상 답변 생성 로직 (예시 키워드 판단)
    let nurseAnswer = "증상을 확인했습니다. 휴식을 취하시고 증상이 지속되면 병원을 방문하세요."; // 기본 답변
    
    if (userContent.includes("두통") || userContent.includes("머리")) {
        nurseAnswer = "🩺 간호사 한마디: 두통이 있으시군요. 타이레놀 등 진통제를 복용하시고 안정을 취해보세요.";
    } else if (userContent.includes("배") || userContent.includes("복통")) {
        nurseAnswer = "🩺 간호사 한마디: 복통이 있으실 때는 배를 따뜻하게 하시고 자극적인 음식을 피하세요.";
    } else if (userContent.includes("열")) {
        nurseAnswer = "🩺 간호사 한마디: 열이 날 때는 수분을 충분히 섭취하시고 해열제를 드신 후 체온을 체크해보세요.";
    }

    // 사용자에게 먼저 답변을 알림창이나 화면에 보여줌
    alert(nurseAnswer);

    try {
        // 2. 사용자의 증상과 간호사의 답변을 함께 데이터베이스에 저장
        await addDoc(collection(db, "consultations"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userSymptoms: userContent,         // 사용자가 쓴 증상
            nurseResponse: nurseAnswer,       // 간호사가 한 답변
            createdAt: new Date()
        });
        
        alert('상담 내역이 저장되었습니다.');
        consultInput.value = ''; 
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
