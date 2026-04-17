import React, { useState } from 'react';
import CallDetailsModal from './CallDetailsModal';
import './Statistics.css';

const IconAccepted = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="m10 14 11-11" />
    <path d="M22 16.92V21a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 5.18 2 2 0 0 1 4.1 3h4.09a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.91 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7a2 2 0 0 1 1.72 2.03Z" />
  </svg>
);

const IconMissed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" x2="16" y1="2" y2="8" />
    <line x1="16" x2="22" y1="2" y2="8" />
    <path d="M22 16.92V21a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 5.18 2 2 0 0 1 4.1 3h4.09a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.91 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7a2 2 0 0 1 1.72 2.03Z" />
  </svg>
);

const IconTotal = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92V21a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 5.18 2 2 0 0 1 4.1 3h4.09a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.91 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7a2 2 0 0 1 1.72 2.03Z" />
  </svg>
);

const IconNotRedialed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const formatPct = (n) => {
  if (!isFinite(n) || n <= 0) return '0%';
  return `${n >= 10 ? Math.round(n) : n.toFixed(1)}%`;
};

const Statistics = React.memo(({ statistics, orgId, timeRange, startDate, endDate }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);

  const openModal = (category) => {
    setModalCategory(category);
    setModalOpen(true);
  };

  const { accepted = 0, missed = 0, total = 0, notRedialed = 0 } = statistics;

  const cards = [
    {
      key: 'accepted',
      category: 'accepted',
      label: 'Принятые',
      value: accepted,
      hint: total > 0 ? `${formatPct((accepted / total) * 100)} от общего` : '—',
      tone: 'mint',
      icon: <IconAccepted />,
    },
    {
      key: 'missed',
      category: 'missed',
      label: 'Пропущенные',
      value: missed,
      hint: total > 0 ? `${formatPct((missed / total) * 100)} от общего` : '—',
      tone: 'warning',
      icon: <IconMissed />,
    },
    {
      key: 'total',
      category: 'total',
      label: 'Всего звонков',
      value: total,
      hint: 'За выбранный период',
      tone: 'primary',
      icon: <IconTotal />,
    },
    {
      key: 'notRedialed',
      category: 'not_redialed',
      label: 'Не перезвонили',
      value: notRedialed,
      hint: missed > 0 ? `${formatPct((notRedialed / missed) * 100)} от пропущенных` : '—',
      tone: 'lavender',
      icon: <IconNotRedialed />,
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {cards.map((c) => (
          <button
            type="button"
            key={c.key}
            className={`kpi-card tone-${c.tone}`}
            onClick={() => openModal(c.category)}
          >
            <span className="kpi-icon">{c.icon}</span>
            <span className="kpi-value">{c.value}</span>
            <span className="kpi-label">{c.label}</span>
            <span className="kpi-hint">{c.hint}</span>
          </button>
        ))}
      </div>

      <CallDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={modalCategory}
        orgId={orgId}
        timeRange={timeRange}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
});

export default Statistics;
