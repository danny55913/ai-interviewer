import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css'; // 가벼운 스타일 지정을 위해 사용합니다.

// Axios 기본 백엔드 주소 설정
const api = axios.create({
  baseURL: 'http://localhost:8080/api/interview',
  headers: {
    'Content-Type': 'application/json',
  },
});

function App() {
  // 상태 관리 (State)
  const [sessionId, setSessionId] = useState('user-session-' + Math.floor(Math.random() * 1000));
  const [jobCategory, setJobCategory] = useState('Java Backend');
  const [experienceLevel, setExperienceLevel] = useState('신입');
  const [isStarted, setIsStarted] = useState(false); // 면접 시작 여부

  const [inputMessage, setInputMessage] = useState(''); // 내가 입력한 메시지
  const [chatHistory, setChatHistory] = useState([]); // 대화 내역
  const [isLoading, setIsLoading] = useState(false); // AI 응답 대기 상태

  const [timeLeft, setTimeLeft] = useState(60); // 60초 제한시간
  const [isTimeOut, setIsTimeOut] = useState(false); // 시간 초과 여부
  const timerRef = useRef(null); // 타이머 인스턴스를 기억할 공간

  const chatEndRef = useRef(null);

  // 새로운 메시지가 추가될 때마다 채팅창 스크롤을 맨 아래로 내려주는 효과
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

// 대화 내역이 바뀌거나 AI 로딩이 끝났을 때 타이머를 리셋하고 새로 구동
useEffect(() => {
  // 면접이 시작되었고, AI가 말하는 중이 아닐 때만 타이머 가동
  if (isStarted && !isLoading && !isTimeOut && !timerRef.current) {
    setTimeLeft(60); // 60초로 리셋

    // 기존에 돌고 있던 타이머가 있다면 클리어
    if (timerRef.current) clearInterval(timerRef.current);

    // 1초마다 재깍재깍 감소
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut(); // 0초가 되면 시간 초과 함수 실행
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // 컴포넌트가 언마운트되거나 조건이 바뀔 때 타이머 청소
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [chatHistory, isLoading, isStarted]);

  // 1. 면접 시작 API 호출 (/start)
  const handleStartInterview = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/start', {
        sessionId,
        jobCategory,
        experienceLevel,
      });

      // 화면 초기화 및 면접관의 첫 인사 유도용 상태 셋팅
      setIsStarted(true);
      setChatHistory([
        { sender: 'system', text: `면접 세션이 준비되었습니다. (${jobCategory} / ${experienceLevel})` },
        { sender: 'ai', text: `안녕하세요! 오늘 [${jobCategory}] 직무 면접관을 맡게 된 시니어 개발자입니다. 자기소개를 포함하여 준비되셨을 때 말씀해 주시면 질문을 드리겠습니다.` }
      ]);
    } catch (error) {
      console.error(error);
      alert('면접 시작을 처리하는 중 에러가 발생했습니다. 백엔드가 켜져 있는지 확인해 주세요!');
    } finally {
      setIsLoading(false);
      setIsTimeOut(false);
    }


  };

  // 2. 대화 발송 API 호출 (/chat)
    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!inputMessage.trim() || isLoading) return;

      const userMsg = inputMessage;
      setInputMessage('');

      // 내 메시지를 대화창에 즉시 추가
      setChatHistory((prev) => [...prev, { sender: 'user', text: userMsg }]);
      setIsLoading(true);

      try {
        const response = await api.post('/chat', {
          sessionId,
          message: userMsg,
        });

        // AI 면접관의 답변을 대화창에 추가
        setChatHistory((prev) => [...prev, { sender: 'ai', text: response.data.reply }]);
      } catch (error) {
        console.error(error);

        // [수정] 백엔드에서 던진 예쁜 에러 메시지가 있다면 대화창에 시스템 메시지로 보여줍니다.
        const errorMsg = error.response?.data?.message || '답변을 받아오지 못했습니다. 서버 상태를 확인해 주세요.';

        setChatHistory((prev) => [
          ...prev,
          { sender: 'system', text: `⚠️ 에러: ${errorMsg}` }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleTimeOut = async () => {
      // 1. 타이머부터 확실하게 끄기
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 2. ⭐️ 상태 변화를 최상단으로 올리기 (중요!)
      setIsTimeOut(true);
      setIsLoading(true);

      // 3. 시스템 메시지 추가
      setChatHistory((prev) => [
        ...prev,
        { sender: 'system', text: '⏱️ 제한시간(60초)이 초과되었습니다. 다음 질문으로 넘어갑니다.' }
      ]);

      try {
        // ⭐️ [보완] LLM이 탈선하지 않도록 한글 지시어로 명확하게 변경
        const response = await api.post('/chat', {
          sessionId,
          message: "지원자가 답변 제한 시간을 초과하여 아무 답변도 하지 못했습니다. 이전 답변 누락에 대해 엄격하게 지적하고, 한국어로 다음 면접 기술 질문을 진행해 주세요.",
        });

        setChatHistory((prev) => [...prev, { sender: 'ai', text: response.data.reply }]);
      } catch (error) {
        console.error(error);
        setChatHistory((prev) => [
          ...prev,
          { sender: 'system', text: '⚠️ 다음 질문을 불러오는 중 에러가 발생했습니다.' }
        ]);
      } finally {
        setIsLoading(false);
        setIsTimeOut(false);
      }
    };

  // 3. 면접 종료 및 데이터 저장 API 호출 (/save) ⭐️ 새로 추가하는 함수
    const handleEndInterview = async () => {
      if (window.confirm("면접을 종료하고 결과를 저장하시겠습니까?")) {
        setIsLoading(true);
        try {
          // chatHistory에 쌓인 대화 배열을 하나의 텍스트 포맷으로 결합합니다.
          const fullHistoryText = chatHistory
            .map((chat) => `[${chat.sender === 'user' ? '지원자' : chat.sender === 'ai' ? '면접관' : '시스템'}] ${chat.text}`)
            .join('\n');

          // 백엔드의 /save 엔드포인트로 전송
          await api.post('/save', {
            sessionId,
            jobCategory,
            experienceLevel,
            fullChatHistory: fullHistoryText,
            aiFeedback: "대화가 성공적으로 기록되었습니다.", // 추후 AI 피드백 요약 기능 추가 시 연동
          });

          alert('면접 결과가 DB에 안전하게 저장되었습니다!');
          setIsStarted(false); // 저장 완료 후 메인화면 이동
          setChatHistory([]);  // 대화 내역 초기화
        } catch (error) {
          console.error(error);
          alert('면접 결과를 저장하는 중 에러가 발생했습니다.');
        } finally {
          setIsLoading(false);
          setIsTimeOut(false);
          if(timerRef.current)
            clearInterval(timerRef.current);
        }
      }
    };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🧑‍💻 AI 모의 기술 면접 서비스</h1>
      </header>

      {/* 면접 설정 화면 (시작 전) */}
      {!isStarted ? (
        <div className="setup-card">
          <h2>면접 조건 설정</h2>
          <form onSubmit={handleStartInterview}>
            <div className="form-group">
              <label>세션 ID (고유 ID)</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>지원 직무</label>
              <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)}>
                <option value="Java Backend">Java Backend</option>
                <option value="React Frontend">React Frontend</option>
                <option value="AI / Machine Learning">AI / Machine Learning</option>
                <option value="DevOps / Cloud">DevOps / Cloud</option>
              </select>
            </div>
            <div className="form-group">
              <label>연차 선택</label>
              <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option value="신입">신입 (Junior)</option>
                <option value="3년차 경력직">3년차 경력직</option>
                <option value="5년차 이상 시니어">5년차 이상 시니어</option>
              </select>
            </div>
            <button type="submit" className="start-btn" disabled={isLoading}>
              {isLoading ? '세션 준비 중...' : '면접 시작하기'}
            </button>
          </form>
        </div>
      ) : (
        /* 실제 면접 채팅 화면 (시작 후) */
        <div className="chat-card">
          <div className="chat-info">
            <span>🔴 면접 진행 중 : <strong>{jobCategory} ({experienceLevel})</strong></span>
            {/* 실시간 남은 시간 표시 (시간 초과 시 '시간 초과!' 노출) */}
            <span className={`timer ${timeLeft <= 10 ? 'warning' : ''}`} style={{marginLeft: '15px', color: timeLeft <= 10 ? 'red' : 'green', fontWeight: 'bold'}}>
              ⏳ 남은 시간: {isTimeOut ? '시간 초과!' : `${timeLeft}초`}
            </span>
            <button className="reset-btn" onClick={handleEndInterview} disabled={isLoading}>
              {isLoading ? '저장 중...' : '면접 종료'}
            </button>
          </div>

          <div className="chat-box">
            {chatHistory.map((chat, index) => (
              <div key={index} className={`message-row ${chat.sender}`}>
                <div className="message-bubble">
                  {chat.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row ai">
                <div className="message-bubble loading">
                  면접관이 답변을 고민하고 있습니다...💬
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              placeholder={isTimeOut ? "시간이 초과되어 입력할 수 없습니다..." : "면접관의 질문에 답변을 입력하세요..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              // ⭐️ isLoading 상태뿐만 아니라 isTimeOut 일 때도 입력창을 잠급니다.
              disabled={isLoading || isTimeOut}
            />
            <button type="submit" disabled={isLoading || isTimeOut || !inputMessage.trim()}>전송</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;