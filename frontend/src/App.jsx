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
  // ----------------------------------------------------
  // 1. Navigation State (탭 전환)
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState('interview'); // 'interview' | 'history'

  // ----------------------------------------------------
  // 2. 면접 세션 & 채팅 State
  // ----------------------------------------------------
  const [sessionId, setSessionId] = useState('');
  const [jobCategory, setJobCategory] = useState('Java Backend');
  const [experienceLevel, setExperienceLevel] = useState('신입');
  const [isStarted, setIsStarted] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimeOut, setIsTimeOut] = useState(false);

  // ----------------------------------------------------
  // 3. 내 면접 기록 (대시보드) State
  // ----------------------------------------------------
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null); // 상세보기 모달용

  // Refs
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const isTimingOutRef = useRef(false);

  // 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // 타이머 제어
  useEffect(() => {
    if (isStarted && !isLoading && !isTimeOut) {
      setTimeLeft(60);
      isTimingOutRef.current = false;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
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

  // ----------------------------------------------------
  // 4. API: 내 면접 기록 목록 불러오기
  // ----------------------------------------------------
  const fetchHistoryList = async () => {
    try {
      const response = await api.get('/history');
      setHistoryList(response.data);
    } catch (error) {
      console.error('면접 기록을 불러오는 중 에러 발생:', error);
    }
  };

  // 탭 변경 시 목록 자동 갱신
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryList();
    }
  }, [activeTab]);

  // ----------------------------------------------------
  // 5. API: 면접 시작
  // ----------------------------------------------------
  const handleStartInterview = async (e) => {
    e.preventDefault();

    const newSessionId =
      'session-' +
      (crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).substring(2, 9));
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
        {
          sender: 'system',
          text: `면접 세션이 준비되었습니다. (${jobCategory} / ${experienceLevel})`,
        },
        {
          sender: 'ai',
          text: `안녕하세요! 오늘 [${jobCategory}] 직무 면접관을 맡게 된 시니어 개발자입니다. 자기소개를 포함하여 준비되셨을 때 말씀해 주시면 질문을 드리겠습니다.`,
        },
      ]);
    } catch (error) {
      console.error(error);
      alert('면접 시작을 처리하는 중 에러가 발생했습니다. 백엔드가 켜져 있는지 확인해 주세요!');
    } finally {
      setIsLoading(false);
      setIsTimeOut(false);
    }
  };

  // ----------------------------------------------------
  // 6. API: 대화 발송
  // ----------------------------------------------------
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
      const errorMsg =
        error.response?.data?.message || '답변을 받아오지 못했습니다. 서버 상태를 확인해 주세요.';

      setChatHistory((prev) => [
        ...prev,
        { sender: 'system', text: `⚠️ 에러: ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // 7. API: 타임아웃 처리
  // ----------------------------------------------------
  const handleTimeOut = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTimeOut(true);
    setIsLoading(true);

    setChatHistory((prev) => [
      ...prev,
      { sender: 'system', text: '⏱️ 제한시간(60초)이 초과되었습니다. 다음 질문으로 넘어갑니다.' },
    ]);

    try {
      const response = await api.post('/chat', {
        sessionId,
        message:
          '지원자가 답변 제한 시간을 초과하여 아무 답변도 하지 못했습니다. 이전 답변 누락에 대해 지적하고, 한국어로 다음 면접 기술 질문을 진행해 주세요.',
      });

      setChatHistory((prev) => [...prev, { sender: 'ai', text: response.data.reply }]);
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        { sender: 'system', text: '⚠️ 다음 질문을 불러오는 중 에러가 발생했습니다.' },
      ]);
    } finally {
      setIsLoading(false);
      setIsTimeOut(false);
      isTimingOutRef.current = false;
    }
  };

  // ----------------------------------------------------
  // 8. API: 면접 종료 및 저장
  // ----------------------------------------------------
  const handleEndInterview = async () => {
    if (window.confirm('면접을 종료하고 평가 결과를 저장하시겠습니까?')) {
      setIsLoading(true);
      try {
        const fullHistoryText = chatHistory
          .map(
            (chat) =>
              `[${chat.sender === 'user' ? '지원자' : chat.sender === 'ai' ? '면접관' : '시스템'}] ${chat.text}`
          )
          .join('\n');

        await api.post('/save', {
          sessionId,
          jobCategory,
          experienceLevel,
          fullChatHistory: fullHistoryText,
          aiFeedback: '', // 백엔드 서비스에서 AI 총평 자동 생성
        });

        alert('면접 평가 및 결과가 안전하게 저장되었습니다!');
        setIsStarted(false);
        setChatHistory([]);
        setActiveTab('history'); // 저장 후 바로 내 면접 기록 탭으로 이동
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
      {/* 헤더 및 탭 네비게이션 */}
      <header className="app-header">
        <h1>🧑‍💻 AI 모의 기술 면접 서비스</h1>
        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'interview' ? 'active' : ''}`}
            onClick={() => setActiveTab('interview')}
          >
            🎙️ 모의 면접
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📝 내 면접 기록
          </button>
        </nav>
      </header>

      {/* 탭 1: 모의 면접 화면 */}
      {activeTab === 'interview' && (
        <>
          {!isStarted ? (
            <div className="setup-card">
              <h2>면접 조건 설정</h2>
              <form onSubmit={handleStartInterview}>
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
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
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
            <div className="chat-card">
              <div className="chat-info">
                <span>
                  🔴 면접 진행 중 : <strong>{jobCategory} ({experienceLevel})</strong>
                </span>
                <span
                  className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}
                  style={{
                    marginLeft: '15px',
                    color: timeLeft <= 10 ? '#dc3545' : '#28a745',
                    fontWeight: 'bold',
                  }}
                >
                  ⏳ 남은 시간: {isTimeOut ? '시간 초과!' : `${timeLeft}초`}
                </span>
                <button className="reset-btn" onClick={handleEndInterview} disabled={isLoading}>
                  {isLoading ? '저장 중...' : '면접 종료 및 저장'}
                </button>
              </div>

              <div className="chat-box">
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`message-row ${chat.sender}`}>
                    <div className="message-bubble">{chat.text}</div>
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
                  placeholder={
                    isTimeOut
                      ? '시간이 초과되어 입력할 수 없습니다...'
                      : '면접관의 질문에 답변을 입력하세요...'
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading || isTimeOut}
                />
                <button
                  type="submit"
                  disabled={isLoading || isTimeOut || !inputMessage.trim()}
                >
                  전송
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* 탭 2: 내 면접 기록 대시보드 */}
      {activeTab === 'history' && (
        <div className="history-card">
          <h2>📋 과거 면접 복기 리스트</h2>
          {historyList.length === 0 ? (
            <p className="no-data">저장된 면접 기록이 없습니다. 면접을 새로 진행해 보세요!</p>
          ) : (
            <div className="history-grid">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => setSelectedHistory(item)}
                >
                  <div className="history-badge">{item.jobCategory}</div>
                  <h3>{item.experienceLevel} 모의 면접</h3>
                  <p className="history-date">
                    📅 {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <span className="view-more">상세보기 & AI 피드백 &rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 면접 복기 및 AI 피드백 상세 모달 */}
      {selectedHistory && (
        <div className="modal-overlay" onClick={() => setSelectedHistory(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                [{selectedHistory.jobCategory}] {selectedHistory.experienceLevel} 면접 기록
              </h3>
              <button className="close-btn" onClick={() => setSelectedHistory(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              <div className="feedback-section">
                <h4>📊 AI 종합 평가 리포트</h4>
                <pre className="pre-box">{selectedHistory.aiFeedback}</pre>
              </div>
              <div className="chat-history-section">
                <h4>💬 전체 대화 내역 복기</h4>
                <pre className="pre-box chat-pre">{selectedHistory.fullChatHistory}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;