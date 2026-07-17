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

  const chatEndRef = useRef(null);

  // 새로운 메시지가 추가될 때마다 채팅창 스크롤을 맨 아래로 내려주는 효과
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
            <button className="reset-btn" onClick={() => setIsStarted(false)}>면접 종료</button>
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
              placeholder="면접관의 질문에 답변을 입력하세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputMessage.trim()}>전송</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;