
import React, { useState, useEffect, useRef } from 'react';
import { User, Assignment, Submission, AssignmentType, Textbook } from '../types';
import { persistence } from '../services/persistence';

interface StudentDashboardProps {
  currentUser: User;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  
  const [shuffledItems, setShuffledItems] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [currentInput, setCurrentInput] = useState<any>('');

  const clozeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allT = await persistence.getAll<Textbook>("textbooks");
      const assignedT = allT.filter(t => (t.assignedTo || []).includes(currentUser.id));
      setTextbooks(assignedT);

      const allA = await persistence.getAll<Assignment>("assignments");
      setAssignments(allA);

      const subSnap = await persistence.queryByField<Submission>("submissions", "studentId", currentUser.id);
      setMySubmissions(subSnap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedAssignment) {
      const sub = mySubmissions.find(s => s.assignmentId === selectedAssignment.id);
      if (sub && !showResult) {
        setLastSubmission(sub);
        setShowResult(true);
      } else {
        startAssignment();
      }
    } else {
      setShuffledItems([]);
      setShowResult(false);
      setLastSubmission(null);
    }
  }, [selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment?.type === AssignmentType.CLOZE && !showResult && shuffledItems.length > 0) {
      const timer = setTimeout(() => {
        clozeInputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, selectedAssignment, showResult, shuffledItems.length]);

  const startAssignment = () => {
    if (!selectedAssignment) return;
    let items: any[] = [];
    if (selectedAssignment.type === AssignmentType.VOCABULARY) items = [...(selectedAssignment.vocabulary || [])];
    else if (selectedAssignment.type === AssignmentType.TRANSLATION) items = [...(selectedAssignment.sentences || [])];
    else if (selectedAssignment.type === AssignmentType.CLOZE) items = [...(selectedAssignment.clozeSentences || [])];
    
    if (selectedAssignment.isShuffled) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    setShuffledItems(items);
    setAnswers(new Array(items.length).fill(''));
    setCurrentIdx(0);
    initCurrentInput(items[0]);
    setShowResult(false);
  };

  const initCurrentInput = (item: any) => {
    if (selectedAssignment?.type === AssignmentType.CLOZE && item) {
      const matches = item.target.match(/\(([^)]+)\)/g);
      setCurrentInput(new Array(matches ? matches.length : 0).fill(''));
    } else {
      setCurrentInput('');
    }
  };

  const handleNext = () => {
    const updated = [...answers];
    updated[currentIdx] = currentInput;
    setAnswers(updated);
    if (currentIdx < shuffledItems.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (answers[nextIdx]) setCurrentInput(answers[nextIdx]);
      else initCurrentInput(shuffledItems[nextIdx]);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const updated = [...answers];
      updated[currentIdx] = currentInput;
      setAnswers(updated);
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      setCurrentInput(answers[prevIdx]);
    }
  };

  const calculateFinalScore = (finalAnswers: any[]) => {
    if (!selectedAssignment) return "-";
    let correctCount = 0;
    let totalPoints = 0;
    if (selectedAssignment.type === AssignmentType.VOCABULARY) {
      totalPoints = shuffledItems.length;
      shuffledItems.forEach((item, idx) => {
        const correct = selectedAssignment.testDirection === 'en-to-ko' ? item.meaning : item.word;
        if (finalAnswers[idx]?.trim().toLowerCase() === correct.trim().toLowerCase()) correctCount++;
      });
    } else if (selectedAssignment.type === AssignmentType.CLOZE) {
      shuffledItems.forEach((item, idx) => {
        const matches = item.target.match(/\(([^)]+)\)/g);
        const correctBlanks = matches ? matches.map(m => m.slice(1, -1).trim().toLowerCase()) : [];
        const studentBlanks = Array.isArray(finalAnswers[idx]) ? finalAnswers[idx].map(a => a.trim().toLowerCase()) : [finalAnswers[idx]?.trim().toLowerCase()];
        totalPoints += correctBlanks.length;
        correctBlanks.forEach((correct, bIdx) => { if (studentBlanks[bIdx] === correct) correctCount++; });
      });
    } else if (selectedAssignment.type === AssignmentType.TRANSLATION) {
      return "평가 대기";
    }
    if (totalPoints === 0) return "0점";
    return `${Math.round((correctCount / totalPoints) * 100)}점 (${correctCount}/${totalPoints})`;
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || shuffledItems.length === 0) return;
    const finalAnswers = [...answers];
    finalAnswers[currentIdx] = currentInput;
    const score = calculateFinalScore(finalAnswers);
    
    const subData = {
      assignmentId: selectedAssignment.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      content: JSON.stringify(finalAnswers), 
      submittedAt: new Date().toISOString().split('T')[0],
      grade: score
    };

    try {
      const docRef = await persistence.add<Submission>("submissions", subData);
      setLastSubmission({ id: docRef.id, ...subData });
      setShowResult(true);
      alert(`과제가 제출되었습니다.`);
      loadData();
    } catch (e) { alert("제출 실패"); }
  };

  const handleClozeInputChange = (val: string, bIdx: number) => {
    const nextInput = [...currentInput];
    nextInput[bIdx] = val;
    setCurrentInput(nextInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent, bIdx?: number) => {
    if (e.key === 'Enter') {
      if (selectedAssignment?.type === AssignmentType.CLOZE && bIdx !== undefined) {
        if (bIdx < currentInput.length - 1) {
          e.preventDefault();
          clozeInputRefs.current[bIdx + 1]?.focus();
        } else {
          currentIdx === shuffledItems.length - 1 ? handleSubmit() : handleNext();
        }
      } else {
        currentIdx === shuffledItems.length - 1 ? handleSubmit() : handleNext();
      }
    }
  };

  const renderQuestion = () => {
    const item = shuffledItems[currentIdx];
    if (!selectedAssignment || !item) return null;
    if (selectedAssignment.type === AssignmentType.VOCABULARY) {
      return <p className="text-4xl font-black text-slate-900">{selectedAssignment.testDirection === 'en-to-ko' ? item.word : item.meaning}</p>;
    } else if (selectedAssignment.type === AssignmentType.TRANSLATION) {
      return (
        <div className="space-y-6">
           <p className="text-xl text-slate-400 font-bold">해석할 문장</p>
           <p className="text-3xl font-black text-slate-900 leading-relaxed">{item.source}</p>
        </div>
      );
    } else if (selectedAssignment.type === AssignmentType.CLOZE) {
      const parts = item.target.split(/\(([^)]+)\)/g);
      let blankCount = 0;
      return (
        <div className="space-y-10">
           <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">한글 해석</p>
              <div className="p-6 bg-indigo-50 rounded-[30px] border border-indigo-100 text-indigo-800 font-bold text-xl md:text-2xl leading-relaxed shadow-sm">
                 {item.source}
              </div>
           </div>
           <div className="text-2xl md:text-3xl font-black text-slate-800 leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-4">
                {parts.map((part, i) => {
                  if (i % 2 === 1) {
                    const idxInSentence = blankCount++;
                    return (
                      <input 
                        key={i}
                        ref={el => { if (el) clozeInputRefs.current[idxInSentence] = el; }}
                        type="text" 
                        className="w-40 border-b-4 border-indigo-600 outline-none text-center bg-transparent focus:bg-indigo-50 transition-all px-2 placeholder-indigo-200"
                        placeholder="입력"
                        value={currentInput[idxInSentence] || ''}
                        onChange={e => handleClozeInputChange(e.target.value, idxInSentence)}
                        onKeyDown={e => handleKeyDown(e, idxInSentence)}
                      />
                    );
                  }
                  return <span key={i} className="py-1">{part}</span>;
                })}
           </div>
        </div>
      );
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">{currentUser.name} 학생 학습실</h2>
            <div className="flex gap-2 mt-2">
                <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-sm">{currentUser.school || '학교 정보 없음'}</span>
                <span className="bg-amber-500 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-sm">{currentUser.grade || '학년 정보 없음'}</span>
            </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">내 교재</h3>
            <div className="space-y-2">
              {textbooks.map(t => (
                <button key={t.id} onClick={() => { setSelectedTextbook(t); setSelectedAssignment(null); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedTextbook?.id === t.id ? 'border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
                  <h4 className="font-bold text-sm text-gray-900">{t.title}</h4>
                </button>
              ))}
            </div>
          </div>
          {selectedTextbook && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">과제 리스트</h3>
              <div className="space-y-2">
                {assignments.filter(a => a.textbookId === selectedTextbook.id).sort((a,b) => a.order - b.order).map(a => {
                  const submission = mySubmissions.find(s => s.assignmentId === a.id);
                  return (
                    <button key={a.id} onClick={() => setSelectedAssignment(a)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedAssignment?.id === a.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-indigo-50 border-gray-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold truncate pr-2">{a.title}</span>
                        {submission && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">완료</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="md:col-span-3">
          {selectedAssignment ? (
            <div className="bg-white rounded-[40px] border border-gray-100 p-8 sm:p-10 shadow-sm min-h-[500px]">
              <div className="flex justify-between items-center mb-8 border-b pb-6">
                <div>
                   <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase mb-2 inline-block">{selectedAssignment.type}</span>
                   <h3 className="text-2xl font-bold">{selectedAssignment.title}</h3>
                </div>
                {!showResult && <div className="text-xs font-bold text-slate-400 tracking-widest">문항: {currentIdx + 1} / {shuffledItems.length}</div>}
              </div>
              {showResult && lastSubmission ? (
                <div className="space-y-8">
                   <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-[40px] border-2 border-indigo-100 mb-8">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase mb-2">My Test Result</span>
                      <h4 className="text-6xl font-black text-indigo-600">{lastSubmission.grade || "평가 대기 중"}</h4>
                      <p className="text-[11px] text-slate-400 mt-4">제출 시간: {lastSubmission.submittedAt}</p>
                   </div>
                   <div className="p-8 bg-indigo-600 text-white rounded-[40px]">
                      <h4 className="font-bold text-lg mb-3">👨‍🏫 선생님의 피드백</h4>
                      <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{lastSubmission.feedback || "선생님께서 과제를 확인 중입니다."}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={startAssignment} className="py-4 bg-indigo-100 text-indigo-600 rounded-2xl font-black hover:bg-indigo-200 transition-all">다시 시험 보기</button>
                      <button onClick={() => setSelectedAssignment(null)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">목록으로 돌아가기</button>
                   </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="bg-slate-50 rounded-[50px] p-10 sm:p-16 text-center border-2 border-dashed border-slate-200 shadow-inner">
                     {renderQuestion()}
                  </div>
                  {selectedAssignment.type !== AssignmentType.CLOZE && (
                    <textarea 
                      rows={2} 
                      className="w-full px-8 py-6 border-2 border-slate-100 rounded-[35px] outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 text-2xl font-medium transition-all" 
                      value={currentInput} 
                      onChange={e => setCurrentInput(e.target.value)} 
                      onKeyDown={handleKeyDown}
                      placeholder="정답을 입력하세요..." 
                      autoFocus
                    />
                  )}
                  <div className="flex gap-4">
                    <button onClick={handlePrev} disabled={currentIdx === 0} className="px-10 py-5 bg-white border-2 border-slate-100 rounded-[30px] font-bold text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-all">이전</button>
                    {currentIdx === shuffledItems.length - 1 ? (
                      <button onClick={handleSubmit} className="flex-1 bg-indigo-600 text-white py-5 rounded-[30px] font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">과제 제출하기 (Enter)</button>
                    ) : (
                      <button onClick={handleNext} className="flex-1 bg-indigo-600 text-white py-5 rounded-[30px] font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">다음 문항 (Enter)</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-gray-50 rounded-[50px] border-4 border-dashed border-gray-200 p-20 text-center">
              <span className="text-6xl mb-8 animate-bounce">📘</span>
              <h4 className="text-gray-900 font-bold text-2xl">학습할 과제를 선택하세요</h4>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
