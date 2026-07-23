import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Axios 기본 백엔드 주소 설정
const api = axios.create({
  baseURL: 'http://localhost:8080/api/interview',
  headers: {
    'Content-Type': 'application/json',
  },
});

function App() {
  // ⭐️ 세션 ID는 상태에서 자동 생성되도록 하고, 사용자 입력 폼에서는 제거
  const [sessionId, setSessionId] = useState('');
  const [jobCategory, setJobCategory] = useState('Java Backend');
  const [experienceLevel, setExperienceLevel] = useState('신입');
  const [isStarted, setIsStarted] = useState(false); // 면접 시작 여부

  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimeOut, setIsTimeOut] = useState(false);

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  // ⭐️ [핵심 추가] 타임아웃 중복 호출 방지 전용 플래그
  const isTimingOutRef = useRef(false);

  // 새로운 메시지가 추가될 때마다 스크롤을 하단으로 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // 대화 내역이나 로딩 상태가 바뀔 때 타이머 리셋 및 재가동
  useEffect(() => {
    if (isStarted && !isLoading && !isTimeOut) {
      setTimeLeft(60);
      isTimingOutRef.current = false; // 플래그 초기화

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // ⭐️ 이미 타임아웃 로직이 진행 중이면 중복 실행 방지
            if (!isTimingOutRef.current) {
              isTimingOutRef.current = true;
              handleTimeOut();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [chatHistory, isLoading, isStarted, isTimeOut]);

  // 1. 면접 시작 API 호출
  const handleStartInterview = async (e) => {
    e.preventDefault();

    // ⭐️ [UX 개선] 사용자가 세션 ID를 정하는 대신, 시작할 때 고유 UUID 자동 생성
    const newSessionId = 'session-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 9));
    setSessionId(newSessionId);

    setIsLoading(true);
    isTimingOutRef.current = false;

    try {
      await api.post('/start', {
        sessionId: newSessionId,
        jobCategory,
        experienceLevel,
      });

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

  // 2. 대화 발송 API 호출
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || isTimeOut) return;

    const userMsg = inputMessage;
    setInputMessage('');

    setChatHistory((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        sessionId,
        message: userMsg,
      });

      setChatHistory((prev) => [...prev, { sender: 'ai', text: response.data.reply }]);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || '답변을 받아오지 못했습니다. 서버 상태를 확인해 주세요.';

      setChatHistory((prev) => [
        ...prev,
        { sender: 'system', text: `⚠️ 에러: ${errorMsg}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 타임아웃 처리 함수
  const handleTimeOut = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTimeOut(true);
    setIsLoading(true);

    // 타임아웃 알림 시스템 메시지 1회 추가
    setChatHistory((prev) => [
      ...prev,
      { sender: 'system', text: '⏱️ 제한시간(60초)이 초과되었습니다. 다음 질문으로 넘어갑니다.' }
    ]);

    try {
      const response = await api.post('/chat', {
        sessionId,
        message: "지원자가 답변 제한 시간을 초과하여 아무 답변도 하지 못했습니다. 이전 답변 누락에 대해 지적하고, 한국어로 다음 면접 기술 질문을 진행해 주세요.",
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
      isTimingOutRef.current = false;
    }
  };

  // 4. 면접 종료 및 저장
  const handleEndInterview = async () => {
    if (window.confirm("면접을 종료하고 결과를 저장하시겠습니까?")) {
      setIsLoading(true);
      try {
        const fullHistoryText = chatHistory
          .map((chat) => `[${chat.sender === 'user' ? '지원자' : chat.sender === 'ai' ? '면접관' : '시스템'}] ${chat.text}`)
          .join('\n');

        await api.post('/save', {
          sessionId,
          jobCategory,
          experienceLevel,
          fullChatHistory: fullHistoryText,
          aiFeedback: "대화가 성공적으로 기록되었습니다.",
        });

        alert('면접 결과가 DB에 안전하게 저장되었습니다!');
        setIsStarted(false);
        setChatHistory([]);
      } catch (error) {
        console.error(error);
        alert('면접 결과를 저장하는 중 에러가 발생했습니다.');
      } finally {
        setIsLoading(false);
        setIsTimeOut(false);
        if (timerRef.current) clearInterval(timerRef.current);
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
            {/* ⭐️ 세션 ID 입력 폼은 제거되어 깔끔한 조건 설정만 남았습니다 */}
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