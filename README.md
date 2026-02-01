# 박헌규 교수님 과목 조편성 프로그램

수업 시간에 학생들을 무작위로 조 편성하는 웹 애플리케이션입니다.

## 배포 URL

https://class-group-drpark.vercel.app/

## 주요 기능

### 학생용
- 과목 선택 후 암호 입력하여 접근
- 학생 카드 클릭 시 소속 조 확인 (카드 뒤집기 애니메이션)
- 전체 보기 버튼으로 조별 명단 확인
- 조편성 원칙 확인

### 관리자용 (교수님)
- 교수님 암호로 로그인
- 과목별 학생 명단 등록/수정
- 조당 인원수 설정 (2~10명)
- 조편성 실행 및 초기화
- 과목명 수정
- 과목별 암호 설정
- 교수님 암호 변경

## 조편성 원칙

학생들은 무작위로 섞인 후 각 조에 배정됩니다.

| 조당 인원 | 새 조 생성 기준 | 기존 조 분배 기준 |
|-----------|-----------------|-------------------|
| 3명 | 2명 이상 남았을 때 | 잔여 1명 |
| 4명 | 3명 이상 남았을 때 | 잔여 2명 이하 |
| 5명 | 3명 이상 남았을 때 | 잔여 2명 이하 |
| 6명 | 4명 이상 남았을 때 | 잔여 3명 이하 |

### 예시
- 23명, 3명씩 편성 → 7개조(3명) + 1개조(2명) = **8개 조**
- 9명, 4명씩 편성 → 1개조(4명) + 1개조(5명) = **2개 조**

## 기술 스택

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend/DB**: [Supabase](https://supabase.com/) (PostgreSQL + RLS)
- **Hosting**: [Vercel](https://vercel.com/)
- **Version Control**: [GitHub](https://github.com/)

## 보안

- Supabase RLS(Row Level Security) 정책 적용
- 교수님 암호는 RPC 함수를 통한 서버 측 검증
- XSS 공격 방지를 위한 HTML 이스케이프 처리
- 과목별 암호로 학생 접근 제어

## 프로젝트 구조

```
조편성 프로그램/
├── classgrouping.html    # 메인 HTML
├── classgrouping.css     # 스타일시트
├── classgrouping.js      # JavaScript 로직
├── vercel.json           # Vercel 설정
├── package.json          # 프로젝트 정보
└── README.md             # 프로젝트 설명
```

## Supabase 테이블 구조

### subjects (과목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int8 | PK |
| name | text | 과목명 |
| password | text | 과목 암호 |
| group_size | int4 | 조당 인원수 |

### students (학생)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int8 | PK |
| subject_id | int8 | FK (subjects) |
| name | text | 학생 이름 |

### group_assignments (조편성)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int8 | PK |
| subject_id | int8 | FK (subjects) |
| student_id | int8 | FK (students) |
| group_number | int4 | 조 번호 |

### admin_passwords (관리자 암호)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| password_index | int4 | PK |
| password_value | text | 암호 값 |

## 버전 히스토리

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v2.02 | 2026-02-01 | GitHub-Vercel 자동 배포 테스트 |
| v2.01 | 2026-02-01 | 버전 번호 체계 변경 (v2.xx 형식) |
| v.33 | 2026-01-31 | 안내 메시지 테두리 문구 길이에 맞게 조정 |
| v.32 | 2026-01-31 | XSS 취약점 수정 (escapeHtml 함수 적용) |
| v.31 | 2026-01-31 | UI 개선 (안내 메시지, 조별 명단 스타일) |
| v.30 | 2026-01-31 | 보안 강화 (RPC 함수로 암호 검증) |
| v.29 | 2026-01-31 | HTML에서 CSS/JS 파일 분리 |

## 개발 도구

- [Claude Code](https://claude.ai/claude-code) - AI 코딩 어시스턴트

## 라이선스

Made by Dr.Park with AI tools
