import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import CallDetailsModal from './CallDetailsModal';
import './Statistics.css';

const Statistics = React.memo(({ statistics, orgId, timeRange, startDate, endDate }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);

  const handleChartClick = (category) => {
    setModalCategory(category);
    setModalOpen(true);
  };
  // RadialBar для "Принятые"
  const acceptedOptions = {
    series: [statistics.total > 0 ? (statistics.accepted / statistics.total) * 100 : 0],
    options: {
      chart: {
        type: 'radialBar',
        toolbar: { show: false },
        events: {
          dataPointSelection: () => handleChartClick('accepted')
        }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
            dropShadow: {
              enabled: false
            }
          },
          track: {
            background: '#f0f0f0',
            strokeWidth: '67%',
            dropShadow: {
              enabled: false
            }
          },
          dataLabels: {
            name: {
              offsetY: -5,
              show: true,
              color: '#888',
              fontSize: '11px'
            },
            value: {
              formatter: function() {
                return statistics.accepted;
              },
              color: '#111',
              fontSize: '20px',
              fontWeight: 'bold',
              show: true
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: ['#52c41a'],
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      stroke: {
        lineCap: 'round'
      },
      labels: ['Принятые']
    }
  };

  // RadialBar для "Пропущенные"
  const missedOptions = {
    series: [statistics.total > 0 ? (statistics.missed / statistics.total) * 100 : 0],
    options: {
      chart: {
        type: 'radialBar',
        toolbar: { show: false },
        events: {
          dataPointSelection: () => handleChartClick('missed')
        }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
            dropShadow: {
              enabled: false
            }
          },
          track: {
            background: '#f0f0f0',
            strokeWidth: '67%',
            dropShadow: {
              enabled: false
            }
          },
          dataLabels: {
            name: {
              offsetY: -5,
              show: true,
              color: '#888',
              fontSize: '11px'
            },
            value: {
              formatter: function() {
                return statistics.missed;
              },
              color: '#111',
              fontSize: '20px',
              fontWeight: 'bold',
              show: true
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: ['#fa8c16'],
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      stroke: {
        lineCap: 'round'
      },
      labels: ['Пропущенные']
    }
  };

  // RadialBar для "Общее количество" (всегда 100%)
  const totalOptions = {
    series: [100],
    options: {
      chart: {
        type: 'radialBar',
        toolbar: { show: false },
        events: {
          dataPointSelection: () => handleChartClick('total')
        }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
            dropShadow: {
              enabled: false
            }
          },
          track: {
            background: '#f0f0f0',
            strokeWidth: '67%',
            dropShadow: {
              enabled: false
            }
          },
          dataLabels: {
            name: {
              offsetY: -5,
              show: true,
              color: '#888',
              fontSize: '11px'
            },
            value: {
              formatter: function() {
                return statistics.total;
              },
              color: '#111',
              fontSize: '20px',
              fontWeight: 'bold',
              show: true
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: ['#1890ff'],
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      stroke: {
        lineCap: 'round'
      },
      labels: ['Общее количество']
    }
  };

  // RadialBar для "Не перезвонили"
  const notRedialedOptions = {
    series: [statistics.missed > 0 ? (statistics.notRedialed / statistics.missed) * 100 : 0],
    options: {
      chart: {
        type: 'radialBar',
        toolbar: { show: false },
        events: {
          dataPointSelection: () => handleChartClick('not_redialed')
        }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
            dropShadow: {
              enabled: false
            }
          },
          track: {
            background: '#f0f0f0',
            strokeWidth: '67%',
            dropShadow: {
              enabled: false
            }
          },
          dataLabels: {
            name: {
              offsetY: -5,
              show: true,
              color: '#888',
              fontSize: '11px'
            },
            value: {
              formatter: function() {
                return statistics.notRedialed;
              },
              color: '#111',
              fontSize: '20px',
              fontWeight: 'bold',
              show: true
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: ['#ff4d4f'],
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      stroke: {
        lineCap: 'round'
      },
      labels: ['Не перезвонили']
    }
  };

  return (
    <>
      <div className="statistics-grid">
        <div className="stat-card">
          <Chart
            options={acceptedOptions.options}
            series={acceptedOptions.series}
            type="radialBar"
            height="100%"
          />
        </div>

        <div className="stat-card">
          <Chart
            options={missedOptions.options}
            series={missedOptions.series}
            type="radialBar"
            height="100%"
          />
        </div>

        <div className="stat-card">
          <Chart
            options={totalOptions.options}
            series={totalOptions.series}
            type="radialBar"
            height="100%"
          />
        </div>

        <div className="stat-card">
          <Chart
            options={notRedialedOptions.options}
            series={notRedialedOptions.series}
            type="radialBar"
            height="100%"
          />
        </div>
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
