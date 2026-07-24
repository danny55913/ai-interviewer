import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Axios 기본 백엔드 주소 설정
const api = axios.create({
  baseURL: 'http://localhost:8080/api/interview',
});

// ⭐️ Axios Request Interceptor: 모든 요청 Header에 JWT 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

function App() {
  // ----------------------------------------------------
  // 0. Auth State (로그인 & 회원가입)
  // ----------------------------------------------------
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '', name: '' });

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
  const [resumeFile, setResumeFile] = useState(null);
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
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Refs
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const isTimingOutRef = useRef(false);

  // ----------------------------------------------------
  // 인증(Auth) 관련 핸들러
  // ----------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignUpMode) {
        // 회원가입
        await axios.post('http://localhost:8080/api/auth/signup', authData);
        alert('회원가입이 완료되었습니다! 로그인해 주세요.');
        setIsSignUpMode(false);
      } else {
        // 로그인
        const res = await axios.post('http://localhost:8080/api/auth/login', {
          username: authData.username,
          password: authData.password
        });

        const { token: accessToken, username, name } = res.data;
        const userInfo = { username, name };

        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(userInfo));

        setToken(accessToken);
        setUser(userInfo);
        setShowAuthModal(false);
        setAuthData({ username: '', password: '', name: '' });
        alert(`${name || username}님, 환영합니다!`);
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || '인증 처리 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setHistoryList([]);
    alert('로그아웃 되었습니다.');
  };

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
  // 4. API: 내 면접 기록 목록 불러오기 (로그인 유저 전용)
  // ----------------------------------------------------
  const fetchHistoryList = async () => {
    if (!token || !user?.username) {
      alert('로그인이 필요한 기능입니다.');
      setShowAuthModal(true);
      return;
    }

    try {
      // ⭕ [수정] username을 쿼리 파라미터로 함께 전달
      const response = await api.get('/my-history', {
        params: { username: user.username }
      });
      setHistoryList(response.data);
    } catch (error) {
      console.error('면접 기록을 불러오는 중 에러 발생:', error);
      if (error.response?.status === 401) {
        alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
        handleLogout();
      }
    }
  };

  // 탭 변경 시 목록 자동 갱신
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryList();
    }
  }, [activeTab]);

  // ----------------------------------------------------
  // 5. API: 이력서 첨부 지원 면접 시작
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

    const formData = new FormData();
    formData.append('sessionId', newSessionId);
    formData.append('jobCategory', jobCategory);
    formData.append('experienceLevel', experienceLevel);

    if (resumeFile) {
      formData.append('resumeFile', resumeFile);
    }

    try {
      const response = await api.post('/start-with-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIsStarted(true);

      const initialAiReply = response.data.reply;

      setChatHistory([
        {
          sender: 'system',
          text: `면접 세션이 준비되었습니다. (${jobCategory} / ${experienceLevel}${
            resumeFile ? ` / 이력서: ${resumeFile.name}` : ''
          })`,
        },
        {
          sender: 'ai',
          text: initialAiReply,
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

        // 🔴 [핵심 체크] user 객체의 username이 정확히 들어가는지 확인!
        // user state 혹은 localStorage에서 유저명 추출
        const currentUsername = user?.username || JSON.parse(localStorage.getItem('user'))?.username;

        // 토큰이 있거나 user 정보가 있으면 /save-with-user 호출
        const saveEndpoint = (token || currentUsername) ? '/save-with-user' : '/save';

        await api.post(saveEndpoint, {
          username: currentUsername, // 👈 로그인한 유저의 username 전달
          sessionId,
          jobCategory,
          experienceLevel,
          fullChatHistory: fullHistoryText,
          aiFeedback: '',
        });

        alert('면접 평가 및 결과가 안전하게 저장되었습니다!');
        setIsStarted(false);
        setChatHistory([]);
        setResumeFile(null);
        setActiveTab('history'); // 탭 이동 후 목록 조회
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🧑‍💻 AI 모의 기술 면접 서비스</h1>

          {/* 로그인 / 프로필 영역 */}
          <div>
            {user ? (
              <div style={{ fontSize: '0.9rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span>👤 <strong>{user.name || user.username}</strong>님</span>
                <button className="reset-btn" style={{ backgroundColor: '#6b7280' }} onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            ) : (
              <button className="tab-btn active" onClick={() => setShowAuthModal(true)}>
                로그인 / 회원가입
              </button>
            )}
          </div>
        </div>

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

                <div className="form-group">
                  <label>이력서 / 포트폴리오 (선택, PDF 또는 TXT)</label>
                  <input
                    type="file"
                    accept=".pdf, .txt"
                    onChange={(e) => setResumeFile(e.target.files[0] || null)}
                  />
                  {resumeFile && (
                    <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>
                      📄 선택된 파일: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <button type="submit" className="start-btn" disabled={isLoading}>
                  {isLoading ? '이력서 분석 및 질문 생성 중...' : '면접 시작하기'}
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
          {!token ? (
            <div className="no-data">
              <p>로그인 후 내 면접 기록을 확인할 수 있습니다.</p>
              <button className="start-btn" style={{ maxWidth: '200px', margin: '15px auto 0' }} onClick={() => setShowAuthModal(true)}>
                로그인하러 가기
              </button>
            </div>
          ) : historyList.length === 0 ? (
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

      {/* ⭐️ [신규] 로그인 / 회원가입 모달 (기존 Modal CSS 그대로 활용) */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isSignUpMode ? '🔑 회원가입' : '🔐 로그인'}</h3>
              <button className="close-btn" onClick={() => setShowAuthModal(false)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label>아이디 (Username)</label>
                  <input
                    type="text"
                    required
                    value={authData.username}
                    onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>비밀번호</label>
                  <input
                    type="password"
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  />
                </div>
                {isSignUpMode && (
                  <div className="form-group">
                    <label>이름 / 닉네임</label>
                    <input
                      type="text"
                      required
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                    />
                  </div>
                )}
                <button type="submit" className="start-btn" style={{ marginTop: '10px' }}>
                  {isSignUpMode ? '가입하기' : '로그인'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9rem' }}>
                {isSignUpMode ? (
                  <span>
                    이미 계정이 있으신가요?{' '}
                    <strong style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => setIsSignUpMode(false)}>
                      로그인하기
                    </strong>
                  </span>
                ) : (
                  <span>
                    계정이 없으신가요?{' '}
                    <strong style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => setIsSignUpMode(true)}>
                      회원가입하기
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;