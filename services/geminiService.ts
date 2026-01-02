
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getSubmissionFeedback = async (assignmentTitle: string, submissionContent: string, type: string = 'VOCABULARY') => {
  const ai = getAIClient();
  const prompt = type === 'TRANSLATION' 
    ? `As a teacher, grade this translation assignment "${assignmentTitle}".
       The student's answers are provided as JSON. Compare them against expected translations if possible, or judge the quality of translation.
       Student Input: ${submissionContent}
       Provide constructive feedback in Korean.`
    : `As a teacher, review the following student submission for the vocabulary assignment "${assignmentTitle}".
       The student's answers are provided as JSON (word-meaning pairs).
       Provide constructive feedback on their performance in Korean.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
};

/**
 * 영어 문장 리스트를 한글로 번역합니다.
 * 과제 생성 시 선생님이 영어만 입력했을 때 사용됩니다.
 */
export const batchTranslate = async (sentences: string[]): Promise<string[]> => {
  if (sentences.length === 0) return [];
  
  const ai = getAIClient();
  const prompt = `Translate the following English sentences into natural Korean. 
  Each sentence should be on a new line. Do not add numbering or extra explanations.
  
  Sentences to translate:
  ${sentences.join('\n')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    const text = response.text || "";
    return text.split('\n').map(s => s.trim()).filter(s => s !== "");
  } catch (error) {
    console.error("AI Translation Error:", error);
    // 에러 발생 시 원문 반환 또는 빈 배열
    return sentences.map(() => "(번역 실패 - 직접 입력해주세요)");
  }
};
