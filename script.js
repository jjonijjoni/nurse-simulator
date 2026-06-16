<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 간호사 상담 서비스</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div id="auth-section" class="card">
            <h2>인증 및 로그인</h2>
            <div class="input-group">
                <input type="email" id="auth-email" placeholder="이메일 주소">
                <input type="password" id="auth-password" placeholder="비밀번호">
            </div>
            <div class="btn-group">
                <button id="btn-login" class="btn-primary">로그인</button>
                <button id="btn-signup" class="btn-secondary">회원가입</button>
            </div>
        </div>

        <div id="main-section" class="card hidden">
            <div class="header-status">
                <span id="user-info">🩺 로그인 중</span>
                <button id="btnLogout" class="btn-danger">로그아웃</button>
            </div>
            
            <hr>

            <div class="api-key-section">
                <h3>🔑 OpenAI API 설정</h3>
                <p class="notice">상담을 시작하려면 OpenAI API Key를 입력하세요.</p>
                <div class="input-inline">
                    <input type="password" id="openai-key-input" placeholder="sk-proj-...">
                    <button id="btn-save-key" class="btn-secondary">키 저장</button>
                </div>
            </div>

            <hr>

            <div class="consult-section">
                <h3>🏥 AI 간호사 상담</h3>
                <textarea id="consult-input" placeholder="어디가 불편하신지 증상을 자세히 적어주세요. (예: 어제부터 머리가 지끈거리고 열이 나요.)" rows="4"></textarea>
                <button id="btn-save-consult" class="btn-primary">AI 간호사에게 물어보기 & 저장</button>
            </div>

            <hr>

            <div class="history-section">
                <h3>📅 이전 상담 기록</h3>
                <div id="consult-history">
                    <p class="empty-msg">저장된 상담 기록이 없습니다.</p>
                </div>
            </div>
        </div>
    </div>

    <script type="module" src="script.js"></script>
</body>
</html>
