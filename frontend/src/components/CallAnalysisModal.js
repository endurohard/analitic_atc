import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './CallAnalysisModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CallAnalysisModal = ({ callId, orgId, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    startAnalysis();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [callId, orgId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const startAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      // Проверяем, есть ли уже результат
      const checkRes = await axios.get(`${API_URL}/api/calls/${callId}/analysis`, {
        params: { orgId }
      });

      if (checkRes.data.status === 'completed') {
        setAnalysis(checkRes.data);
        setLoading(false);
        return;
      }

      if (checkRes.data.status === 'processing') {
        startPolling();
        return;
      }

      // Запускаем анализ
      const res = await axios.post(`${API_URL}/api/calls/${callId}/analyze`, null, {
        params: { orgId }
      });

      if (res.data.status === 'already_completed') {
        const result = await axios.get(`${API_URL}/api/calls/${callId}/analysis`, {
          params: { orgId }
        });
        setAnalysis(result.data);
        setLoading(false);
      } else {
        startPolling();
      }
    } catch (err) {
      setError('Ошибка запуска анализа: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/calls/${callId}/analysis`, {
          params: { orgId }
        });
        if (res.data.status === 'completed') {
          setAnalysis(res.data);
          setLoading(false);
          clearInterval(pollRef.current);
        } else if (res.data.status === 'error') {
          setError(res.data.error_message || 'Ошибка анализа');
          setLoading(false);
          clearInterval(pollRef.current);
        }
      } catch (err) {
        // продолжаем polling
      }
    }, 3000);
  };

  const handleReanalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    setError('');
    try {
      await axios.delete(`${API_URL}/api/calls/${callId}/analysis`, {
        params: { orgId }
      });
      await startAnalysis();
    } catch (err) {
      setError('Ошибка: ' + err.message);
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.7) return '#52c41a';
    if (score >= 0.4) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Отлично';
    if (score >= 0.6) return 'Хорошо';
    if (score >= 0.4) return 'Удовлетворительно';
    return 'Требует улучшения';
  };

  return (
    <div className="analysis-modal-overlay" onClick={onClose}>
      <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-modal-header">
          <h3>Анализ звонка #{callId}</h3>
          <button className="analysis-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="analysis-modal-body">
          {loading && (
            <div className="analysis-loading">
              <div className="analysis-spinner"></div>
              <p>Анализируем запись...</p>
              <p className="analysis-hint">Транскрипция и анализ могут занять 30-60 секунд</p>
            </div>
          )}

          {error && (
            <div className="analysis-error">
              <p>{error}</p>
              <button className="analysis-retry-btn" onClick={handleReanalyze}>
                Повторить
              </button>
            </div>
          )}

          {analysis && (
            <>
              {/* Общая оценка */}
              <div className="analysis-score-section">
                <div className="analysis-score-circle" style={{ borderColor: getScoreColor(analysis.overall_score) }}>
                  <span className="analysis-score-value">{Math.round(analysis.overall_score * 100)}</span>
                  <span className="analysis-score-unit">/ 100</span>
                </div>
                <div className="analysis-score-label" style={{ color: getScoreColor(analysis.overall_score) }}>
                  {getScoreLabel(analysis.overall_score)}
                </div>
                {analysis.processing_time_seconds && (
                  <div className="analysis-time">
                    Время анализа: {analysis.processing_time_seconds}с
                  </div>
                )}
              </div>

              {/* Метрики */}
              <div className="analysis-metrics">
                <div className="analysis-metric">
                  <div className="metric-label">Вежливость</div>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{
                        width: `${analysis.politeness_score * 100}%`,
                        background: getScoreColor(analysis.politeness_score)
                      }}
                    />
                  </div>
                  <div className="metric-detail">
                    {analysis.politeness_detail?.has_greeting ? 'Приветствие' : 'Нет приветствия'}
                    {' | '}
                    {analysis.politeness_detail?.has_farewell ? 'Прощание' : 'Нет прощания'}
                  </div>
                </div>

                <div className="analysis-metric">
                  <div className="metric-label">Слова-паразиты</div>
                  <div className="metric-value" style={{ color: analysis.filler_words_count > 5 ? '#ff4d4f' : '#52c41a' }}>
                    {analysis.filler_words_count} шт.
                  </div>
                  {analysis.filler_words_detail && Object.keys(analysis.filler_words_detail).length > 0 && (
                    <div className="filler-words-list">
                      {Object.entries(analysis.filler_words_detail)
                        .sort((a, b) => b[1] - a[1])
                        .map(([word, count]) => (
                          <span key={word} className="filler-word-tag">
                            "{word}" &times; {count}
                          </span>
                        ))
                      }
                    </div>
                  )}
                </div>

                {analysis.speech_speed_wpm > 0 && (
                  <div className="analysis-metric">
                    <div className="metric-label">Темп речи</div>
                    <div className="metric-value">
                      {Math.round(analysis.speech_speed_wpm)} сл/мин
                    </div>
                    <div className="metric-detail">
                      {analysis.speech_speed_wpm > 180 ? 'Быстро' :
                       analysis.speech_speed_wpm < 80 ? 'Медленно' : 'Нормально'}
                    </div>
                  </div>
                )}
              </div>

              {/* Рекомендации */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="analysis-recommendations">
                  <h4>Рекомендации</h4>
                  <ul>
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Транскрипция */}
              {analysis.transcript && (
                <div className="analysis-transcript">
                  <h4>Транскрипция</h4>
                  <div className="transcript-text">{analysis.transcript}</div>
                </div>
              )}

              <div className="analysis-actions">
                <button className="analysis-retry-btn" onClick={handleReanalyze}>
                  Повторить анализ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallAnalysisModal;
