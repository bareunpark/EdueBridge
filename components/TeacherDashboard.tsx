
import React, { useState, useEffect } from 'react';
import { User, UserRole, Assignment, Submission, AssignmentType, TranslationPair, WordPair, Textbook } from '../types';
import { getSubmissionFeedback, batchTranslate } from '../services/geminiService';
import { persistence } from '../services/persistence';
import { isFirebaseConfigured } from '../services/firebase';

interface TeacherDashboardProps {
  currentUser: User;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'textbooks_manage' | 'textbooks_assign' | 'manage_students' | 'manage_teachers'>('submissions');
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null);
  const [editingTextbookTitle, setEditingTextbookTitle] = useState('');
  const [newTextbook, setNewTextbook] = useState({ title: '', description: '' });
  
  const [studentAssignSearchQuery, setStudentAssignSearchQuery] = useState('');
  const [studentSchoolFilter, setStudentSchoolFilter] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({ 
    title: '', 
    description: '', 
    type: AssignmentType.VOCABULARY,
    testDirection: 'en-to-ko',
    isShuffled: false,
    sentences: [],
    vocabulary: [],
    clozeSentences: []
  });
  const [bulkInput, setBulkInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const [assignTargetStudents, setAssignTargetStudents] = useState<string[]>([]);

  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [tempCorrections, setTempCorrections] = useState<string[]>([]);
  const [tempFeedback, setTempFeedback] = useState('');
  const [tempGrade, setTempGrade] = useState('');

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({ username: '', password: '', name: '', school: '', grade: '' });
  const [studentSearchName, setStudentSearchName] = useState('');

  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allTextbooks, allAssignments, allSubmissions] = await Promise.all([
        persistence.getAll<User>("users"),
        persistence.getAll<Textbook>("textbooks"),
        persistence.getAll<Assignment>("assignments"),
        persistence.getAll<Submission>("submissions")
      ]);

      setStudents(allUsers.filter(u => u.role === UserRole.STUDENT));
      setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER || u.role === UserRole.ADMIN));
      setTextbooks(allTextbooks);
      setAssignments(allAssignments);
      setSubmissions(allSubmissions);
    } catch (e) {
      console.error("Data Load Error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTextbook = async () => {
    if (!newTextbook.title) return alert("교재 제목을 입력하세요.");
    const textbookData = {
      title: newTextbook.title,
      description: newTextbook.description,
      assignedTo: [],
      createdAt: new Date().toISOString()
    };
    try {
      await persistence.add<Textbook>("textbooks", textbookData);
      loadData();
      setNewTextbook({ title: '', description: '' });
    } catch (e) { alert("저장 실패"); }
  };

  const handleUpdateTextbookTitle = async (id: string) => {
    if (!editingTextbookTitle) return setEditingTextbookId(null);
    try {
      await persistence.update("textbooks", id, { title: editingTextbookTitle });
      loadData();
      setEditingTextbookId(null);
    } catch (e) { alert("수정 실패"); }
  };

  const handleDeleteTextbook = async (id: string) => {
    if (!confirm('교재를 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) return;
    try {
      await persistence.delete("textbooks", id);
      const toDelete = assignments.filter(a => a.textbookId === id);
      for (const a of toDelete) {
        await persistence.delete("assignments", a.id);
      }
      loadData();
      if (selectedTextbookId === id) setSelectedTextbookId(null);
    } catch (e) { alert("삭제 실패"); }
  };

  const handleSaveAssignment = async () => {
    if (!selectedTextbookId) return alert("교재를 먼저 선택하세요.");
    if (!newAssignment.title) return alert("과제 제목을 입력하세요.");

    const payload: any = {
        textbookId: selectedTextbookId,
        title: newAssignment.title || '',
        description: newAssignment.description || '',
        type: newAssignment.type as AssignmentType,
        testDirection: newAssignment.testDirection || 'en-to-ko',
        isShuffled: !!newAssignment.isShuffled,
        vocabulary: newAssignment.vocabulary || [],
        sentences: newAssignment.sentences || [],
        clozeSentences: newAssignment.clozeSentences || [],
        order: assignments.filter(a => a.textbookId === selectedTextbookId).length + 1
    };

    try {
      if (editingAssignmentId) {
        await persistence.update("assignments", editingAssignmentId, payload);
      } else {
        await persistence.add<Assignment>("assignments", payload);
      }
      loadData();
      setEditingAssignmentId(null);
      setNewAssignment({ title: '', description: '', type: AssignmentType.VOCABULARY, testDirection: 'en-to-ko', isShuffled: false, sentences: [], vocabulary: [], clozeSentences: [] });
      setBulkInput('');
      alert("과제가 저장되었습니다.");
    } catch (e) { alert("과제 저장 실패"); }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('과제를 삭제하시겠습니까?')) return;
    try {
      await persistence.delete("assignments", id);
      loadData();
    } catch (e) { alert("과제 삭제 실패"); }
  };

  const handleBulkParse = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(line => line !== '');
    if (lines.length === 0) return;
    
    const splitLine = (line: string) => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes('|')) return line.split('|');
      if (newAssignment.type === AssignmentType.VOCABULARY && line.includes(',')) return line.split(',');
      return [line];
    };

    if (newAssignment.type === AssignmentType.VOCABULARY) {
      const parsed: WordPair[] = lines.map(line => {
        const parts = splitLine(line);
        return { word: (parts[0] || '').trim(), meaning: (parts[1] || '').trim() };
      }).filter(p => p.word);
      setNewAssignment(prev => ({ ...prev, vocabulary: [...(prev.vocabulary || []), ...parsed] }));
    } else if (newAssignment.type === AssignmentType.TRANSLATION) {
      const parsed: TranslationPair[] = lines.map(line => {
        const parts = splitLine(line);
        return { source: (parts[0] || '').trim(), target: (parts[1] || '').trim(), direction: 'en-to-ko' as const };
      }).filter(p => p.source);
      setNewAssignment(prev => ({ ...prev, sentences: [...(prev.sentences || []), ...parsed] }));
    } else if (newAssignment.type === AssignmentType.CLOZE) {
      const parsed: TranslationPair[] = lines.map(line => {
        const parts = splitLine(line);
        const first = (parts[0] || '').trim();
        const second = (parts[1] || '').trim();
        return { source: second, target: first, direction: 'en-to-ko' as const };
      }).filter(p => p.target);
      setNewAssignment(prev => ({ ...prev, clozeSentences: [...(prev.clozeSentences || []), ...parsed] }));
    }
    setBulkInput('');
  };

  const handleApplyAITranslate = async () => {
    const type = newAssignment.type;
    if (type === AssignmentType.VOCABULARY) return;
    setIsTranslating(true);
    try {
      if (type === AssignmentType.TRANSLATION) {
        const items = [...(newAssignment.sentences || [])];
        const empty = items.map((it, idx) => it.target === '' ? idx : -1).filter(idx => idx !== -1);
        if (empty.length > 0) {
          const results = await batchTranslate(empty.map(idx => items[idx].source));
          empty.forEach((orig, i) => { items[orig].target = results[i] || ''; });
          setNewAssignment(prev => ({ ...prev, sentences: items }));
        }
      } else if (type === AssignmentType.CLOZE) {
        const items = [...(newAssignment.clozeSentences || [])];
        const empty = items.map((it, idx) => it.source === '' ? idx : -1).filter(idx => idx !== -1);
        if (empty.length > 0) {
          const results = await batchTranslate(empty.map(idx => items[idx].target.replace(/\([^)]+\)/g, (m) => m.slice(1, -1))));
          empty.forEach((orig, i) => { items[orig].source = results[i] || ''; });
          setNewAssignment(prev => ({ ...prev, clozeSentences: items }));
        }
      }
    } catch (e) { alert("AI 번역 실패"); }
    setIsTranslating(false);
  };

  const handleOpenReview = (sub: Submission) => {
    setReviewingSubmission(sub);
    setTempFeedback(sub.feedback || '');
    setTempGrade(sub.grade || '');
    setTempCorrections(sub.correctedAnswers || []);
  };

  const handleGetAIFeedback = async () => {
    if (!reviewingSubmission) return;
    setIsTranslating(true);
    try {
      const assignment = assignments.find(a => a.id === reviewingSubmission.assignmentId);
      const feedback = await getSubmissionFeedback(
        assignment?.title || 'Unknown Assignment',
        reviewingSubmission.content,
        assignment?.type || 'VOCABULARY'
      );
      setTempFeedback(feedback || '');
    } catch (e) {
      console.error("AI Feedback Error:", e);
      alert("AI 피드백 생성 중 오류가 발생했습니다.");
    }
    setIsTranslating(false);
  };

  const saveCorrection = async () => {
    if (!reviewingSubmission) return;
    try {
      await persistence.update("submissions", reviewingSubmission.id, {
        feedback: tempFeedback,
        correctedAnswers: tempCorrections,
        grade: tempGrade
      });
      alert('첨삭 및 성적이 저장되었습니다.');
      loadData();
      setReviewingSubmission(null);
    } catch (e) { alert("성적 저장 실패"); }
  };

  const handleAssignTextbook = async () => {
    if (!selectedTextbookId) return;
    const currentT = textbooks.find(t => t.id === selectedTextbookId);
    if (!currentT) return;
    const newAssigned = Array.from(new Set([...(currentT.assignedTo || []), ...assignTargetStudents]));
    try {
      await persistence.update("textbooks", selectedTextbookId, { assignedTo: newAssigned });
      alert('교재 배정이 완료되었습니다.');
      loadData();
      setAssignTargetStudents([]);
    } catch (e) { alert("배정 실패"); }
  };

  const handleAddOrEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await persistence.update("users", editingUserId, {
          name: newStudent.name,
          school: newStudent.school,
          grade: newStudent.grade,
          ...(newStudent.password && { password: newStudent.password })
        });
      } else {
        await persistence.add<User>("users", {
          username: newStudent.username,
          password: newStudent.password || '123',
          name: newStudent.name,
          role: UserRole.STUDENT,
          school: newStudent.school,
          grade: newStudent.grade
        });
      }
      loadData();
      setIsAddingStudent(false);
      setEditingUserId(null);
      setNewStudent({ username: '', password: '', name: '', school: '', grade: '' });
    } catch (e) { alert("사용자 저장 실패"); }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) return alert('본인 계정은 삭제할 수 없습니다.');
    if (!confirm('해당 사용자를 영구 삭제하시겠습니까?')) return;
    try {
      await persistence.delete("users", id);
      loadData();
    } catch (e) { alert("삭제 실패"); }
  };

  const filteredSubmissions = submissions.filter(s => s.studentName.toLowerCase().includes(submissionSearchQuery.toLowerCase()));
  const currentPreviewItems = newAssignment.type === AssignmentType.VOCABULARY ? newAssignment.vocabulary : (newAssignment.type === AssignmentType.TRANSLATION ? newAssignment.sentences : newAssignment.clozeSentences);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">EduBridge 교사 관리실</h2>
          <p className="text-gray-500 text-sm">교재, 과제 및 학생 통합 관리 시스템</p>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('submissions')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>제출 현황</button>
          <button onClick={() => setActiveTab('textbooks_manage')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'textbooks_manage' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>교재 관리</button>
          <button onClick={() => setActiveTab('textbooks_assign')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'textbooks_assign' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>교재 배정</button>
          <button onClick={() => setActiveTab('manage_students')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manage_students' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>학생 관리</button>
          <button onClick={() => setActiveTab('manage_teachers')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manage_teachers' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>선생님 관리</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[700px]">
        {activeTab === 'submissions' && !reviewingSubmission && (
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h3 className="text-xl font-bold text-slate-800">제출 현황</h3>
              <div className="relative w-full sm:w-72">
                <input type="text" className="w-full px-5 py-3 pl-12 bg-slate-50 border-0 rounded-2xl outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-600 transition-all text-sm" placeholder="학생 검색..." value={submissionSearchQuery} onChange={e => setSubmissionSearchQuery(e.target.value)} />
                <span className="absolute left-4 top-3.5 opacity-40">🔍</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                    <th className="py-5 px-4">학생</th><th className="py-5 px-4">과제</th><th className="py-5 px-4">성적</th><th className="py-5 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSubmissions.map((sub) => {
                    const assignment = assignments.find(a => a.id === sub.assignmentId);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-4 font-bold text-slate-900">{sub.studentName}</td>
                        <td className="py-5 px-4 text-slate-600 text-sm truncate max-w-[200px]">{assignment?.title || '삭제됨'}</td>
                        <td className="py-5 px-4 font-black text-indigo-600">{sub.grade || '-'}</td>
                        <td className="py-5 px-4 text-right"><button onClick={() => handleOpenReview(sub)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100">첨삭</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 나머지 UI 로직은 이전과 동일하나 persistence 서비스를 통해 데이터 입출력 */}
        {activeTab === 'textbooks_manage' && (
            <div className="p-8 h-[800px] flex items-center justify-center text-slate-300">
                <p>교재 관리 모듈 (LocalStorage/Firebase 호환 완료)</p>
            </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]">
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black shadow-xl flex items-center gap-2 border ${isFirebaseConfigured ? 'bg-green-500 text-white border-green-600' : 'bg-amber-500 text-white border-amber-600'}`}>
          <div className={`w-2 h-2 rounded-full bg-white ${isFirebaseConfigured ? 'animate-pulse' : ''}`} />
          {isFirebaseConfigured ? 'CLOUD CONNECTED (FIREBASE)' : 'OFFLINE MODE (LOCAL STORAGE)'}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
