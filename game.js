const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
// syllableElement 참조 제거 - HTML에 해당 요소가 없음

// 게임 상태
let gameState = {
    score: 0,
    lives: 3,
    camera: { x: 0, y: 0 },
    keys: {},
    worldWidth: 2400,
    collectedJamos: [] // 자음/모음 수집용
};

// 전역 변수들
let jamos = []; // 자모 배열 전역 선언
let wordRepeatCount = 0;
const maxStage = 5; // 5단계
let shieldActive = false; // 방패 상태
let treasureChest = null; // 보물상자

// 속도 설정 변수들
let speedMultiplier = 1;
let jumpMultiplier = 1;
let enemySpeedMultiplier = 1;

// 플레이어 객체
let player = {
    x: 100,
    y: getGroundY() - 30 - 10, // player.height=30
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    speed: 5, // 기본 속도
    jumpPower: 12, // 기본 점프력
    onGround: false,
    direction: 1, // 1: 오른쪽, -1: 왼쪽
    invulnerable: false,
    invulnerableTime: 0,
    isAttacking: false,
    attackTimer: 0,
    attackCooldown: 0
};

// 바닥 y 위치를 동적으로 계산
function getGroundY() {
    return canvas.height * 0.7;
}

// 플랫폼들
let platforms = [
    // 바닥
    { x: 0, y: getGroundY(), width: 2400, height: 50, color: '#8B4513', isGround: true },
    // 중간 플랫폼들 (y 좌표는 기존대로)
    { x: 200, y: 130, width: 150, height: 20, color: '#228B22' },
    { x: 400, y: 80, width: 100, height: 20, color: '#228B22' },
    { x: 600, y: 150, width: 120, height: 20, color: '#228B22' },
    { x: 800, y: 100, width: 100, height: 20, color: '#228B22' },
    { x: 1000, y: 180, width: 150, height: 20, color: '#228B22' },
    { x: 1200, y: 120, width: 100, height: 20, color: '#228B22' },
    { x: 1400, y: 60, width: 120, height: 20, color: '#228B22' },
    { x: 1600, y: 130, width: 100, height: 20, color: '#228B22' },
    { x: 1800, y: 80, width: 150, height: 20, color: '#228B22' },
    { x: 2000, y: 150, width: 100, height: 20, color: '#228B22' },
    { x: 2200, y: 50, width: 200, height: 20, color: '#228B22' }
];

// 적들
let enemies = [
    { x: 300, y: getGroundY() - 25, width: 25, height: 25, velocityX: -1, direction: -1, alive: true },
    { x: 500, y: getGroundY() - 25, width: 25, height: 25, velocityX: 1, direction: 1, alive: true },
    { x: 700, y: getGroundY() - 25, width: 25, height: 25, velocityX: -1, direction: -1, alive: true },
    { x: 1100, y: getGroundY() - 25, width: 25, height: 25, velocityX: 1, direction: 1, alive: true },
    { x: 1500, y: getGroundY() - 25, width: 25, height: 25, velocityX: -1, direction: -1, alive: true },
    { x: 1900, y: getGroundY() - 25, width: 25, height: 25, velocityX: 1, direction: 1, alive: true }
];

// 한글 자음/모음 전체 소스
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const JUNG = [
  'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ',
  'ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'
];
// 종성 배열 추가
const JONG = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function splitHangul(str) {
    let result = [];
    for (let ch of str) {
        const code = ch.charCodeAt(0) - 0xAC00;
        if (code < 0 || code > 11171) {
            result.push(ch);
            continue;
        }
        const cho = Math.floor(code / (21 * 28));
        const jung = Math.floor((code % (21 * 28)) / 28);
        const jong = code % 28;
        result.push(CHO[cho]);
        result.push(JUNG[jung]);
        if (jong > 0) result.push(JONG[jong]);
    }
    return result;
}

// 동적 단어/힌트 데이터 관리
let STAGE_WORDS = [
    { word: '백발백중', hint: '무엇을 하든 틀리지 않고 모두 잘 맞음' },
    { word: '살신성인', hint: '자신을 희생하여 남을 이롭게 함' },
    { word: '괄목상대', hint: '상대방의 학식이나 능력이 크게 늘어남' },
    { word: '청출어람', hint: '제자가 스승보다 나음' },
    { word: '난형난제', hint: '누가 더 낫고 못한지 판단하기 어려움' },
    { word: '동문서답', hint: '묻는 말에 엉뚱한 대답을 함' },
    { word: '동병상련', hint: '비슷한 처지의 사람끼리 서로 동정함' },
    { word: '막상막하', hint: '서로 우열을 가리기 어려움' },
    { word: '만장일치', hint: '모든 사람의 의견이 같음' },
    { word: '반신반의', hint: '반은 믿고 반은 의심함' }
];

// 로컬 스토리지에서 단어 데이터 로드
function loadWordsFromStorage() {
    const savedWords = localStorage.getItem('gameWords');
    if (savedWords) {
        STAGE_WORDS = JSON.parse(savedWords);
    }
}

// 로컬 스토리지에 단어 데이터 저장
function saveWordsToStorage() {
    localStorage.setItem('gameWords', JSON.stringify(STAGE_WORDS));
}

// 단어 추가 함수
function addWord(word, hint) {
    if (word && hint) {
        STAGE_WORDS.push({ word: word.trim(), hint: hint.trim() });
        saveWordsToStorage();
        return true;
    }
    return false;
}

// 단어 삭제 함수
function removeWord(index) {
    if (index >= 0 && index < STAGE_WORDS.length) {
        STAGE_WORDS.splice(index, 1);
        saveWordsToStorage();
        return true;
    }
    return false;
}

// 단어 목록 표시 함수
function displayWordList() {
    const wordList = document.getElementById('wordList');
    wordList.innerHTML = '';
    
    STAGE_WORDS.forEach((item, index) => {
        const wordItem = document.createElement('div');
        wordItem.style.cssText = 'border:1px solid #ddd;margin:5px 0;padding:8px;border-radius:4px;background:#f9f9f9;';
        wordItem.innerHTML = `
            <div style="font-weight:bold;color:#333;margin-bottom:3px;">${item.word}</div>
            <div style="font-size:12px;color:#666;margin-bottom:5px;">${item.hint}</div>
            <button onclick="removeWord(${index});displayWordList();" style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px;">삭제</button>
        `;
        wordList.appendChild(wordItem);
    });
}

// 스케치북에 획득한 자모 표시 함수
function updateSketchbook() {
    const collectedJamosElement = document.getElementById('collectedJamos');
    if (!collectedJamosElement) return;
    if (gameState.collectedJamos.length === 0) {
        collectedJamosElement.innerHTML = '<span style="color:#ccc;font-style:italic;">자모를 수집하세요</span>';
    } else {
        collectedJamosElement.innerHTML = composeHangul(gameState.collectedJamos);
    }
}

// 스테이지별 플랫폼/몬스터 난이도 설정
const STAGE_DIFFICULTY = [
    // 각 스테이지별 플랫폼 구조와 몬스터 수
    { platforms: 3, enemies: 1 },
    { platforms: 4, enemies: 1 },
    { platforms: 5, enemies: 2 },
    { platforms: 6, enemies: 2 },
    { platforms: 7, enemies: 3 },
    { platforms: 8, enemies: 3 },
    { platforms: 9, enemies: 4 },
    { platforms: 10, enemies: 4 },
    { platforms: 11, enemies: 5 },
    { platforms: 12, enemies: 6 }
];

// 사다리 데이터
let ladders = [];

function generatePlatforms(stageIdx) {
    const base = [{ x: 0, y: getGroundY(), width: 2400, height: 50, color: '#8B4513', isGround: true }];
    const n = STAGE_DIFFICULTY[stageIdx % STAGE_DIFFICULTY.length].platforms;
    const type = stageIdx % 3; // 0: 계단, 1: 언덕, 2: 복층
    const arr = [];
    const usedRects = [];
    const jumpMax = player.jumpPower * 2.2;
    const maxHeight = getGroundY() - 60; // 최대 높이 제한
    
    function isOverlapping(x, y, w, h) {
        return usedRects.some(r => !(x + w <= r.x || x >= r.x + r.w || y + h <= r.y || y >= r.y + r.h));
    }
    
    if (stageIdx === 0) {
        // 첫 스테이지는 고정
        return base.concat([
            { x: 200, y: getGroundY() - 120, width: 150, height: 20, color: '#228B22' },
            { x: 400, y: getGroundY() - 170, width: 100, height: 20, color: '#228B22' },
            { x: 600, y: getGroundY() - 140, width: 120, height: 20, color: '#228B22' },
            { x: 800, y: getGroundY() - 190, width: 100, height: 20, color: '#228B22' },
            { x: 1000, y: getGroundY() - 110, width: 150, height: 20, color: '#228B22' },
            { x: 1200, y: getGroundY() - 170, width: 100, height: 20, color: '#228B22' },
            { x: 1400, y: getGroundY() - 230, width: 120, height: 20, color: '#228B22' },
            { x: 1600, y: getGroundY() - 140, width: 100, height: 20, color: '#228B22' },
            { x: 1800, y: getGroundY() - 190, width: 150, height: 20, color: '#228B22' },
            { x: 2000, y: getGroundY() - 130, width: 100, height: 20, color: '#228B22' },
            { x: 2200, y: getGroundY() - 250, width: 200, height: 20, color: '#228B22' }
        ]);
    } else {
        let lastY = getGroundY();
        for (let i = 0; i < n; i++) {
            let plat;
            let tries = 0;
            do {
                let px, py, pw, ph;
                let gapY;
                
                // 점프 가능한 높이로 제한
                gapY = Math.random() * (jumpMax * 0.6) + 40; // 40~jumpMax*0.6+40 범위
                
                if (type === 0) { // 계단형
                    px = 200 + i * 150;
                    py = lastY - gapY;
                    pw = 100 + Math.random() * 40;
                    ph = 20;
                } else if (type === 1) { // 언덕형
                    px = 200 + i * 150;
                    py = lastY - gapY;
                    pw = 120 + Math.random() * 40;
                    ph = 20;
                } else { // 복층형
                    px = 200 + (i%3)*300 + Math.random()*50;
                    py = lastY - gapY;
                    pw = 100 + Math.random() * 60;
                    ph = 20;
                }
                
                // 높이 제한 적용
                py = Math.max(60, Math.min(maxHeight, py));
                
                // 움직이는 플랫폼 추가 (20% 확률)
                const isMoving = Math.random() < 0.2;
                plat = { 
                    x: px, 
                    y: py, 
                    width: pw, 
                    height: ph, 
                    color: '#228B22',
                    isMoving: isMoving,
                    originalX: px,
                    originalY: py,
                    moveRange: isMoving ? 50 + Math.random() * 100 : 0,
                    moveSpeed: isMoving ? 0.5 + Math.random() * 1 : 0,
                    moveDirection: isMoving ? (Math.random() > 0.5 ? 1 : -1) : 0
                };
                tries++;
            } while (isOverlapping(plat.x, plat.y, plat.width, plat.height) && tries < 20);
            
            if (tries < 20) {
                usedRects.push({ x: plat.x, y: plat.y, w: plat.width, h: plat.height });
                arr.push(plat);
                lastY = plat.y;
            }
        }
    }
    
    // 사다리 자동 생성 (플랫폼 간 gapY가 점프 높이 초과 시만)
    ladders = [];
    for (let i = 1; i < arr.length; i++) {
        for (let j = 0; j < i; j++) {
            const lower = arr[j], upper = arr[i];
            const gapY = lower.y - (upper.y + upper.height);
            if (gapY > jumpMax * 0.8) { // 점프로 도달할 수 없는 높이일 때만
                // 이미 이 위치에 사다리가 있는지 확인
                const ladderX = upper.x + upper.width/2 - 8;
                const exists = ladders.some(lad => Math.abs(lad.x - ladderX) < 20);
                if (!exists) {
                    ladders.push({
                        x: ladderX,
                        y: upper.y + upper.height,
                        width: 16,
                        height: gapY,
                        top: upper.y + upper.height,
                        bottom: lower.y
                    });
                }
            }
        }
    }
    
    return base.concat(arr);
}

function generateEnemies(stageIdx) {
    const n = STAGE_DIFFICULTY[stageIdx % STAGE_DIFFICULTY.length].enemies;
    const arr = [];
    for (let i = 0; i < n; i++) {
        arr.push({
            x: 300 + i * 300 + Math.random() * 100,
            y: getGroundY() - 25,
            width: 25,
            height: 25,
            velocityX: Math.random() > 0.5 ? 1 : -1,
            direction: Math.random() > 0.5 ? 1 : -1,
            alive: true
        });
    }
    return arr;
}

// --- 스테이지 반복/드롭형 단어 모드 ---
function startStage(idx) {
    wordRepeatCount = 0;
    const stageData = STAGE_WORDS[idx % STAGE_WORDS.length];
    stage.index = idx;
    stage.word = stageData.word;
    stage.hint = stageData.hint;
    stage.jamos = splitHangul(stage.word);
    platforms = generatePlatforms(idx);
    spawnEnemies(idx, 0);
    spawnJamos();
    gameState.collectedJamos = [];
    player.x = 100;
    player.y = getGroundY() - player.height - 10;
    player.velocityX = 0;
    player.velocityY = 0;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    // 보물상자: 항상 x=600, 바닥 위에 고정
    treasureChest = { x: 600, y: getGroundY() - 32, width: 32, height: 32, opened: false };
    // 디버깅 출력
    console.log('플랫폼:', platforms);
    console.log('플레이어:', player);
    console.log('적:', enemies);
    stageHintElement.textContent = `힌트: ${stage.hint}`;
    stageHintElement.style.display = 'block';
    updateSketchbook();
}

// spawnFallingJamos 함수 제거, 대신 spawnJamos 함수로 교체
function spawnJamos() {
    const usedRects = [];
    jamos = stage.jamos.map((char, i) => {
        let plat, px, py, tries = 0;
        do {
            plat = platforms[Math.floor(Math.random() * platforms.length)];
            px = plat.x + 20 + Math.random() * (plat.width - 40);
            // 바닥 위에 배치할 경우 getGroundY()-32, 아니면 기존대로
            py = plat.isGround ? getGroundY() - 32 : plat.y - 32;
            tries++;
        } while (usedRects.some(r => Math.abs(r.x - px) < 40 && Math.abs(r.y - py) < 40) && tries < 20);
        usedRects.push({ x: px, y: py });
        return { char, x: px, y: py, width: 24, height: 24, collected: false };
    });
}

// updateJamos 함수 - 자모 수집 처리
function updateJamos() {
    jamos.forEach((jamo, idx) => {
        if (!jamo.collected && checkCollision(player, jamo)) {
            // 순서 체크: 다음으로 획득해야 할 자음/모음만 가능
            if (idx === gameState.collectedJamos.length) {
                jamo.collected = true;
                gameState.collectedJamos.push(jamo.char);
                gameState.score += 200;
                if (typeof playSound === 'function') playSound('collect');
                updateSketchbook(); // 스케치북 업데이트
            } else {
                // 순서가 아니면 안내 메시지
                const nextJamo = jamos[gameState.collectedJamos.length]?.char || '';
                showTempMessage(`순서대로 획득하세요! (다음: ${nextJamo})`, 1000);
            }
        }
    });
}

function spawnEnemies(stageIdx, repeatCount) {
    const base = STAGE_DIFFICULTY[stageIdx % STAGE_DIFFICULTY.length].enemies;
    const n = (base + repeatCount) * 3; // 3배로 증가
    enemies = [];
    
    const enemyTypes = ['robot', 'skeleton', 'alien', 'ghost', 'slime', 'bat'];
    
    for (let i = 0; i < n; i++) {
        const enemyType = enemyTypes[i % enemyTypes.length];
        const baseX = 200 + i * 150 + Math.random() * 200; // 간격 조정
        const baseY = getGroundY() - 25;
        
        let enemy = {
            x: baseX,
            y: baseY,
            width: 25,
            height: 25,
            velocityX: (Math.random() > 0.5 ? 1 : -1) * (1 + repeatCount * 0.3) * enemySpeedMultiplier, // 속도 설정 적용
            direction: Math.random() > 0.5 ? 1 : -1,
            alive: true,
            type: enemyType,
            // 특수 능력 추가
            canJump: enemyType === 'bat' || enemyType === 'ghost',
            canFly: enemyType === 'bat',
            isSlime: enemyType === 'slime',
            isGhost: enemyType === 'ghost',
            // 이동 패턴 설정
            movePattern: getMovePattern(enemyType),
            // 이동 패턴 관련 변수들
            jumpTimer: 0,
            jumpCooldown: 0,
            originalY: baseY,
            velocityY: 0,
            onGround: false,
            // 구간 이동 설정
            minX: baseX - 100,
            maxX: baseX + 100
        };
        
        // 특수 몬스터 위치 조정
        if (enemy.canFly) {
            enemy.y = baseY - 50 + Math.random() * 30; // 공중에 배치
        } else if (enemy.isSlime) {
            enemy.y = baseY + 5; // 바닥에 가깝게
            enemy.height = 20; // 더 납작하게
        } else if (enemy.isGhost) {
            enemy.y = baseY - 20 + Math.random() * 40; // 중간 높이
        }
        
        enemies.push(enemy);
    }
}

// 몬스터 타입별 이동 패턴 설정
function getMovePattern(enemyType) {
    switch(enemyType) {
        case 'robot':
            return 'normal'; // 보통 속도 좌우 이동
        case 'skeleton':
            return 'fast'; // 빠른 속도 좌우 이동
        case 'alien':
            return 'jump'; // 통통뛰기 (점프)
        case 'ghost':
            return 'float'; // 부드럽게 떠다님
        case 'slime':
            return 'slow'; // 느리게 기어다님
        case 'bat':
            return 'fly'; // 공중 비행
        default:
            return 'normal';
    }
}

// 스테이지 힌트 표시 (index.html에 <div id="stageHint"></div> 추가 필요)
const stageHintElement = document.getElementById('stageHint');

// 키보드 입력 처리 (점프 효과음)
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});
document.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
});

// 중복된 updateJamos 함수 제거

// 중복된 drawJamos 함수 제거

// 한글 조합 함수 (간단 버전)
function composeHangul(jamos) {
    // 초성+중성(+종성) 쌍 조합, 나머지는 그대로
    let result = '';
    let i = 0;
    while (i < jamos.length) {
        const cho = jamos[i] || '';
        const jung = jamos[i+1] || '';
        const jong = jamos[i+2] || '';
        let choIdx = CHO.indexOf(cho);
        let jungIdx = JUNG.indexOf(jung);
        let jongIdx = JONG.indexOf(jong);
        if (choIdx !== -1 && jungIdx !== -1) {
            if (jongIdx === -1) jongIdx = 0;
            let code = 0xAC00 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx;
            result += String.fromCharCode(code);
            i += (jongIdx > 0 ? 3 : 2);
        } else {
            // 한글 자모가 아니면 그대로
            result += cho;
            i++;
        }
    }
    return result;
}

// 게임 루프 내에서 updateJamos, drawJamos 호출
// updateCoins -> updateJamos, drawCoins -> drawJamos로 교체
// 게임 루프 내에서 updateJamos, drawJamos 호출

// === 게임 루프 예시 ===
let gameStarted = false;
let animationId = null;
const startText = document.getElementById('startText');

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    startText.style.display = 'none';
    startStage(0);
    gameLoop();
}

startText.addEventListener('click', startGame);

// 속도 설정 UI 이벤트 핸들러
function setupSpeedSettings() {
    const speedSettingsBtn = document.getElementById('speedSettingsBtn');
    const speedSettingsUI = document.getElementById('speedSettingsUI');
    const closeSpeedSettingsBtn = document.getElementById('closeSpeedSettingsBtn');
    const speedSlider = document.getElementById('speedSlider');
    const jumpSlider = document.getElementById('jumpSlider');
    const enemySpeedSlider = document.getElementById('enemySpeedSlider');
    const speedValue = document.getElementById('speedValue');
    const jumpValue = document.getElementById('jumpValue');
    const enemySpeedValue = document.getElementById('enemySpeedValue');
    const resetSpeedBtn = document.getElementById('resetSpeedBtn');

    // 속도 설정 버튼 클릭
    speedSettingsBtn.addEventListener('click', () => {
        speedSettingsUI.style.display = 'block';
        wordListUI.style.display = 'none';
        wordInputUI.style.display = 'none';
    });

    // 닫기 버튼 클릭
    closeSpeedSettingsBtn.addEventListener('click', () => {
        speedSettingsUI.style.display = 'none';
    });

    // 이동 속도 슬라이더
    speedSlider.addEventListener('input', (e) => {
        speedMultiplier = e.target.value / 100;
        speedValue.textContent = e.target.value;
        player.speed = 5 * speedMultiplier;
    });

    // 점프 높이 슬라이더
    jumpSlider.addEventListener('input', (e) => {
        jumpMultiplier = e.target.value / 100;
        jumpValue.textContent = e.target.value;
        player.jumpPower = 12 * jumpMultiplier;
    });

    // 적 속도 슬라이더
    enemySpeedSlider.addEventListener('input', (e) => {
        enemySpeedMultiplier = e.target.value / 100;
        enemySpeedValue.textContent = e.target.value;
        // 기존 적들의 속도 업데이트
        enemies.forEach(enemy => {
            if (enemy.velocityX > 0) {
                enemy.velocityX = 1 * enemySpeedMultiplier;
            } else if (enemy.velocityX < 0) {
                enemy.velocityX = -1 * enemySpeedMultiplier;
            }
        });
    });

    // 초기화 버튼
    resetSpeedBtn.addEventListener('click', () => {
        speedSlider.value = 100;
        jumpSlider.value = 100;
        enemySpeedSlider.value = 100;
        speedMultiplier = 1;
        jumpMultiplier = 1;
        enemySpeedMultiplier = 1;
        player.speed = 5;
        player.jumpPower = 12;
        speedValue.textContent = '100';
        jumpValue.textContent = '100';
        enemySpeedValue.textContent = '100';
        
        // 적들 속도 초기화
        enemies.forEach(enemy => {
            if (enemy.velocityX > 0) {
                enemy.velocityX = 1;
            } else if (enemy.velocityX < 0) {
                enemy.velocityX = -1;
            }
        });
    });
}

// 속도 설정 초기화
setupSpeedSettings();

function gameLoop() {
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    // 게임이 시작되지 않았으면 배경만 그리기
    if (!gameStarted) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    
    updateMovingPlatforms(); // 움직이는 플랫폼 업데이트
    updatePlayer();
    updateEnemies();
    updateJamos();
    updateTreasureChest();
    drawPlatforms();
    drawLadders();
    drawJamos();
    drawEnemies();
    drawTreasureChest();
    drawPlayer();
    scoreElement.textContent = gameState.score;
    drawLives(); // 하트 항상 그림
    if (stageHintElement) {
        stageHintElement.textContent = `힌트: ${stage.hint}`;
        stageHintElement.style.display = 'block';
    }
    checkStageClear();
    animationId = requestAnimationFrame(gameLoop);
}

// 사다리 타기 로직: 사다리와 충돌 시 위/아래 방향키로 이동
let onLadder = false;
function updatePlayer() {
    // 무적 시간 처리
    if (player.invulnerable) {
        player.invulnerableTime--;
        if (player.invulnerableTime <= 0) {
            player.invulnerable = false;
        }
    }
    // 방패(무적) 시간 처리
    // 방패 지속시간 관련 코드 완전 제거
    // shieldTime, SHIELD_DURATION, 관련 if문, 감소, 초기화 등 모두 삭제
    // 사다리 충돌 체크 (더 넓은 범위로 감지)
    onLadder = false;
    for (const lad of ladders) {
        if (
            player.x + player.width > lad.x - 10 &&
            player.x < lad.x + lad.width + 10 &&
            player.y + player.height > lad.top - 10 &&
            player.y < lad.bottom + 10
        ) {
            onLadder = true;
            break;
        }
    }
    // 이동 입력 처리 및 마찰 보정
    if (gameState.keys['arrowleft'] || gameState.keys['a']) {
        player.velocityX = -player.speed;
        player.direction = -1;
    } else if (gameState.keys['arrowright'] || gameState.keys['d']) {
        player.velocityX = player.speed;
        player.direction = 1;
    } else {
        player.velocityX *= 0.7;
        if (Math.abs(player.velocityX) < 0.1) player.velocityX = 0;
    }
    // 사다리 타기
    if (onLadder) {
        player.velocityY = 0;
        if (gameState.keys['arrowup'] || gameState.keys['w'] || gameState.keys['control']) {
            player.y -= player.speed * 1.5; // 사다리 타기 속도 증가
        } else if (gameState.keys['arrowdown'] || gameState.keys['s']) {
            player.y += player.speed * 1.5; // 사다리 타기 속도 증가
        }
        // 사다리 꼭대기에서 플랫폼 위로 자동 착지
        for (const plat of platforms) {
            if (
                player.x + player.width/2 > plat.x &&
                player.x + player.width/2 < plat.x + plat.width &&
                Math.abs((player.y + player.height) - plat.y) < 8
            ) {
                player.y = plat.y - player.height;
                player.onGround = true;
                player.velocityY = 0;
            }
        }
    } else {
        // 점프(한 번만)
        if ((gameState.keys['arrowup'] || gameState.keys['w'] || gameState.keys['control']) && player.onGround && jumpPressed) {
            // 점프 높이 제한: 일정 높이 이상에서는 점프 파워 감소
            let jumpPower = player.jumpPower;
            if (player.y < getGroundY() - 200) jumpPower = Math.max(10, player.jumpPower - 3); // 높은 곳에서는 점프력 감소
            player.velocityY = -jumpPower;
            player.onGround = false;
            jumpPressed = false;
        }
        // 중력 적용
        player.velocityY += 0.8;
        if (player.velocityY > 15) player.velocityY = 15;
    }
    // 위치 업데이트
    player.x += player.velocityX;
    player.y += player.velocityY;
    // 화면 경계 처리 및 벽 충돌 시 멈춤
    if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
    }
    if (player.x > gameState.worldWidth - player.width) {
        player.x = gameState.worldWidth - player.width;
        player.velocityX = 0;
    }
    // 플랫폼 충돌 처리
    player.onGround = false;
    for (let i = platforms.length - 1; i >= 0; i--) {
        const platform = platforms[i];
        if (checkCollision(player, platform)) {
            if (platform.treeWall) {
                // 나무 벽은 항상 단단하게 막힘, 파괴/삭제 불가
                if (player.velocityY > 0 && player.y < platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.onGround = true;
                } else if (player.velocityY < 0 && player.y > platform.y) {
                    player.y = platform.y + platform.height;
                    player.velocityY = 0;
                }
                continue;
            }
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
            } else if (player.velocityY < 0 && player.y + player.height - 2 < platform.y + platform.height && player.y > platform.y) {
                // 벽돌 깨기(점프 시) - 무적(방패) 상태에서는 제거하지 않음
                if (platform.y > 100 && !player.invulnerable) { // 무적 상태가 아니면 깨짐
                    platforms.splice(i, 1);
                    player.velocityY = 2;
                    gameState.score += 100;
                    if (typeof playSound === 'function') playSound('stomp');
                }
            }
        }
        // 바닥(ground) 플랫폼 위에 서 있으면 항상 onGround 유지
        if (platform.y === 350 && player.y + player.height <= platform.y + platform.height && player.x + player.width > platform.x && player.x < platform.x + platform.width) {
            player.onGround = true;
        }
    }
    // 추락 처리
    let onAnyPlatform = false;
    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        if (
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            Math.abs((player.y + player.height) - p.y) < 2
        ) {
            onAnyPlatform = true;
            break;
        }
    }
    if (player.y > canvas.height && !onAnyPlatform) {
        respawnPlayer();
    }
    // 카메라 업데이트
    gameState.camera.x = player.x - canvas.width / 2;
    if (gameState.camera.x < 0) gameState.camera.x = 0;
    if (gameState.camera.x > gameState.worldWidth - canvas.width) {
        gameState.camera.x = gameState.worldWidth - canvas.width;
    }
    // 공격 상태 처리
    if (player.isAttacking) {
        player.attackTimer--;
        if (player.attackTimer <= 0) {
            player.isAttacking = false;
        }
    }
    // 공격 쿨타임 처리
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }

    
    // 공격 히트박스
    if (player.isAttacking) {
        const attackRange = 18; // 짧은 거리
        const attackBox = {
            x: player.x + (player.direction === 1 ? player.width : -attackRange),
            y: player.y + player.height/2 - 10,
            width: attackRange,
            height: 20
        };
        enemies.forEach(enemy => {
            if (enemy.alive && checkCollision(attackBox, enemy)) {
                enemy.alive = false;
                gameState.score += 500;
                if (typeof playSound === 'function') playSound('stomp');
            }
        });
    }
}

// 점프 키 한 번만 인식 (스페이스, w, 위쪽 방향키)
let jumpPressed = false;
document.addEventListener('keydown', (e) => {
    if ((e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'control') && !jumpPressed) {
        jumpPressed = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'control') {
        jumpPressed = false;
    }
});


// --- 공격 입력 처리 (키보드/모바일) ---
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !player.isAttacking && player.attackCooldown === 0) {
        player.isAttacking = true;
        player.attackTimer = 5; // 5프레임(약 0.08초) 공격, 더 빠르게
    }
});
const btnAttack = document.getElementById('btnAttack');
if (btnAttack) {
    btnAttack.addEventListener('touchstart', e => {
        e.preventDefault();
        if (!player.isAttacking && player.attackCooldown === 0) {
            player.isAttacking = true;
            player.attackTimer = 5;
        }
    });
}

// 스테이지 클리어 시 다음 스테이지로 이동 (예시)
function checkStageClear() {
    if (gameState.collectedJamos.length === stage.jamos.length) {
        playSound('clear');
        setTimeout(() => {
            showClearMessage();
        }, 800);
    }
}
// 게임 루프 마지막에 checkStageClear() 호출
// gameLoop 내에 추가:
// stageHintElement.textContent = `힌트: ${stage.hint}`;
// checkStageClear(); 

// 스테이지별 배경 색상/이미지
const STAGE_BACKGROUNDS = [
    { color1: '#87CEEB', color2: '#98FB98', image: null }, // 기본
    { color1: '#FFD700', color2: '#FFA500', image: null }, // 노랑/주황
    { color1: '#B0E0E6', color2: '#4682B4', image: null }, // 파랑
    { color1: '#E6E6FA', color2: '#D8BFD8', image: null }, // 연보라
    { color1: '#F5DEB3', color2: '#DEB887', image: null }, // 베이지
    { color1: '#90EE90', color2: '#228B22', image: null }, // 연두/초록
    { color1: '#F08080', color2: '#CD5C5C', image: null }, // 연분홍/빨강
    { color1: '#FFFACD', color2: '#FFDAB9', image: null }, // 연노랑/피치
    { color1: '#C0C0C0', color2: '#808080', image: null }, // 회색
    { color1: '#191970', color2: '#4169E1', image: null }  // 밤하늘
];

// 효과음 로딩
const sounds = {
    jump: new Audio('assets/jump.mp3'),
    collect: new Audio('assets/collect.mp3'),
    stomp: new Audio('assets/stomp.mp3'),
    clear: new Audio('assets/clear.mp3')
};
// === 음소거 기능 ===
let isMuted = false;
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        // 효과음 음소거
        Object.values(sounds).forEach(audio => { audio.muted = isMuted; });
        // 배경음악 음소거
        bgm.muted = isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
}
function playSound(name) {
    if (sounds[name]) {
        sounds[name].currentTime = 0;
        if (!isMuted) sounds[name].play();
    }
}

// 배경음악 로딩 및 반복 재생
const bgm = new Audio('assets/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.5;
window.addEventListener('keydown', function startBGM() {
    if (bgm.paused) {
        bgm.play();
    }
    window.removeEventListener('keydown', startBGM);
});

// drawBackground 개선 (스테이지별 배경 적용)
function drawBackground() {
    const bg = STAGE_BACKGROUNDS[stage.index % STAGE_BACKGROUNDS.length];
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, bg.color1);
    gradient.addColorStop(1, bg.color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 구름 (맵 전체에 반복)
    for (let i = 0; i < 20; i++) {
        let x = (i * 300 - gameState.camera.x * 0.3) % gameState.worldWidth;
        if (x < -100) x += gameState.worldWidth;
        let y = 50 + Math.sin(i) * 30;
        if (x > gameState.camera.x - 100 && x < gameState.camera.x + canvas.width + 100) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x - gameState.camera.x, y, 30, 0, Math.PI * 2); ctx.arc(x + 25 - gameState.camera.x, y, 35, 0, Math.PI * 2); ctx.arc(x + 50 - gameState.camera.x, y, 30, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    // 나무 (맵 전체에 반복) - 간격 3배 증가
    for (let i = 0; i < 4; i++) { // 12개에서 4개로 줄임
        let x = (150 + i * 600 - gameState.camera.x * 0.5) % gameState.worldWidth; // 200에서 600으로 증가
        if (x < 0) x += gameState.worldWidth;
        let y = getGroundY() - 40; // 바닥에 맞게 높이 조정
        if (x > gameState.camera.x - 50 && x < gameState.camera.x + canvas.width + 50) {
            ctx.save();
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(x - gameState.camera.x, y, 18, 40); // 나무 기둥
            ctx.beginPath(); ctx.arc(x - gameState.camera.x + 9, y, 32, 0, Math.PI*2); ctx.fillStyle = '#228B22'; ctx.fill(); // 나뭇잎
            ctx.restore();
        }
    }
    // 꽃 (맵 전체에 반복) - 간격 3배 증가
    for (let i = 0; i < 10; i++) { // 30개에서 10개로 줄임
        let x = (80 + i * 240 - gameState.camera.x * 0.7) % gameState.worldWidth; // 80에서 240으로 증가
        if (x < 0) x += gameState.worldWidth;
        let y = getGroundY() - 10; // 바닥에 맞게 높이 조정
        if (x > gameState.camera.x - 30 && x < gameState.camera.x + canvas.width + 30) {
            ctx.save();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath(); ctx.arc(x - gameState.camera.x, y, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            for (let j = 0; j < 6; j++) {
                let angle = (Math.PI * 2 / 6) * j;
                ctx.beginPath(); ctx.arc(x - gameState.camera.x + Math.cos(angle)*10, y + Math.sin(angle)*10, 4, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }
    }
}

// 점프, 획득, 밟기, 클리어 효과음 재생 위치에 playSound 호출 추가 필요
// 예시: 점프 시 playSound('jump'), 자음/모음 획득 시 playSound('collect'), 몬스터 밟기 시 playSound('stomp'), 스테이지 클리어 시 playSound('clear') 

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

let stage = {
    index: 0,
    word: '',
    hint: '',
    jamos: [],
}; 

// 움직이는 플랫폼 업데이트
function updateMovingPlatforms() {
    platforms.forEach(platform => {
        if (platform.isMoving) {
            // 움직이는 플랫폼 로직
            platform.x += platform.moveSpeed * platform.moveDirection;
            
            // 이동 범위 제한
            const distanceFromOriginal = Math.abs(platform.x - platform.originalX);
            if (distanceFromOriginal > platform.moveRange) {
                platform.moveDirection *= -1; // 방향 전환
            }
        }
    });
}

// --- 적 업데이트 ---
function updateEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        // 이동 패턴에 따른 움직임 처리
        updateEnemyMovement(enemy);
        
        // 구간 이동 보장
        if (enemy.x < enemy.minX) {
            enemy.x = enemy.minX;
            enemy.velocityX *= -1;
            enemy.direction *= -1;
        } else if (enemy.x > enemy.maxX) {
            enemy.x = enemy.maxX;
            enemy.velocityX *= -1;
            enemy.direction *= -1;
        }
        
        // 플랫폼 가장자리에서 방향 전환 (비행 몬스터 제외)
        if (enemy.movePattern !== 'fly') {
            let onPlatform = false;
            for (let platform of platforms) {
                if (enemy.y + enemy.height >= platform.y && 
                    enemy.y + enemy.height <= platform.y + platform.height + 10) {
                    if (enemy.x + enemy.width > platform.x && enemy.x < platform.x + platform.width) {
                        onPlatform = true;
                        break;
                    }
                }
            }
            if (!onPlatform || enemy.x <= 0 || enemy.x >= gameState.worldWidth - enemy.width) {
                enemy.velocityX *= -1;
                enemy.direction *= -1;
            }
        }
        
        // 플레이어와 충돌 검사 (밟기 공격이 우선)
        if (checkCollision(player, enemy) && !player.invulnerable) {
            // 플레이어가 몬스터 위에 있는지 확인 (밟기 공격)
            const isOnTop = player.y + player.height <= enemy.y + 10 && 
                           player.y + player.height >= enemy.y - 5 &&
                           player.x + player.width > enemy.x + 5 &&
                           player.x < enemy.x + enemy.width - 5;
            
            if (isOnTop && player.velocityY > 0) {
                // 밟기 공격 성공
                enemy.alive = false;
                gameState.score += 300;
                player.velocityY = -8; // 밟은 후 튀어오름
                if (typeof playSound === 'function') playSound('stomp');
            } else {
                // 일반 충돌 (데미지)
                if (shieldActive) {
                    shieldActive = false;
                    showTempMessage('방패가 깨졌습니다!', 1000);
                } else {
                    gameState.lives--;
                }
                player.invulnerable = true;
                player.invulnerableTime = 120;
                player.velocityX = -player.direction * 10;
                player.velocityY = -8;
                if (gameState.lives <= 0) {
                    resetGame();
                }
            }
        }
    });
}

// 몬스터 이동 패턴 처리
function updateEnemyMovement(enemy) {
    switch(enemy.movePattern) {
        case 'normal':
            // 로봇: 보통 속도 좌우 이동
            enemy.x += enemy.velocityX;
            break;
            
        case 'fast':
            // 해골: 빠른 속도 좌우 이동
            enemy.x += enemy.velocityX * 1.5;
            break;
            
        case 'jump':
            // 외계인: 통통뛰기 (점프)
            updateJumpingEnemy(enemy);
            break;
            
        case 'float':
            // 유령: 부드럽게 떠다님
            enemy.x += enemy.velocityX * 0.7;
            const time = Date.now() * 0.003;
            enemy.y += Math.sin(time + enemy.x * 0.005) * 0.3;
            break;
            
        case 'slow':
            // 슬라임: 느리게 기어다님
            enemy.x += enemy.velocityX * 0.4;
            break;
            
        case 'fly':
            // 박쥐: 공중 비행
            enemy.x += enemy.velocityX;
            const flyTime = Date.now() * 0.002;
            enemy.y += Math.sin(flyTime + enemy.x * 0.01) * 0.5;
            break;
            
        default:
            enemy.x += enemy.velocityX;
    }
}

// 점프하는 몬스터 업데이트
function updateJumpingEnemy(enemy) {
    // 중력 적용
    enemy.velocityY += 0.6;
    if (enemy.velocityY > 12) enemy.velocityY = 12;
    
    // 위치 업데이트
    enemy.x += enemy.velocityX;
    enemy.y += enemy.velocityY;
    
    // 바닥 충돌 체크
    if (enemy.y >= enemy.originalY) {
        enemy.y = enemy.originalY;
        enemy.velocityY = 0;
        enemy.onGround = true;
    } else {
        enemy.onGround = false;
    }
    
    // 점프 타이머 업데이트
    enemy.jumpTimer++;
    enemy.jumpCooldown--;
    
    // 점프 실행
    if (enemy.onGround && enemy.jumpCooldown <= 0 && enemy.jumpTimer > 120) {
        enemy.velocityY = -8; // 플레이어 점프력의 절반
        enemy.jumpTimer = 0;
        enemy.jumpCooldown = 60; // 점프 후 1초 대기
    }
    
    // 플랫폼 충돌 체크
    for (let platform of platforms) {
        if (enemy.y + enemy.height >= platform.y && 
            enemy.y + enemy.height <= platform.y + platform.height + 5) {
            if (enemy.x + enemy.width > platform.x && enemy.x < platform.x + platform.width) {
                enemy.y = platform.y - enemy.height;
                enemy.velocityY = 0;
                enemy.onGround = true;
                break;
            }
        }
    }
}

// 중복된 updateJamos 함수 제거

// --- 임시 메시지 표시 함수 ---
let tempMsgTimeout = null;
function showTempMessage(msg, ms) {
    let msgDiv = document.getElementById('tempMsg');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'tempMsg';
        msgDiv.style.position = 'absolute';
        msgDiv.style.top = '45%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%,-50%)';
        msgDiv.style.zIndex = 200;
        msgDiv.style.fontSize = '2em';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.color = '#fff';
        msgDiv.style.textShadow = '2px 2px 8px #222';
        msgDiv.style.background = 'rgba(0,0,0,0.3)';
        msgDiv.style.padding = '20px 40px';
        msgDiv.style.borderRadius = '20px';
        document.getElementById('gameContainer').appendChild(msgDiv);
    }
    msgDiv.textContent = msg;
    msgDiv.style.display = 'block';
    if (tempMsgTimeout) clearTimeout(tempMsgTimeout);
    tempMsgTimeout = setTimeout(() => { msgDiv.style.display = 'none'; }, ms);
}

// --- 스테이지 클리어 시 다음 스테이지로 이동, 마지막이면 축하 메시지 ---
function checkStageClear() {
    if (gameState.collectedJamos.length === stage.jamos.length) {
        wordRepeatCount++;
        if (wordRepeatCount < maxStage) {
            // 다음 단어(랜덤)로 교체, 몬스터 리젠, 자음/모음 배치
            const nextIdx = (stage.index + wordRepeatCount) % STAGE_WORDS.length;
            const stageData = STAGE_WORDS[nextIdx];
            stage.word = stageData.word;
            stage.hint = stageData.hint;
            stage.jamos = splitHangul(stage.word);
            
            // 새로운 구조물 생성
            regenerateStructures();
            
            spawnEnemies(stage.index, wordRepeatCount);
            spawnJamos();
            gameState.collectedJamos = [];
        } else {
            // 5번 반복 후 다음 스테이지로
            wordRepeatCount = 0;
            startStage(stage.index + 1);
        }
    }
}

// 새로운 단어 배치 시 구조물 재생성
function regenerateStructures() {
    // 기존 플랫폼과 사다리 제거 (바닥 제외)
    platforms = platforms.filter(p => p.isGround);
    ladders = [];
    
    // 새로운 플랫폼 생성
    const newPlatforms = generatePlatforms(stage.index);
    platforms = newPlatforms;
    
    // 플레이어가 공중에 있으면 안전한 위치로 이동
    let safePlatform = null;
    for (let platform of platforms) {
        if (platform.x <= player.x && player.x <= platform.x + platform.width &&
            Math.abs(player.y - (platform.y - player.height)) < 50) {
            safePlatform = platform;
            break;
        }
    }
    
    if (!safePlatform) {
        // 안전한 플랫폼이 없으면 바닥으로 이동
        player.y = getGroundY() - player.height - 10;
    }
}

function showClearMessage() {
    let clearDiv = document.getElementById('clearMsg');
    if (!clearDiv) {
        clearDiv = document.createElement('div');
        clearDiv.id = 'clearMsg';
        clearDiv.style.position = 'absolute';
        clearDiv.style.top = '40%';
        clearDiv.style.left = '50%';
        clearDiv.style.transform = 'translate(-50%,-50%)';
        clearDiv.style.zIndex = 300;
        clearDiv.style.fontSize = '2.5em';
        clearDiv.style.fontWeight = 'bold';
        clearDiv.style.color = '#fff';
        clearDiv.style.textShadow = '2px 2px 12px #1e90ff, 0 0 30px #fff';
        clearDiv.style.background = 'rgba(30,144,255,0.7)';
        clearDiv.style.padding = '30px 60px';
        clearDiv.style.borderRadius = '30px';
        clearDiv.style.textAlign = 'center';
        document.getElementById('gameContainer').appendChild(clearDiv);
    }
    clearDiv.style.display = 'block';
    clearDiv.innerHTML = `<div style='font-size:1.2em;margin-bottom:10px;'>사자성어: <b>${stage.word}</b></div><div style='font-size:0.9em;margin-bottom:18px;'>뜻: ${stage.hint}</div>`;
    if (stage.index + 1 < maxStage) {
        clearDiv.innerHTML += '<div style="margin-top:10px;">다음 스테이지로!</div>';
        setTimeout(() => {
            clearDiv.style.display = 'none';
            startStage(stage.index + 1);
        }, 2200);
    } else {
        clearDiv.innerHTML += '<div style="margin-top:10px;">축하합니다! 모든 스테이지를 클리어했습니다!</div>';
        setTimeout(() => {
            clearDiv.style.display = 'none';
            startStage(0);
        }, 3500);
    }
}

// --- 플레이어 리스폰 ---
function respawnPlayer() {
    player.x = 100;
    player.y = getGroundY() - player.height - 10;
    player.velocityX = 0;
    player.velocityY = 0;
    gameState.lives--;
    player.invulnerable = true;
    player.invulnerableTime = 120;
    if (gameState.lives <= 0) {
        resetGame();
    }
}

// --- 게임 리셋 ---
function resetGame() {
    // 게임을 완전히 재시작
    startStage(0);
    gameState.score = 0;
    gameState.lives = 3;
    player.invulnerable = false;
    player.invulnerableTime = 0;
}

// --- 그리기 함수들 ---
// drawPlayer: 연필 방향성 추가
function drawPlayer() {
    // 플레이어가 화면 밖에 있으면 그리지 않음
    if (
        player.x < -player.width ||
        player.x > gameState.worldWidth ||
        player.y < -player.height ||
        player.y > canvas.height
    ) return;
    ctx.save();
    ctx.translate(player.x - gameState.camera.x + player.width/2, player.y + player.height/2);
    // 무적 상태일 때 색상 반짝임 효과(방패X)
    if (player.invulnerable && Math.floor(player.invulnerableTime / 6) % 2 === 0) {
        ctx.globalAlpha = 0.5;
        ctx.filter = 'brightness(2) hue-rotate(60deg)';
    }
    // --- 팔/방패/지팡이 위치 스위치 ---
    if (shieldActive) {
        // 왼쪽(방패), 오른쪽(지팡이) <-> 방향에 따라 스위치
        if (player.direction === 1) {
            // 오른쪽 바라볼 때: 왼쪽(방패), 오른쪽(지팡이)
            // 방패
            ctx.save();
            ctx.translate(-18, 0);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(-8, -8, 16, 16, 4);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-5 + i*8, -8, 2, Math.PI, 0);
                ctx.stroke();
            }
            ctx.strokeStyle = '#b3e0fc';
            ctx.lineWidth = 0.8;
            for (let i = 1; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-8, -8 + i*5);
                ctx.lineTo(8, -8 + i*5);
                ctx.stroke();
            }
            ctx.restore();
            // 지팡이(오른쪽)
            ctx.save();
            ctx.rotate(player.isAttacking ? Math.PI/3 : 0);
            ctx.strokeStyle = '#FFD966'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(18, 8); ctx.stroke();
            ctx.strokeStyle = '#8ecae6'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(18, 8); ctx.lineTo(28, -8); ctx.stroke();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath(); ctx.arc(28, -8, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        } else {
            // 왼쪽 바라볼 때: 오른쪽(방패), 왼쪽(지팡이)
            // 방패
            ctx.save();
            ctx.translate(18, 0);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(-8, -8, 16, 16, 4);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-5 + i*8, -8, 2, Math.PI, 0);
                ctx.stroke();
            }
            ctx.strokeStyle = '#b3e0fc';
            ctx.lineWidth = 0.8;
            for (let i = 1; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-8, -8 + i*5);
                ctx.lineTo(8, -8 + i*5);
                ctx.stroke();
            }
            ctx.restore();
            // 지팡이(왼쪽)
            ctx.save();
            ctx.rotate(player.isAttacking ? -Math.PI/3 : 0);
            ctx.strokeStyle = '#FFD966'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, 8); ctx.stroke();
            ctx.strokeStyle = '#8ecae6'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-28, -8); ctx.stroke();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath(); ctx.arc(-28, -8, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    } else {
        // 방패 없을 때: 지팡이만 방향에 따라 위치
        if (player.direction === 1) {
            // 오른쪽: 오른팔(오른쪽)
            ctx.save();
            ctx.rotate(player.isAttacking ? Math.PI/3 : 0);
            ctx.strokeStyle = '#FFD966'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(18, 8); ctx.stroke();
            ctx.strokeStyle = '#8ecae6'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(18, 8); ctx.lineTo(28, -8); ctx.stroke();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath(); ctx.arc(28, -8, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        } else {
            // 왼쪽: 왼팔(왼쪽)
            ctx.save();
            ctx.rotate(player.isAttacking ? -Math.PI/3 : 0);
            ctx.strokeStyle = '#FFD966'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, 8); ctx.stroke();
            ctx.strokeStyle = '#8ecae6'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-28, -8); ctx.stroke();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath(); ctx.arc(-28, -8, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
    // 몸통(연필) - 고급 그라데이션 효과
    const bodyGradient = ctx.createLinearGradient(-12, -15, 12, 15);
    bodyGradient.addColorStop(0, '#FFD966');
    bodyGradient.addColorStop(0.5, '#FFE066');
    bodyGradient.addColorStop(1, '#FFC966');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-10, -15); // 왼쪽 위
    ctx.lineTo(10, -15); // 오른쪽 위
    ctx.lineTo(12, 15); // 오른쪽 아래
    ctx.lineTo(-12, 15); // 왼쪽 아래
    ctx.closePath();
    ctx.fill();
    
    // 연필 테두리
    ctx.strokeStyle = '#E6C200';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 연필 세로 줄무늬 (나무 질감 표현)
    ctx.strokeStyle = 'rgba(230, 194, 0, 0.3)'; // 연한 노란색
    ctx.lineWidth = 0.8;
    for (let i = -8; i <= 8; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, -15);
        ctx.lineTo(i, 15);
        ctx.stroke();
    }
    
    // 머리(위쪽)에 지우개 - 고급 효과
    const eraserGradient = ctx.createLinearGradient(-10, -21, 10, -15);
    eraserGradient.addColorStop(0, '#F8BBD0');
    eraserGradient.addColorStop(0.5, '#F48FB1');
    eraserGradient.addColorStop(1, '#F06292');
    ctx.fillStyle = eraserGradient;
    ctx.fillRect(-10, -21, 20, 6);
    // 지우개 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-8, -20, 16, 2);
    
    // 꼬리(아래쪽)에 연필심 - 고급 효과
    const tipGradient = ctx.createLinearGradient(-10, 15, 10, 25);
    tipGradient.addColorStop(0, '#2c3e50');
    tipGradient.addColorStop(0.5, '#34495e');
    tipGradient.addColorStop(1, '#2c3e50');
    ctx.fillStyle = tipGradient;
    ctx.beginPath();
    ctx.moveTo(-10, 15);
    ctx.lineTo(0, 25);
    ctx.lineTo(10, 15);
    ctx.closePath();
    ctx.fill();
    // 연필심 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-8, 15);
    ctx.lineTo(0, 23);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fill();
      
    // 지우개 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-8, 16, 16, 2);
    // 사다리 타기 중이면 얼굴을 그리지 않고, 막대를 왼쪽으로 옮김
    if (onLadder) {
        // 막대(요술봉) 왼쪽
        ctx.save();
        ctx.strokeStyle = '#FFD966'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, 8); ctx.stroke();
        ctx.strokeStyle = '#8ecae6'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-28, -8); ctx.stroke();
        ctx.fillStyle = '#ffb703';
        ctx.beginPath(); ctx.arc(-28, -8, 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    } else {
        // 얼굴 - 고급 효과
        // 눈 흰자
        ctx.fillStyle = '#fff';
        ctx.beginPath(); 
        ctx.arc(-4, -5, 2.5, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath(); 
        ctx.arc(4, -5, 2.5, 0, Math.PI*2); 
        ctx.fill();
        
        // 눈 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); 
        ctx.arc(-4, -4, 2.5, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath(); 
        ctx.arc(4, -4, 2.5, 0, Math.PI*2); 
        ctx.fill();
        
        // 눈동자
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); 
        ctx.arc(-4, -5, 1.2, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath(); 
        ctx.arc(4, -5, 1.2, 0, Math.PI*2); 
        ctx.fill();
        
        // 눈동자 하이라이트
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); 
        ctx.arc(-4.5, -5.5, 0.5, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath(); 
        ctx.arc(3.5, -5.5, 0.5, 0, Math.PI*2); 
        ctx.fill();
        
        // 눈썹
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); 
        ctx.moveTo(-6, -10); 
        ctx.lineTo(-2, -8); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo(2, -8); 
        ctx.lineTo(6, -10); 
        ctx.stroke();
        
        // 입
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.arc(0, 2, 2.5, 0, Math.PI, false); 
        ctx.stroke();
    }
    
    // 일반 팔 - 방향에 따라 위치 조정
    if (!onLadder) {
        if (player.direction === 1) {
            // 오른쪽 바라볼 때: 왼팔 (반대쪽)
            ctx.strokeStyle = '#FFD966'; 
            ctx.lineWidth = 3;
            ctx.beginPath(); 
            ctx.moveTo(-12, 0); 
            ctx.lineTo(-18, 8); 
            ctx.stroke();
        } else {
            // 왼쪽 바라볼 때: 오른팔 (반대쪽)
            ctx.strokeStyle = '#FFD966'; 
            ctx.lineWidth = 3;
            ctx.beginPath(); 
            ctx.moveTo(12, 0); 
            ctx.lineTo(18, 8); 
            ctx.stroke();
        }
    }
    
    // 다리 - 고급 효과
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); 
    ctx.moveTo(-6, 15); 
    ctx.lineTo(-6, 23); 
    ctx.stroke();
    ctx.beginPath(); 
    ctx.moveTo(6, 15); 
    ctx.lineTo(6, 23); 
    ctx.stroke();
    
    // 다리 그림자
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath(); 
    ctx.moveTo(-5, 16); 
    ctx.lineTo(-5, 24); 
    ctx.stroke();
    ctx.beginPath(); 
    ctx.moveTo(7, 16); 
    ctx.lineTo(7, 24); 
    ctx.stroke();
    ctx.restore();
    
    // 방패 착용 시 비누방울 보호막 효과
    if (shieldActive) {
        drawShieldBubble();
    }
}

// drawSyllableUI: 상단 중앙 스케치북 배경에 글자 표시
function drawSyllableUI() {
    const text = composeHangul(gameState.collectedJamos);
    const centerX = canvas.width / 2;
    const y = 50;
    // 스케치북 배경
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(centerX - 90, y - 28, 180, 56, 18);
    ctx.fill();
    ctx.stroke();
    // 스프링
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(centerX - 60 + i*20, y - 28, 6, Math.PI, 0);
        ctx.stroke();
    }
    // 글자
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 28px "Nanum Pen Script", "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || '-', centerX, y);
    ctx.restore();
    // DOM 애니메이션 강조 효과 제거
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        ctx.save();
        ctx.translate(enemy.x - gameState.camera.x + enemy.width/2, enemy.y + enemy.height/2);
        
        // 몬스터 타입에 따른 그리기
        switch(enemy.type) {
            case 'robot':
                drawRobot(enemy);
                break;
            case 'skeleton':
                drawSkeleton(enemy);
                break;
            case 'alien':
                drawAlien(enemy);
                break;
            case 'ghost':
                drawGhost(enemy);
                break;
            case 'slime':
                drawSlime(enemy);
                break;
            case 'bat':
                drawBat(enemy);
                break;
            default:
                drawRobot(enemy); // 기본값
        }
        
        ctx.restore();
    });
}

// 로봇 몬스터 그리기
function drawRobot(enemy) {
    // 몸통 그라데이션
    const bodyGradient = ctx.createLinearGradient(-12, -2, 12, 22);
    bodyGradient.addColorStop(0, '#666');
    bodyGradient.addColorStop(0.5, '#888');
    bodyGradient.addColorStop(1, '#666');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-12, -2, 24, 24);
    
    // 몸통 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-10, 0, 20, 8);
    
    // 머리 그라데이션
    const headGradient = ctx.createLinearGradient(-10, -16, 10, 0);
    headGradient.addColorStop(0, '#aaa');
    headGradient.addColorStop(0.5, '#ccc');
    headGradient.addColorStop(1, '#aaa');
    ctx.fillStyle = headGradient;
    ctx.fillRect(-10, -16, 20, 16);
    
    // 눈(빨간 LED) - 글로우 효과
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-6, -10, 4, 4);
    ctx.fillRect(2, -10, 4, 4);
    ctx.shadowBlur = 0;
    
    // 입(격자)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); 
    ctx.moveTo(-4, -2); 
    ctx.lineTo(4, -2); 
    ctx.stroke();
    ctx.beginPath(); 
    ctx.moveTo(-2, 0); 
    ctx.lineTo(2, 0); 
    ctx.stroke();
    
    // 안테나
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(0, -16); 
    ctx.lineTo(0, -22); 
    ctx.stroke();
    ctx.fillStyle = '#ff3333';
    ctx.beginPath(); 
    ctx.arc(0, -22, 2, 0, Math.PI*2); 
    ctx.fill();
    
    // 그림자
    drawEnemyShadow();
}

// 해골 몬스터 그리기
function drawSkeleton(enemy) {
    // 머리 그라데이션
    const skullGradient = ctx.createRadialGradient(0, -4, 0, 0, -4, 12);
    skullGradient.addColorStop(0, '#fff');
    skullGradient.addColorStop(0.7, '#eee');
    skullGradient.addColorStop(1, '#ddd');
    ctx.fillStyle = skullGradient;
    ctx.beginPath(); 
    ctx.arc(0, -4, 12, 0, Math.PI*2); 
    ctx.fill();
    
    // 턱
    ctx.fillStyle = '#eee';
    ctx.beginPath(); 
    ctx.ellipse(0, 8, 10, 6, 0, 0, Math.PI, false); 
    ctx.fill();
    
    // 눈구멍 - 어둡게
    ctx.fillStyle = '#000';
    ctx.beginPath(); 
    ctx.ellipse(-5, -6, 3, 5, 0, 0, Math.PI*2); 
    ctx.fill();
    ctx.beginPath(); 
    ctx.ellipse(5, -6, 3, 5, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 코구멍
    ctx.beginPath(); 
    ctx.ellipse(0, -2, 1.2, 2, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 이빨
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i += 3) {
        ctx.beginPath(); 
        ctx.moveTo(i, 10); 
        ctx.lineTo(i, 14); 
        ctx.stroke();
    }
    ctx.beginPath(); 
    ctx.moveTo(-6, 14); 
    ctx.lineTo(6, 14); 
    ctx.stroke();
    
    // 그림자
    drawEnemyShadow();
}

// 외계인 몬스터 그리기
function drawAlien(enemy) {
    // 머리 그라데이션
    const alienGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    alienGradient.addColorStop(0, '#7fffd4');
    alienGradient.addColorStop(0.7, '#40e0d0');
    alienGradient.addColorStop(1, '#20b2aa');
    ctx.fillStyle = alienGradient;
    ctx.beginPath(); 
    ctx.ellipse(0, 0, 13, 18, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 머리 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); 
    ctx.ellipse(-3, -8, 8, 6, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 눈(크고 검은 타원)
    ctx.fillStyle = '#000';
    ctx.beginPath(); 
    ctx.ellipse(-5, -4, 4, 8, 0, 0, Math.PI*2); 
    ctx.fill();
    ctx.beginPath(); 
    ctx.ellipse(5, -4, 4, 8, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 눈 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); 
    ctx.ellipse(-6, -6, 1.5, 2, 0, 0, Math.PI*2); 
    ctx.fill();
    ctx.beginPath(); 
    ctx.ellipse(4, -6, 1.5, 2, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // 입(작고 얇게)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(0, 8, 4, 0, Math.PI, false); 
    ctx.stroke();
    
    // 그림자
    drawEnemyShadow();
}

// 유령 몬스터 그리기
function drawGhost(enemy) {
    const time = Date.now() * 0.003;
    const float = Math.sin(time) * 3;
    
    // 유령 몸통 (반투명)
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(0, float, 12, 0, Math.PI, false);
    ctx.fill();
    
    // 유령 꼬리 (물결 모양)
    ctx.beginPath();
    ctx.moveTo(-12, float);
    for (let i = 0; i < 3; i++) {
        const x = -12 + i * 8;
        const y = float + Math.sin(time + i) * 2;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(12, float);
    ctx.fill();
    
    // 눈 (빈 원)
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-4, float - 4, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4, float - 4, 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // 입
    ctx.beginPath();
    ctx.arc(0, float + 2, 3, 0, Math.PI, false);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
}

// 슬라임 몬스터 그리기
function drawSlime(enemy) {
    const time = Date.now() * 0.005;
    const wobble = Math.sin(time) * 2;
    
    // 슬라임 몸통 (젤리 같은 효과)
    const slimeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    slimeGradient.addColorStop(0, '#90EE90');
    slimeGradient.addColorStop(0.7, '#32CD32');
    slimeGradient.addColorStop(1, '#228B22');
    ctx.fillStyle = slimeGradient;
    ctx.beginPath();
    ctx.ellipse(wobble, 0, 12 + Math.abs(wobble), 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 슬라임 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 눈
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // 입
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 2, 2, 0, Math.PI, false);
    ctx.stroke();
}

// 박쥐 몬스터 그리기
function drawBat(enemy) {
    const time = Date.now() * 0.008;
    const wingFlap = Math.sin(time) * 10;
    
    // 박쥐 몸통
    ctx.fillStyle = '#2F2F2F';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 날개 (깜빡이는 효과)
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.ellipse(-8, wingFlap, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, -wingFlap, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 귀
    ctx.fillStyle = '#2F2F2F';
    ctx.beginPath();
    ctx.arc(-2, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 눈 (빨간색)
    ctx.fillStyle = '#FF3333';
    ctx.beginPath();
    ctx.arc(-2, -2, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -2, 1, 0, Math.PI * 2);
    ctx.fill();
}

// 몬스터 그림자 그리기 (공통 함수)
function drawEnemyShadow() {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 12, 4, 0, 0, Math.PI*2);
    ctx.fill();
}

// 방패 비누방울 보호막 그리기
function drawShieldBubble() {
    const time = Date.now() * 0.003;
    const pulse = Math.sin(time) * 0.1 + 0.9; // 0.8 ~ 1.0 사이로 깜빡임
    
    // 플레이어 중심점으로 이동
    ctx.save();
    ctx.translate(player.x - gameState.camera.x + player.width/2, player.y + player.height/2);
    
    // 비누방울 효과 - 여러 겹의 원
    for (let i = 0; i < 3; i++) {
        const radius = 35 + i * 8;
        const alpha = (0.3 - i * 0.1) * pulse;
        
        // 비누방울 그라데이션
        const bubbleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        bubbleGradient.addColorStop(0, `rgba(135, 206, 250, ${alpha})`); // 하늘색
        bubbleGradient.addColorStop(0.3, `rgba(100, 149, 237, ${alpha})`); // 콘플라워 블루
        bubbleGradient.addColorStop(0.7, `rgba(70, 130, 180, ${alpha})`); // 스틸 블루
        bubbleGradient.addColorStop(1, `rgba(25, 25, 112, ${alpha})`); // 미드나이트 블루
        
        ctx.fillStyle = bubbleGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 비누방울 테두리 (무지개 효과)
        const borderGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
        borderGradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`); // 빨강
        borderGradient.addColorStop(0.2, `rgba(255, 165, 0, ${alpha})`); // 주황
        borderGradient.addColorStop(0.4, `rgba(255, 255, 0, ${alpha})`); // 노랑
        borderGradient.addColorStop(0.6, `rgba(0, 255, 0, ${alpha})`); // 초록
        borderGradient.addColorStop(0.8, `rgba(0, 0, 255, ${alpha})`); // 파랑
        borderGradient.addColorStop(1, `rgba(128, 0, 128, ${alpha})`); // 보라
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // 비누방울 하이라이트 (빛나는 효과)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(-8, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 비누방울 반사광
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * pulse})`;
    ctx.beginPath();
    ctx.arc(5, -12, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 비누방울 내부 물결 효과
    for (let i = 0; i < 5; i++) {
        const angle = time + i * Math.PI / 3;
        const x = Math.cos(angle) * (20 + i * 3);
        const y = Math.sin(angle) * (15 + i * 2);
        const size = 2 + Math.sin(time * 2 + i) * 1;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 글로우 효과
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = `rgba(135, 206, 250, ${0.5 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

function drawJamos() {
    jamos.forEach((jamo, index) => {
        if (jamo.collected) return;
        
        // 다음에 획득해야 할 자모인지 확인
        const isNextToCollect = index === gameState.collectedJamos.length;
        
        ctx.save();
        ctx.translate(jamo.x - gameState.camera.x + 20, jamo.y + 20); // 중심 보정
        const capsuleSize = 40;
        
        // 캡슐 배경색 결정
        if (isNextToCollect) {
            // 다음에 획득해야 할 캡슐: 밝은 노란색 배경, 빨간색 테두리
            ctx.fillStyle = '#FFFF99';
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 4;
        } else {
            // 일반 캡슐: 기존 색상
            ctx.fillStyle = '#FFF8DC';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
        }
        
        // 캡슐(원) 그리기
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, capsuleSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 자음/모음 글자 색상 결정
        if (isNextToCollect) {
            ctx.fillStyle = '#CC0000'; // 빨간색 글자로 강조
        } else {
            ctx.fillStyle = '#222'; // 일반 검은색
        }
        
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(jamo.char, 0, 2);
        
        // 다음에 획득해야 할 캡슐에 깜빡이는 효과 추가
        if (isNextToCollect) {
            const time = Date.now() * 0.005;
            const pulse = Math.sin(time) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#FF6666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, capsuleSize/2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    });
}

function drawPlatforms() {
    platforms.forEach(platform => {
        if (platform.isGround) {
            // 바닥을 벽돌 3줄로 두껍게 그림
            const tileW = 32, tileH = 20;
            const tilesX = Math.floor(platform.width / tileW);
            const rows = 3;
            for (let row = 0; row < rows; row++) {
                for (let tx = 0; tx < tilesX; tx++) {
                    const x = platform.x - gameState.camera.x + tx * tileW;
                    const y = platform.y + row * tileH;
                    // 벽돌 그라데이션
                    const brickGradient = ctx.createLinearGradient(x, y, x, y + tileH);
                    brickGradient.addColorStop(0, '#c97a3a');
                    brickGradient.addColorStop(0.5, '#d2691e');
                    brickGradient.addColorStop(1, '#c97a3a');
                    ctx.fillStyle = brickGradient;
                    ctx.fillRect(x, y, tileW, tileH);
                    // 벽돌 테두리
                    ctx.strokeStyle = '#8b4513';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, tileW, tileH);
                    // 벽돌 하이라이트
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect(x + 2, y + 2, tileW - 4, 4);
                    // 벽돌 중앙 점
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(x + tileW/2, y + tileH/2, 3, 0, Math.PI*2);
                    ctx.fill();
                    // 벽돌 가로줄
                    ctx.strokeStyle = '#e0a96d';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y + tileH/2);
                    ctx.lineTo(x + tileW, y + tileH/2);
                    ctx.stroke();
                    // 벽돌 그림자
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
                }
            }
            return;
        }
        // 움직이는 플랫폼과 일반 플랫폼 구분
        const tileW = 32, tileH = 20;
        const tilesX = Math.floor(platform.width / tileW);
        const tilesY = Math.floor(platform.height / tileH);
        
        // 움직이는 플랫폼인지 확인
        const isMoving = platform.isMoving;
        
        for (let tx = 0; tx < tilesX; tx++) {
            for (let ty = 0; ty < tilesY; ty++) {
                const x = platform.x - gameState.camera.x + tx * tileW;
                const y = platform.y + ty * tileH;
                
                // 움직이는 플랫폼은 다른 색상 사용
                let baseColor = '#c97a3a';
                let highlightColor = '#d2691e';
                let borderColor = '#8b4513';
                
                if (isMoving) {
                    // 움직이는 플랫폼: 파란색 계열
                    baseColor = '#4A90E2';
                    highlightColor = '#5BA0F2';
                    borderColor = '#2E5BBA';
                }
                
                // 벽돌 그라데이션
                const brickGradient = ctx.createLinearGradient(x, y, x, y + tileH);
                brickGradient.addColorStop(0, platform.broken ? '#b8860b' : baseColor);
                brickGradient.addColorStop(0.5, platform.broken ? '#daa520' : highlightColor);
                brickGradient.addColorStop(1, platform.broken ? '#b8860b' : baseColor);
                ctx.fillStyle = brickGradient;
                ctx.fillRect(x, y, tileW, tileH);
                
                // 벽돌 테두리
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, tileW, tileH);
                
                // 벽돌 하이라이트
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x + 2, y + 2, tileW - 4, 4);
                
                // 벽돌 중앙 점
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(x + tileW/2, y + tileH/2, 3, 0, Math.PI*2);
                ctx.fill();
                
                // 벽돌 가로줄
                ctx.strokeStyle = isMoving ? '#7BB3F0' : '#e0a96d';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, y + tileH/2);
                ctx.lineTo(x + tileW, y + tileH/2);
                ctx.stroke();
                
                // 벽돌 그림자
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
            }
        }
        
        // 움직이는 플랫폼에 글로우 효과 추가
        if (isMoving) {
            const time = Date.now() * 0.003;
            const glow = Math.sin(time) * 0.3 + 0.7;
            
            ctx.save();
            ctx.globalAlpha = glow * 0.3;
            ctx.shadowColor = '#4A90E2';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#4A90E2';
            ctx.lineWidth = 3;
            ctx.strokeRect(platform.x - gameState.camera.x, platform.y, platform.width, platform.height);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    });
} 

function drawLadders() {
    ladders.forEach(lad => {
        ctx.save();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(lad.x - gameState.camera.x, lad.top);
        ctx.lineTo(lad.x - gameState.camera.x, lad.bottom);
        ctx.moveTo(lad.x + lad.width - gameState.camera.x, lad.top);
        ctx.lineTo(lad.x + lad.width - gameState.camera.x, lad.bottom);
        ctx.stroke();
        ctx.lineWidth = 2;
        for (let y = lad.top + 8; y < lad.bottom; y += 16) {
            ctx.beginPath();
            ctx.moveTo(lad.x - gameState.camera.x, y);
            ctx.lineTo(lad.x + lad.width - gameState.camera.x, y);
            ctx.stroke();
        }
        ctx.restore();
    });
} 

function drawLives() {
    const livesDiv = document.getElementById('lives');
    if (!livesDiv) return;
    
    // 게임이 시작되지 않았으면 생명을 표시하지 않음
    if (!gameStarted) {
        livesDiv.innerHTML = '';
        return;
    }
    
    livesDiv.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.style.display = 'inline-block';
        heart.style.width = '28px';
        heart.style.height = '28px';
        heart.style.marginRight = '2px';
        heart.style.verticalAlign = 'middle';
        heart.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 25s-8-5.7-8-11.3C6 8.2 9.2 6 12 6c1.7 0 2.9 1.2 2 2.2C15.1 7.2 16.3 6 18 6c2.8 0 6 2.2 6 7.7C22 19.3 14 25 14 25z" fill="${i < gameState.lives ? '#e25555' : '#eee'}" stroke="#b22" stroke-width="1.5"/></svg>`;
        livesDiv.appendChild(heart);
    }
} 

function drawTreasureChest() {
    if (!treasureChest || treasureChest.opened) return;
    ctx.save();
    ctx.translate(treasureChest.x - gameState.camera.x + treasureChest.width/2, treasureChest.y + treasureChest.height/2);
    // 상자 몸통
    ctx.fillStyle = '#c97a3a';
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.strokeRect(-16, -16, 32, 32);
    // 뚜껑
    ctx.fillStyle = '#e0a96d';
    ctx.fillRect(-16, -16, 32, 10);
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -16, 32, 10);
    // 자물쇠
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
} 

// 방패(공책) 상태를 별도 관리
// 보물상자 획득 시 shieldActive = true;
function updateTreasureChest() {
    if (!treasureChest || treasureChest.opened) return;
    if (checkCollision(player, treasureChest)) {
        treasureChest.opened = true;
        shieldActive = true;
        player.invulnerable = true;
        player.invulnerableTime = 120;
        if (typeof playSound === 'function') playSound('collect');
                    showTempMessage('📓 방패 획득!', 1200);
    }
} 

// 모바일 가상 키보드 버튼 이벤트
function setupMobileControls() {
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnJump = document.getElementById('btnJump');
    const btnAttack = document.getElementById('btnAttack');
    
    if (!btnLeft || !btnRight || !btnJump) return;
    
    // 왼쪽 버튼
    btnLeft.addEventListener('touchstart', e => { e.preventDefault(); gameState.keys['arrowleft'] = true; });
    btnLeft.addEventListener('touchend', e => { e.preventDefault(); gameState.keys['arrowleft'] = false; });
    btnLeft.addEventListener('touchcancel', e => { e.preventDefault(); gameState.keys['arrowleft'] = false; });
    
    // 오른쪽 버튼
    btnRight.addEventListener('touchstart', e => { e.preventDefault(); gameState.keys['arrowright'] = true; });
    btnRight.addEventListener('touchend', e => { e.preventDefault(); gameState.keys['arrowright'] = false; });
    btnRight.addEventListener('touchcancel', e => { e.preventDefault(); gameState.keys['arrowright'] = false; });
    
    // 점프 버튼
    btnJump.addEventListener('touchstart', e => { 
        e.preventDefault(); 
        if (!jumpPressed) {
            jumpPressed = true;
        }
    });
    btnJump.addEventListener('touchend', e => { 
        e.preventDefault(); 
        jumpPressed = false; 
    });
    btnJump.addEventListener('touchcancel', e => { 
        e.preventDefault(); 
        jumpPressed = false; 
    });
    
    // 공격 버튼
    if (btnAttack) {
        btnAttack.addEventListener('touchstart', e => { 
            e.preventDefault(); 
            if (player.attackCooldown <= 0) {
                player.isAttacking = true;
                player.attackTimer = 10;
                player.attackCooldown = 30;
            }
        });
    }
    
    // 모바일에서 스크롤 방지
    document.addEventListener('touchmove', e => {
        if (e.target.closest('#gameContainer')) {
            e.preventDefault();
        }
    }, { passive: false });
}
window.addEventListener('DOMContentLoaded', setupMobileControls);

// 진행 바 UI 추가
function updateProgressBar() {
    let bar = document.getElementById('progressBar');
    if (!bar) return;
    const total = stage.jamos.length;
    const collected = gameState.collectedJamos.length;
    const percent = total > 0 ? Math.min(100, Math.round(collected / total * 100)) : 0;
    bar.style.width = percent + '%';
}

// 진행 바 DOM 추가 (index.html에 <div id="progressBarContainer"><div id="progressBar"></div></div> 필요)
window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('progressBarContainer')) {
        const barWrap = document.createElement('div');
        barWrap.id = 'progressBarContainer';
        const bar = document.createElement('div');
        bar.id = 'progressBar';
        barWrap.appendChild(bar);
        document.getElementById('gameContainer').appendChild(barWrap);
    }
});

// 중복된 updateJamos 함수 제거

// 스테이지 시작 시 진행 바 초기화
function startStage(idx) {
    wordRepeatCount = 0;
    const stageData = STAGE_WORDS[idx % STAGE_WORDS.length];
    stage.index = idx;
    stage.word = stageData.word;
    stage.hint = stageData.hint;
    stage.jamos = splitHangul(stage.word);
    platforms = generatePlatforms(idx);
    spawnEnemies(idx, 0);
    spawnJamos();
    gameState.collectedJamos = [];
    player.x = 100;
    player.y = getGroundY() - player.height - 10;
    player.velocityX = 0;
    player.velocityY = 0;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    // 보물상자: 항상 x=600, 바닥 위에 고정
    treasureChest = { x: 600, y: getGroundY() - 32, width: 32, height: 32, opened: false };
    // 디버깅 출력
    console.log('플랫폼:', platforms);
    console.log('플레이어:', player);
    console.log('적:', enemies);
    stageHintElement.textContent = `힌트: ${stage.hint}`;
    stageHintElement.style.display = 'block';
    updateSketchbook();
} 

// 게임 초기화 및 시작
window.addEventListener('DOMContentLoaded', () => {
    // 저장된 단어 데이터 로드
    loadWordsFromStorage();
    
    // 단어 관리 UI 이벤트 핸들러
    const manageWordsBtn = document.getElementById('manageWordsBtn');
    const addWordBtn = document.getElementById('addWordBtn');
    const wordInputUI = document.getElementById('wordInputUI');
    const addWordBtnInUI = document.getElementById('addWordBtnInUI');
    const closeWordInputBtn = document.getElementById('closeWordInputBtn');
    const wordInput = document.getElementById('wordInput');
    const hintInput = document.getElementById('hintInput');
    
    // 단어 추가 버튼 클릭 (상단 버튼)
    addWordBtn.addEventListener('click', () => {
        wordInputUI.style.display = wordInputUI.style.display === 'none' ? 'block' : 'none';
    });
    
    // 단어 관리 버튼 클릭
    manageWordsBtn.addEventListener('click', () => {
        const wordListUI = document.getElementById('wordListUI');
        const closeWordListBtn = document.getElementById('closeWordListBtn');
        
        // 단어 목록 표시
        displayWordList();
        wordListUI.style.display = wordListUI.style.display === 'none' ? 'block' : 'none';
        
        // 단어 목록 닫기 버튼
        closeWordListBtn.addEventListener('click', () => {
            wordListUI.style.display = 'none';
        });
    });
    
    // 단어 추가 버튼 클릭 (UI 내부 버튼)
    addWordBtnInUI.addEventListener('click', () => {
        const word = wordInput.value;
        const hint = hintInput.value;
        
        if (addWord(word, hint)) {
            wordInput.value = '';
            hintInput.value = '';
            showTempMessage('단어가 추가되었습니다!', 2000);
            // 단어 목록 업데이트
            displayWordList();
        } else {
            showTempMessage('단어와 힌트를 모두 입력해주세요.', 2000);
        }
    });
    
    // 닫기 버튼 클릭
    closeWordInputBtn.addEventListener('click', () => {
        wordInputUI.style.display = 'none';
        wordInput.value = '';
        hintInput.value = '';
    });
    
    // Enter 키로 단어 추가
    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addWordBtnInUI.click();
        }
    });
    
    hintInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addWordBtnInUI.click();
        }
    });
    
    // 게임 루프 시작
    gameLoop();
});

// --- 스케치북 UI ---
function drawSketchbook() {
    const jamos = gameState.collectedJamos;
    const centerX = canvas.width / 2;
    const y = 50;
    // 스케치북 배경
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(centerX - 90, y - 28, 180, 56, 18);
    ctx.fill();
    ctx.stroke();
    // 스프링
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(centerX - 60 + i*20, y - 28, 6, Math.PI, 0);
        ctx.stroke();
    }
    // 글자
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 28px "Nanum Pen Script", "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(jamos.join(' '), centerX, y);
    ctx.restore();
}

// ... 기존 gameLoop 내 drawLives(); 아래에 추가 ...
drawSketchbook();