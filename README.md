
# 📘 EduBridge LMS (Smart Learning Management System)

> **교사와 학생을 잇는 스마트한 학습 관리 플랫폼**  
> AI 기술(Gemini API)과 유연한 데이터 관리(Firebase + LocalStorage)를 결합한 차세대 LMS입니다.

## ✨ 주요 기능

### 👨‍🏫 교사용 (Teacher/Admin Dashboard)
- **교재 및 과제 관리**: 단어 시험, 문장 해석, 빈칸 채우기 등 다양한 형태의 과제 생성.
- **AI 자동 번역 및 문제 생성**: Google Gemini API를 활용한 영어 문장 자동 번역 및 과제 문항 지원.
- **실시간 제출 현황**: 학생별 교재 완료율 시각화 및 제출된 과제 확인.
- **스마트 첨삭**: AI가 제안하는 피드백을 기반으로 학생 답안에 점수와 의견 부여.
- **학생 관리**: 학생 계정 생성, 정보 수정 및 학교/학년별 필터링 기능.

### ✍️ 학생용 (Student Dashboard)
- **자기주도 학습**: 배정된 교재 내 과제를 순서대로 풀이.
- **다양한 과제 모드**: 단어(영-한/한-영), 문장 해석, 실시간 빈칸 입력(Cloze Test).
- **즉각적인 결과 확인**: 자동 채점 시스템을 통해 시험 종료 후 즉시 점수 및 피드백 확인.
- **학습 이력 관리**: 완료된 과제와 선생님의 첨삭 내용을 언제든지 재확인.

## 🛠 기술 스택
- **Frontend**: React (v19), TypeScript, Tailwind CSS
- **Backend/DB**: Firebase (Firestore, Auth)
- **AI Engine**: Google Gemini API (gemini-3-flash)
- **Persistence**: Resilient Data Layer (Firebase ↔ LocalStorage Fallback)

## 🚀 시작하기

1. **저장소 복제**
   ```bash
   git clone https://github.com/your-username/edubridge-lms.git
   cd edubridge-lms
   ```

2. **환경 변수 설정**
   - `.env` 파일을 생성하고 다음 정보를 입력합니다.
   ```env
   API_KEY=your_gemini_api_key
   ```

3. **Firebase 연동 (선택 사항)**
   - `services/firebase.ts` 파일의 `firebaseConfig`를 본인의 Firebase 프로젝트 설정값으로 교체합니다.
   - 설정을 하지 않으면 자동으로 **LocalStorage 모드**로 작동합니다.

## 🔐 보안 및 데이터 정책
- 본 프로젝트는 Firebase API 키가 노출되지 않도록 환경 변수 관리를 권장합니다.
- 오프라인 환경에서도 작동할 수 있도록 하이브리드 데이터 레이어가 구현되어 있습니다.

---
Developed with ❤️ by EduBridge Team
