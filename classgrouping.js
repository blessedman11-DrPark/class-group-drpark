// Supabase 설정
const SUPABASE_URL = 'https://ikazynxmkdqmzresahoe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrYXp5bnhta2RxbXpyZXNhaG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTcyMTAsImV4cCI6MjA4NTMzMzIxMH0.cnRxbkCCtRn1Q4g29DxUjEoYS8sYAEAECvlDBM8Gzt4';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 상태 변수
let isAdmin = false;
let currentSubjectId = null;
let subjects = [];
let students = [];
let groupAssignments = [];

// 현재 로그인에 사용된 암호 (암호 수정 시 필요)
let currentAdminPassword = null;

// 조 전체보기 상태
let isShowingAll = false;
let currentGroupMap = {};
let pendingSubjectId = null;

// HTML 이스케이프 함수 (XSS 방지)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
});

// 과목 로드
async function loadSubjects() {
    const { data, error } = await db
        .from('subjects')
        .select('*')
        .order('id');

    if (error) {
        console.error('과목 로드 에러:', error);
        return;
    }

    subjects = data;
    renderSubjectButtons();
    renderSubjectEditList();
    renderSubjectPasswordList();
}

// 과목 버튼 렌더링
function renderSubjectButtons() {
    const container = document.getElementById('subjectButtons');
    container.innerHTML = subjects.map(subject => `
        <button class="subject-btn ${currentSubjectId === subject.id ? 'active' : ''}"
                onclick="selectSubject(${subject.id})">
            ${escapeHtml(subject.name)}
        </button>
    `).join('');
}

// 과목명 편집 리스트 렌더링
function renderSubjectEditList() {
    const container = document.getElementById('subjectEditList');
    container.innerHTML = `
        <div class="subject-edit-row">
            ${subjects.map(subject => `
                <input type="text" id="subject-name-${subject.id}" value="${escapeHtml(subject.name)}">
            `).join('')}
        </div>
    `;
}

// 과목별 암호 편집 리스트 렌더링
function renderSubjectPasswordList() {
    const container = document.getElementById('subjectPasswordList');
    container.innerHTML = `
        <div class="subject-edit-row" style="flex-wrap: wrap;">
            ${subjects.map(subject => `
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                    <span style="font-size: 14px; color: #333; min-width: 80px; font-weight: bold;">${escapeHtml(subject.name)}</span>
                    <input type="text" id="subject-pw-${subject.id}" value="${escapeHtml(subject.password || '')}" placeholder="암호" style="width: 100px;">
                </div>
            `).join('')}
        </div>
    `;
}

// 과목별 암호 저장
async function saveSubjectPasswords() {
    for (const subject of subjects) {
        const input = document.getElementById(`subject-pw-${subject.id}`);
        if (input) {
            const newPassword = input.value.trim();
            if (newPassword !== (subject.password || '')) {
                await db
                    .from('subjects')
                    .update({ password: newPassword })
                    .eq('id', subject.id);
                subject.password = newPassword;
            }
        }
    }
    alert('과목별 암호가 저장되었습니다.');
}

// 과목 암호 확인 모달 표시
function showSubjectPasswordModal(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    pendingSubjectId = subjectId;
    document.getElementById('subjectPasswordTitle').textContent = `${subject.name} 암호 입력`;
    document.getElementById('subjectPasswordModal').classList.add('show');
    document.getElementById('subjectPasswordInput').focus();
    document.getElementById('subjectPasswordError').textContent = '';
}

function hideSubjectPasswordModal() {
    document.getElementById('subjectPasswordModal').classList.remove('show');
    document.getElementById('subjectPasswordInput').value = '';
    document.getElementById('subjectPasswordError').textContent = '';
    document.getElementById('subjectPasswordRetryBtn').style.display = 'none';
    document.getElementById('subjectPasswordCancelBtn').style.display = 'inline-block';
    pendingSubjectId = null;
}

async function verifySubjectPassword() {
    if (!pendingSubjectId) return;

    const subject = subjects.find(s => s.id === pendingSubjectId);
    const inputPassword = document.getElementById('subjectPasswordInput').value;

    if (inputPassword === (subject.password || '')) {
        const subjectIdToSelect = pendingSubjectId;
        hideSubjectPasswordModal();
        await doSelectSubject(subjectIdToSelect);
    } else {
        document.getElementById('subjectPasswordError').textContent = '암호가 틀렸습니다.';
        document.getElementById('subjectPasswordCancelBtn').style.display = 'none';
        document.getElementById('subjectPasswordRetryBtn').style.display = 'inline-block';
    }
}

// 과목 암호 재시도
function retrySubjectPassword() {
    document.getElementById('subjectPasswordInput').value = '';
    document.getElementById('subjectPasswordInput').focus();
    document.getElementById('subjectPasswordError').textContent = '';
    document.getElementById('subjectPasswordRetryBtn').style.display = 'none';
    document.getElementById('subjectPasswordCancelBtn').style.display = 'inline-block';
}

// 과목 선택 (버튼 클릭 시)
async function selectSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);

    // 관리자이거나 암호가 없는 경우 바로 선택
    if (isAdmin || !subject.password || subject.password === '') {
        await doSelectSubject(subjectId);
    } else {
        // 암호 확인 모달 표시
        showSubjectPasswordModal(subjectId);
    }
}

// 실제 과목 선택 처리
async function doSelectSubject(subjectId) {
    currentSubjectId = subjectId;
    renderSubjectButtons();

    // 현재 선택된 과목명 표시 및 조당 인원수 불러오기
    const selectedSubject = subjects.find(s => s.id === subjectId);
    if (selectedSubject) {
        document.getElementById('currentSubjectName').textContent = `- ${selectedSubject.name}`;
        document.getElementById('groupSize').value = selectedSubject.group_size || 4;
    }

    await loadStudents();
    await loadGroupAssignments();
    renderCards();
}

// 조당 인원수 저장
async function saveGroupSize() {
    if (!currentSubjectId) return;

    const groupSize = parseInt(document.getElementById('groupSize').value);
    if (groupSize < 2 || groupSize > 10) return;

    await db
        .from('subjects')
        .update({ group_size: groupSize })
        .eq('id', currentSubjectId);

    // 로컬 데이터 업데이트
    const subject = subjects.find(s => s.id === currentSubjectId);
    if (subject) {
        subject.group_size = groupSize;
    }

    renderCards();
}

// 학생 로드
async function loadStudents() {
    if (!currentSubjectId) return;

    const { data, error } = await db
        .from('students')
        .select('*')
        .eq('subject_id', currentSubjectId)
        .order('id');

    if (error) {
        console.error('학생 로드 에러:', error);
        return;
    }

    students = data;

    // 관리자 패널의 학생 명단 텍스트 업데이트
    if (isAdmin) {
        document.getElementById('studentListText').value =
            students.map(s => s.name).join(', ');
    }
}

// 조편성 결과 로드
async function loadGroupAssignments() {
    if (!currentSubjectId) return;

    const { data, error } = await db
        .from('group_assignments')
        .select('*')
        .eq('subject_id', currentSubjectId);

    if (error) {
        console.error('조편성 로드 에러:', error);
        return;
    }

    groupAssignments = data;
}

// 카드 렌더링
function renderCards() {
    const container = document.getElementById('cardsContainer');
    const viewAllBtn = document.getElementById('viewAllBtn');
    const subjectInfo = document.getElementById('subjectInfo');
    const infoTitle = document.getElementById('infoTitle');
    const infoDetail = document.getElementById('infoDetail');

    // 과목 정보 표시
    if (currentSubjectId && students.length > 0) {
        const selectedSubject = subjects.find(s => s.id === currentSubjectId);
        const groupSize = parseInt(document.getElementById('groupSize').value) || 4;
        const isPending = groupAssignments.length === 0;

        let totalGroups, sizeRangeDisplay;

        if (isPending) {
            // 미편성 상태: 예상값 계산
            totalGroups = calculateTotalGroups(students.length, groupSize);
            sizeRangeDisplay = calculateGroupSizeRange(students.length, groupSize).display;
        } else {
            // 편성 완료: 실제 데이터 사용
            const groupNumbers = [...new Set(groupAssignments.map(a => a.group_number))];
            totalGroups = groupNumbers.length;

            // 각 조별 인원수 계산
            const groupCounts = {};
            groupAssignments.forEach(a => {
                groupCounts[a.group_number] = (groupCounts[a.group_number] || 0) + 1;
            });
            const counts = Object.values(groupCounts);
            const minSize = Math.min(...counts);
            const maxSize = Math.max(...counts);
            sizeRangeDisplay = minSize === maxSize ? `${minSize}명` : `${minSize}~${maxSize}명`;
        }

        const pendingText = isPending ? ' <span class="pending-status">(미편성, 대기중)</span>' : '';

        subjectInfo.style.display = 'block';
        infoTitle.textContent = selectedSubject ? selectedSubject.name : '';
        infoDetail.innerHTML = `전체 <span>${students.length}명</span> / ${sizeRangeDisplay}씩 <span>${totalGroups}개 조</span> 편성${pendingText}`;
    } else {
        subjectInfo.style.display = 'none';
    }

    if (students.length === 0) {
        container.innerHTML = '<p class="guide-message">등록된 학생이 없습니다.</p>';
        viewAllBtn.style.display = 'none';
        return;
    }

    container.innerHTML = students.map(student => {
        const assignment = groupAssignments.find(a => a.student_id === student.id);
        const groupNum = assignment ? assignment.group_number : '?';
        const groupClass = assignment ? `group-${((assignment.group_number - 1) % 6) + 1}` : '';

        return `
            <div class="card" onclick="flipCard(this)">
                <div class="card-inner">
                    <div class="card-front">${escapeHtml(student.name)}</div>
                    <div class="card-back ${groupClass}">${groupNum}조</div>
                </div>
            </div>
        `;
    }).join('');

    viewAllBtn.style.display = groupAssignments.length > 0 ? 'block' : 'none';
}

// 카드 뒤집기
function flipCard(card) {
    card.classList.add('flipped');
    setTimeout(() => {
        card.classList.remove('flipped');
    }, 2000);
}

// 로그인 모달 표시
function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('passwordInput').focus();
    document.getElementById('loginError').textContent = '';
}

// 로그인 모달 숨김
function hideLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginRetryBtn').style.display = 'none';
    document.getElementById('loginCancelBtn').style.display = 'inline-block';
}

// 로그인 (RPC 함수를 통한 서버 측 검증)
async function login() {
    const password = document.getElementById('passwordInput').value;

    // 서버에서 암호 검증 (RPC 함수 호출)
    const { data, error } = await db.rpc('verify_admin_password', {
        input_password: password
    });

    if (error) {
        console.error('로그인 에러:', error);
        document.getElementById('loginError').textContent = '서버 오류가 발생했습니다.';
        return;
    }

    if (data === true) {
        isAdmin = true;
        currentAdminPassword = password; // 암호 수정 시 사용
        hideLoginModal();
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminLoginBtn').style.display = 'none';
        document.getElementById('adminLogoutBtn').style.display = 'inline-block';

        // 현재 선택된 과목의 학생 명단 표시
        if (currentSubjectId) {
            document.getElementById('studentListText').value =
                students.map(s => s.name).join(', ');
        }

        // 암호 입력란 초기화 (보안상 현재 암호 표시 안함)
        document.getElementById('adminPw1').value = '';
        document.getElementById('adminPw2').value = '';
    } else {
        document.getElementById('loginError').textContent = '암호가 틀렸습니다.';
        document.getElementById('loginCancelBtn').style.display = 'none';
        document.getElementById('loginRetryBtn').style.display = 'inline-block';
    }
}

// 로그인 재시도
function retryLogin() {
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginRetryBtn').style.display = 'none';
    document.getElementById('loginCancelBtn').style.display = 'inline-block';
}

// 홈페이지로 이동 (새로고침)
function goHome() {
    window.location.reload();
}

// 학생 명단 저장
async function saveStudentList() {
    if (!currentSubjectId) {
        alert('먼저 과목을 선택해주세요.');
        return;
    }

    const text = document.getElementById('studentListText').value;
    const names = text.split(',')
        .map(name => name.trim().replace(/^["']|["']$/g, '').trim())
        .filter(name => name.length > 0);

    if (names.length === 0) {
        alert('학생 이름을 입력해주세요.');
        return;
    }

    // 기존 학생 삭제
    await db
        .from('group_assignments')
        .delete()
        .eq('subject_id', currentSubjectId);

    await db
        .from('students')
        .delete()
        .eq('subject_id', currentSubjectId);

    // 새 학생 추가
    const newStudents = names.map(name => ({
        subject_id: currentSubjectId,
        name: name
    }));

    const { error } = await db
        .from('students')
        .insert(newStudents);

    if (error) {
        console.error('학생 저장 에러:', error);
        alert('저장 중 오류가 발생했습니다.');
        return;
    }

    alert('학생 명단이 저장되었습니다.');
    await loadStudents();
    await loadGroupAssignments();
    renderCards();
}

// 과목명 저장
async function saveSubjectNames() {
    for (const subject of subjects) {
        const input = document.getElementById(`subject-name-${subject.id}`);
        if (input && input.value !== subject.name) {
            await db
                .from('subjects')
                .update({ name: input.value })
                .eq('id', subject.id);
        }
    }

    alert('과목명이 저장되었습니다.');
    await loadSubjects();
}

// 남은 인원으로 새 조를 만들 기준 (조당 인원별 최소 인원)
function getNewGroupThreshold(groupSize) {
    const thresholds = { 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6 };
    return thresholds[groupSize] || Math.ceil(groupSize * 0.6);
}

// 조 개수 계산 함수
function calculateTotalGroups(studentCount, groupSize) {
    if (studentCount === 0) return 0;

    const threshold = getNewGroupThreshold(groupSize);
    const baseGroups = Math.floor(studentCount / groupSize);
    const remainder = studentCount % groupSize;

    if (remainder === 0) {
        return baseGroups;
    } else if (remainder >= threshold) {
        return baseGroups + 1;
    } else {
        return baseGroups === 0 ? 1 : baseGroups;
    }
}

// 조별 인원 범위 계산 함수 (예: "3명" 또는 "3~4명")
function calculateGroupSizeRange(studentCount, groupSize) {
    if (studentCount === 0) return { min: 0, max: 0, display: '0명' };

    const threshold = getNewGroupThreshold(groupSize);
    const baseGroups = Math.floor(studentCount / groupSize);
    const remainder = studentCount % groupSize;

    let minSize, maxSize;

    if (remainder === 0) {
        minSize = groupSize;
        maxSize = groupSize;
    } else if (remainder >= threshold) {
        minSize = remainder;
        maxSize = groupSize;
    } else {
        const totalGroups = baseGroups === 0 ? 1 : baseGroups;
        const studentsPerGroup = Math.floor(studentCount / totalGroups);
        const extraStudents = studentCount % totalGroups;

        if (extraStudents === 0) {
            minSize = studentsPerGroup;
            maxSize = studentsPerGroup;
        } else {
            minSize = studentsPerGroup;
            maxSize = studentsPerGroup + 1;
        }
    }

    const display = minSize === maxSize ? `${minSize}명` : `${minSize}~${maxSize}명`;
    return { min: minSize, max: maxSize, display };
}

// 조편성 실행
async function assignGroups() {
    if (!currentSubjectId) {
        alert('먼저 과목을 선택해주세요.');
        return;
    }

    if (students.length === 0) {
        alert('학생이 없습니다. 먼저 학생 명단을 등록해주세요.');
        return;
    }

    const groupSize = parseInt(document.getElementById('groupSize').value);
    if (groupSize < 2 || groupSize > 10) {
        alert('조당 인원수는 2~10명 사이로 설정해주세요.');
        return;
    }

    // 기존 조편성 삭제
    await db
        .from('group_assignments')
        .delete()
        .eq('subject_id', currentSubjectId);

    // 학생 섞기 (Fisher-Yates 알고리즘)
    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 조 편성 계산
    const threshold = getNewGroupThreshold(groupSize);
    const baseGroups = Math.floor(shuffled.length / groupSize);
    const remainder = shuffled.length % groupSize;

    let totalGroups;
    let assignments;

    if (remainder === 0) {
        totalGroups = baseGroups;
        assignments = shuffled.map((student, index) => ({
            subject_id: currentSubjectId,
            student_id: student.id,
            group_number: Math.floor(index / groupSize) + 1
        }));
    } else if (remainder >= threshold) {
        totalGroups = baseGroups + 1;
        assignments = shuffled.map((student, index) => {
            let groupNumber;
            if (index < baseGroups * groupSize) {
                groupNumber = Math.floor(index / groupSize) + 1;
            } else {
                groupNumber = totalGroups;
            }
            return {
                subject_id: currentSubjectId,
                student_id: student.id,
                group_number: groupNumber
            };
        });
    } else {
        totalGroups = baseGroups === 0 ? 1 : baseGroups;
        const studentsPerGroup = Math.floor(shuffled.length / totalGroups);
        const extraStudents = shuffled.length % totalGroups;
        const normalSlots = (totalGroups - extraStudents) * studentsPerGroup;

        assignments = shuffled.map((student, index) => {
            let groupNumber;
            if (index < normalSlots) {
                groupNumber = Math.floor(index / studentsPerGroup) + 1;
            } else {
                const adjustedIndex = index - normalSlots;
                groupNumber = (totalGroups - extraStudents) + Math.floor(adjustedIndex / (studentsPerGroup + 1)) + 1;
            }
            return {
                subject_id: currentSubjectId,
                student_id: student.id,
                group_number: groupNumber
            };
        });
    }

    const { error } = await db
        .from('group_assignments')
        .insert(assignments);

    if (error) {
        console.error('조편성 에러:', error);
        alert('조편성 중 오류가 발생했습니다.');
        return;
    }

    alert(`조편성이 완료되었습니다. (총 ${totalGroups}개 조)`);
    await loadGroupAssignments();
    renderCards();
}

// 조편성 초기화
async function resetGroups() {
    if (!currentSubjectId) {
        alert('먼저 과목을 선택해주세요.');
        return;
    }

    if (!confirm('조편성을 초기화하시겠습니까?')) {
        return;
    }

    await db
        .from('group_assignments')
        .delete()
        .eq('subject_id', currentSubjectId);

    alert('조편성이 초기화되었습니다.');
    await loadGroupAssignments();
    renderCards();
}

// 전체보기 모달 표시
function showAllGroups() {
    currentGroupMap = {};

    for (const assignment of groupAssignments) {
        const student = students.find(s => s.id === assignment.student_id);
        if (student) {
            if (!currentGroupMap[assignment.group_number]) {
                currentGroupMap[assignment.group_number] = [];
            }
            currentGroupMap[assignment.group_number].push(student.name);
        }
    }

    const groupList = document.getElementById('groupList');
    groupList.innerHTML = Object.keys(currentGroupMap)
        .sort((a, b) => a - b)
        .map(groupNum => `
            <div class="group-card" onclick="flipGroupCard(this)">
                <div class="group-card-inner">
                    <div class="group-card-front">${groupNum}조</div>
                    <div class="group-card-back">
                        <h4>${groupNum}조</h4>
                        <ul>
                            ${currentGroupMap[groupNum].map(name => `<li>${escapeHtml(name)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `).join('');

    // 모달 제목에 과목명 추가
    const selectedSubject = subjects.find(s => s.id === currentSubjectId);
    const subjectName = selectedSubject ? escapeHtml(selectedSubject.name) : '';
    document.getElementById('groupModalTitle').textContent = `[${subjectName}] 조별 명단`;

    // 상태 초기화
    isShowingAll = false;
    document.getElementById('groupModal').classList.add('show');
}

// 조 카드 뒤집기
function flipGroupCard(card) {
    if (isShowingAll) return;
    card.classList.toggle('flipped');
}

// 조 전체보기
function showAllGroupsAtOnce() {
    const cards = document.querySelectorAll('#groupList .group-card');
    isShowingAll = !isShowingAll;

    cards.forEach(card => {
        card.classList.remove('flipped');
        if (isShowingAll) {
            card.classList.add('show-all');
        } else {
            card.classList.remove('show-all');
        }
    });
}

// 전체보기 모달 숨김
function hideGroupModal() {
    document.getElementById('groupModal').classList.remove('show');
}

// 조편성 원칙 모달 표시
function showRulesModal() {
    document.getElementById('rulesModal').classList.add('show');
}

// 조편성 원칙 모달 숨김
function hideRulesModal() {
    document.getElementById('rulesModal').classList.remove('show');
}

// 설정 모달 표시
function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
}

// 설정 모달 숨김
function hideSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

// 교수님 암호 저장 (RPC 함수를 통한 서버 측 처리)
async function saveAdminPasswords() {
    const pw1 = document.getElementById('adminPw1').value.trim();
    const pw2 = document.getElementById('adminPw2').value.trim();

    if (!pw1 && !pw2) {
        alert('최소 하나의 암호를 입력해주세요.');
        return;
    }

    if (!currentAdminPassword) {
        alert('현재 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        return;
    }

    let success = true;

    // 암호 1 저장
    if (pw1) {
        const { data, error } = await db.rpc('update_admin_password', {
            old_password: currentAdminPassword,
            password_idx: 1,
            new_password: pw1
        });

        if (error || data === false) {
            console.error('암호1 저장 에러:', error);
            success = false;
        }
    }

    // 암호 2 저장
    if (pw2) {
        const { data, error } = await db.rpc('update_admin_password', {
            old_password: currentAdminPassword,
            password_idx: 2,
            new_password: pw2
        });

        if (error || data === false) {
            console.error('암호2 저장 에러:', error);
            success = false;
        }
    }

    if (success) {
        // 새 암호로 현재 세션 업데이트
        if (pw1) currentAdminPassword = pw1;
        alert('교수님 암호가 저장되었습니다.');
        // 입력란 초기화
        document.getElementById('adminPw1').value = '';
        document.getElementById('adminPw2').value = '';
    } else {
        alert('암호 저장 중 오류가 발생했습니다.');
    }
}

// 모달 외부 클릭시 닫기 이벤트 등록
document.getElementById('groupModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideGroupModal();
    }
});

document.getElementById('loginModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideLoginModal();
    }
});

document.getElementById('subjectPasswordModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideSubjectPasswordModal();
    }
});

document.getElementById('rulesModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideRulesModal();
    }
});

document.getElementById('settingsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideSettingsModal();
    }
});
