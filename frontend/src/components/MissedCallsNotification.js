import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './MissedCallsNotification.css';

const MissedCallsNotification = ({ organization, refreshInterval = 10 }) => {
  const [notifications, setNotifications] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const prevIdsRef = useRef(new Set());
  const audioRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
      return '+7' + cleaned.slice(1);
    }
    return '+7' + cleaned;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${time}`;
  };

  const timeSince = (isoString) => {
    if (!isoString) return '';
    const diff = Math.floor((new Date() - new Date(isoString)) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} д назад`;
  };

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current = audioCtx;
      }
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio notification not available');
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!organization?.orgId) return;
    try {
      const response = await axios.get(`${API_URL}/api/missed-notifications`, {
        params: { orgId: organization.orgId }
      });
      const data = response.data || [];

      const newIds = new Set(data.map(n => n.id));
      const prevIds = prevIdsRef.current;
      const hasNewNotifications = data.some(n => !prevIds.has(n.id));

      if (hasNewNotifications && prevIds.size > 0) {
        setHasNew(true);
        playNotificationSound();
        setTimeout(() => setHasNew(false), 3000);
      }

      prevIdsRef.current = newIds;
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching missed notifications:', error);
    }
  }, [organization?.orgId, API_URL, playNotificationSound]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications, refreshInterval]);

  if (notifications.length === 0) return null;

  return (
    <div className={`missed-notifications ${isMinimized ? 'minimized' : ''} ${hasNew ? 'has-new' : ''}`}>
      <div className="missed-notifications-header" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="missed-notifications-title">
          <span className="missed-icon">&#128222;</span>
          <span>Пропущенные</span>
          <span className="missed-count">{notifications.length}</span>
        </div>
        <button className="missed-toggle-btn">
          {isMinimized ? '+' : '\u2212'}
        </button>
      </div>

      {!isMinimized && (
        <div className="missed-notifications-list">
          {notifications.map((notification) => (
            <div key={notification.id} className="missed-notification-item">
              <div className="missed-notification-phone">
                {formatPhone(notification.phone)}
              </div>
              <div className="missed-notification-meta">
                <span className="missed-notification-time">
                  {formatTime(notification.timeStart)}
                </span>
                <span className="missed-notification-ago">
                  {timeSince(notification.timeStart)}
                </span>
              </div>
              <span className="missed-tag">#missing</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissedCallsNotification;
