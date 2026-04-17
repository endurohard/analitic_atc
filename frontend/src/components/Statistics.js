import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import CallDetailsModal from './CallDetailsModal';
import './Statistics.css';

const PALETTE = {
  answered: { from: '#a9dfd8', to: '#a9dfd8' },
  missed:   { from: '#fcb859', to: '#feb95a' },
  total:    { from: '#28aef3', to: '#20aef3' },
  notRedialed: { from: '#f2c8ed', to: '#f2c8ed' },
};

const buildRadialOptions = ({ label, value, palette, onClick }) => ({
  series: [value],
  options: {
    chart: {
      type: 'radialBar',
      toolbar: { show: false },
      background: 'transparent',
      events: { dataPointSelection: onClick },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: '70%',
          background: 'transparent',
          dropShadow: { enabled: false },
        },
        track: {
          background: 'rgba(255,255,255,0.06)',
          strokeWidth: '67%',
          dropShadow: { enabled: false },
        },
        dataLabels: {
          name: {
            offsetY: -5,
            show: true,
            color: '#a0a0a0',
            fontSize: '11px',
            fontFamily: 'inherit',
          },
          value: {
            formatter: () => label.displayValue,
            color: '#e8e8e8',
            fontSize: '20px',
            fontWeight: 600,
            fontFamily: 'inherit',
            show: true,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.4,
        gradientToColors: [palette.to],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    colors: [palette.from],
    stroke: { lineCap: 'round' },
    labels: [label.text],
    theme: { mode: 'dark' },
  },
});

const Statistics = React.memo(({ statistics, orgId, timeRange, startDate, endDate }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);

  const openModal = (category) => {
    setModalCategory(category);
    setModalOpen(true);
  };

  const { accepted = 0, missed = 0, total = 0, notRedialed = 0 } = statistics;

  const charts = [
    {
      key: 'accepted',
      category: 'accepted',
      value: total > 0 ? (accepted / total) * 100 : 0,
      label: { text: 'Принятые', displayValue: accepted },
      palette: PALETTE.answered,
    },
    {
      key: 'missed',
      category: 'missed',
      value: total > 0 ? (missed / total) * 100 : 0,
      label: { text: 'Пропущенные', displayValue: missed },
      palette: PALETTE.missed,
    },
    {
      key: 'total',
      category: 'total',
      value: 100,
      label: { text: 'Общее количество', displayValue: total },
      palette: PALETTE.total,
    },
    {
      key: 'notRedialed',
      category: 'not_redialed',
      value: missed > 0 ? (notRedialed / missed) * 100 : 0,
      label: { text: 'Не перезвонили', displayValue: notRedialed },
      palette: PALETTE.notRedialed,
    },
  ];

  return (
    <>
      <div className="statistics-grid">
        {charts.map((c) => {
          const config = buildRadialOptions({
            label: c.label,
            value: c.value,
            palette: c.palette,
            onClick: () => openModal(c.category),
          });
          return (
            <div className="stat-card" key={c.key}>
              <Chart
                key={`${c.key}-${c.label.displayValue}`}
                options={config.options}
                series={config.series}
                type="radialBar"
                height="100%"
              />
            </div>
          );
        })}
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
