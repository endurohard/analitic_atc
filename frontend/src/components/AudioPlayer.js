import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

// Глобальный менеджер для управления воспроизведением аудио
const audioManager = {
  currentPlayer: null,
  setCurrentPlayer: function(player) {
    // Останавливаем предыдущий плеер если он есть
    if (this.currentPlayer && this.currentPlayer !== player) {
      this.currentPlayer.pause();
    }
    this.currentPlayer = player;
  }
};

const AudioPlayer = ({ src, onDownload, phoneNumber, callDateTime, callType }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  // Функция для форматирования имени файла
  const generateFileName = () => {
    if (!phoneNumber || !callDateTime) {
      return 'audio-recording.wav';
    }

    // Форматируем номер телефона: +79880023333
    const formattedPhone = phoneNumber.replace(/\D/g, ''); // убираем нецифровые символы

    // Форматируем дату: 2025-11-20T23:00:00 -> 20.11.2025_23-00
    const date = new Date(callDateTime);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const formattedDate = `${day}.${month}.${year}_${hours}-${minutes}`;

    // Тип звонка
    const typeLabel = callType === 'incoming' ? 'входящий' : callType === 'outgoing' ? 'исходящий' : callType;

    return `${formattedPhone}_${formattedDate}_${typeLabel}.wav`;
  };

  // Загружаем аудио через fetch и создаем blob URL для полного контроля
  useEffect(() => {
    let objectUrl = null;

    const loadAudio = async () => {
      try {
        console.log('Fetching audio from:', src);
        const response = await fetch(src);
        const blob = await response.blob();
        console.log('Audio blob loaded, size:', blob.size, 'type:', blob.type);

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        console.log('Created blob URL:', objectUrl);
      } catch (err) {
        console.error('Failed to load audio:', err);
        // Fallback к прямой ссылке
        setBlobUrl(src);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      console.log('Duration loaded:', audio.duration, 'src:', audio.src);
      setDuration(audio.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleSeeking = () => console.log('Seeking...', 'currentTime before:', audio.currentTime, 'src:', audio.src);
    const handleSeeked = () => console.log('Seeked to:', audio.currentTime, 'src:', audio.src);
    const handleLoadStart = () => console.log('Load start - audio reloading!', 'src:', audio.src);
    const handleError = (e) => console.error('Audio error:', e, audio.error);
    const handleEmptied = () => console.log('Audio emptied - media resource cleared!', 'src:', audio.src);
    const handleAbort = () => console.log('Audio loading aborted!', 'src:', audio.src);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('error', handleError);
    audio.addEventListener('emptied', handleEmptied);
    audio.addEventListener('abort', handleAbort);

    console.log('AudioPlayer mounted with src:', src);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('emptied', handleEmptied);
      audio.removeEventListener('abort', handleAbort);
    };
  }, [src]);

  const togglePlay = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio ref is null');
      return;
    }

    console.log('togglePlay called, isPlaying:', isPlaying, 'currentTime:', audio.currentTime);

    if (isPlaying) {
      audio.pause();
    } else {
      // Регистрируем этот плеер как текущий, что остановит все остальные
      audioManager.setCurrentPlayer(audio);
      console.log('About to play, currentTime before play:', audio.currentTime);

      // Обрабатываем Promise от play() для мобильных браузеров
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(error => {
            console.error('Failed to play audio:', error);
            // Сбрасываем состояние воспроизведения при ошибке
            setIsPlaying(false);
          });
      }

      console.log('After play() called, currentTime:', audio.currentTime);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    e.preventDefault(); // Предотвращаем действие по умолчанию

    const audio = audioRef.current;
    // ВАЖНО: Используем audio.duration напрямую, а не из state!
    const audioDuration = audio?.duration || 0;

    if (!audio || !audioDuration || isNaN(audioDuration) || audioDuration === 0) {
      console.log('Cannot seek: audio not ready', { audio, audioDuration, readyState: audio?.readyState });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width)); // Ограничиваем 0-1
    const newTime = percentage * audioDuration;

    // Проверяем, можно ли перемотать аудио
    const seekable = audio.seekable;
    const hasSeekableRanges = seekable.length > 0;
    const seekableRange = hasSeekableRanges ? `${seekable.start(0)} - ${seekable.end(0)}` : 'none';

    console.log('Seeking to:', {
      percentage,
      newTime,
      audioDuration,
      readyState: audio.readyState,
      currentSrc: audio.currentSrc,
      seekableRange,
      hasSeekableRanges,
      paused: audio.paused,
      currentTime: audio.currentTime
    });

    // Проверяем, что аудио готово к перемотке
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA или больше
      try {
        const wasPlaying = !audio.paused;

        // Если сервер не поддерживает Range requests (seekable.length === 0),
        // все равно пытаемся установить currentTime
        // Для этого аудио должно быть загружено полностью (preload="auto")

        console.log('Attempting to set currentTime to:', newTime);
        audio.currentTime = newTime;

        console.log('CurrentTime immediately after set:', audio.currentTime, 'expected:', newTime);

        // Если время не установилось, ждем загрузки и пробуем снова
        if (Math.abs(audio.currentTime - newTime) > 1) {
          console.warn('Time not set correctly, waiting for more data...');

          // Ждем события 'canplaythrough' (аудио полностью загружено)
          const handleCanPlayThrough = () => {
            console.log('Audio fully loaded, retrying seek to:', newTime);
            console.log('Before setting currentTime:', audio.currentTime);
            audio.currentTime = newTime;
            console.log('After setting currentTime:', audio.currentTime);
            console.log('CurrentTime after retry:', audio.currentTime);

            if (wasPlaying) {
              console.log('Resuming playback from:', audio.currentTime);
              const resumePromise = audio.play();
              if (resumePromise !== undefined) {
                resumePromise.catch(err => {
                  console.error('Play failed:', err);
                  setIsPlaying(false);
                });
              }
              console.log('After play, currentTime:', audio.currentTime);
            }
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          };

          audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
        } else {
          // Время установилось корректно
          if (wasPlaying) {
            const seekPlayPromise = audio.play();
            if (seekPlayPromise !== undefined) {
              seekPlayPromise.catch(err => {
                console.error('Play after seek failed:', err);
                setIsPlaying(false);
              });
            }
          }
        }

        // Проверяем через задержку
        setTimeout(() => {
          console.log('CurrentTime after 100ms:', audio.currentTime);
        }, 100);

      } catch (err) {
        console.error('Seek failed:', err);
      }
    } else {
      console.warn('Audio not ready for seeking, readyState:', audio.readyState);
      // Если аудио еще не готово, ждем загрузки метаданных
      audio.addEventListener('loadedmetadata', () => {
        console.log('Metadata loaded, retrying seek');
        audio.currentTime = newTime;
      }, { once: true });
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const skipTime = (seconds, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Используем audio.duration напрямую
    const audioDuration = audio.duration || 0;
    const newTime = Math.max(0, Math.min(audioDuration, audio.currentTime + seconds));

    console.log('Skip time:', { seconds, newTime, currentTime: audio.currentTime, audioDuration });
    audio.currentTime = newTime;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="custom-audio-player"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <audio
        ref={audioRef}
        src={blobUrl || src}
        preload="auto"
      />

      <div className="player-controls">
        <button
          className="control-btn skip-btn"
          onClick={(e) => skipTime(-5, e)}
          onTouchEnd={(e) => {
            e.preventDefault();
            skipTime(-5, e);
          }}
          title="Назад 5 сек"
        >
          -5
        </button>

        <button
          className="control-btn play-btn"
          onClick={togglePlay}
          onTouchEnd={(e) => {
            e.preventDefault();
            togglePlay(e);
          }}
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="control-btn skip-btn"
          onClick={(e) => skipTime(5, e)}
          onTouchEnd={(e) => {
            e.preventDefault();
            skipTime(5, e);
          }}
          title="Вперед 5 сек"
        >
          +5
        </button>
      </div>

      <div className="progress-container">
        <span className="time-display">{formatTime(currentTime)}</span>
        <div className="progress-bar" onClick={handleSeek}>
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="time-display">{formatTime(duration)}</span>
      </div>

      <div className="player-actions">
        <div
          className="volume-control"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button className="control-btn volume-btn" title="Громкость">
            {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          {showVolumeSlider && (
            <div className="volume-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
          )}
        </div>

        <button
          className="control-btn download-btn"
          onClick={(e) => {
            e.stopPropagation();

            // Используем blobUrl для скачивания или fallback на onDownload
            if (blobUrl) {
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = generateFileName();
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              onDownload();
            }
          }}
          title="Скачать запись"
        >
          ⬇
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
