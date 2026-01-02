
export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  school?: string; // 학교명
  grade?: string;  // 학년
  phone?: string;  // 선생님용 전화번호
}

export enum AssignmentType {
  VOCABULARY = 'VOCABULARY',
  TRANSLATION = 'TRANSLATION',
  CLOZE = 'CLOZE'
}

export interface WordPair {
  word: string;
  meaning: string;
}

export interface TranslationPair {
  source: string;
  target: string;
  direction: 'en-to-ko' | 'ko-to-en';
}

export interface Textbook {
  id: string;
  title: string;
  description: string;
  assignedTo: string[]; // 교재 단위로 학생에게 배정
  createdAt: string;
}

export interface Assignment {
  id: string;
  textbookId: string; // 소속 교재 ID
  title: string;
  description: string;
  type: AssignmentType;
  testDirection?: 'en-to-ko' | 'ko-to-en'; // 단어/해석 시험 방향
  isShuffled?: boolean; // 문장 순서 섞기 여부
  sentences?: TranslationPair[];
  vocabulary?: WordPair[];
  clozeSentences?: TranslationPair[]; // 빈칸 문제용 (source: 한글, target: 영어(괄호포함))
  order: number; // 교재 내 순서
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string; // JSON string of answers
  submittedAt: string;
  feedback?: string;
  grade?: string;
  correctedAnswers?: string[]; // Teacher's corrections
}
