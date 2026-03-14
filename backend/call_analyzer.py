"""
Модуль анализа звонков: транскрипция через faster-whisper + анализ качества
"""
import os
import re
import tempfile
import httpx
from faster_whisper import WhisperModel

# Lazy-загрузка модели Whisper (один раз)
_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        model_name = os.getenv("WHISPER_MODEL", "base")
        _whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return _whisper_model


async def fetch_recording(recording_filename: str) -> bytes:
    """Скачать или прочитать файл записи звонка."""
    recordings_url = os.getenv("RECORDINGS_URL")
    recordings_path = os.getenv("RECORDINGS_PATH")

    if recordings_url:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{recordings_url}/{recording_filename}")
            response.raise_for_status()
            return response.content
    elif recordings_path:
        file_path = os.path.join(recordings_path, recording_filename)
        with open(file_path, "rb") as f:
            return f.read()
    else:
        raise ValueError("RECORDINGS_URL или RECORDINGS_PATH не настроены")


def transcribe_audio(audio_bytes: bytes) -> dict:
    """Транскрибировать аудио через faster-whisper. Возвращает текст и язык."""
    model = get_whisper_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path, language="ru")
        text = " ".join(segment.text.strip() for segment in segments)
    finally:
        os.unlink(tmp_path)

    return {
        "text": text.strip(),
        "language": info.language if info else "ru",
    }


# Слова-паразиты
FILLER_WORDS = [
    "ну", "это", "вот", "как бы", "типа", "значит", "короче",
    "в общем", "так сказать", "собственно", "блин",
    "слушай", "знаешь", "понимаешь",
]

GREETING_PATTERNS = [
    r"здравствуйте", r"добрый день", r"доброе утро", r"добрый вечер",
    r"привет", r"алло", r"слушаю вас",
]

FAREWELL_PATTERNS = [
    r"до свидания", r"всего доброго", r"всего хорошего",
    r"хорошего дня", r"спасибо.*за звонок", r"до встречи",
]

POLITE_PATTERNS = [
    r"пожалуйста", r"спасибо", r"благодарю", r"будьте добры",
    r"извините", r"простите",
]


def analyze_transcript(text: str, duration_seconds: float) -> dict:
    """Анализ транскрипции: слова-паразиты, вежливость, рекомендации."""
    text_lower = text.lower()
    words = text_lower.split()
    word_count = len(words)

    # Слова-паразиты
    filler_detail = {}
    for filler in FILLER_WORDS:
        count = len(re.findall(r"\b" + re.escape(filler) + r"\b", text_lower))
        if count > 0:
            filler_detail[filler] = count
    filler_total = sum(filler_detail.values())

    # Вежливость
    has_greeting = any(re.search(p, text_lower) for p in GREETING_PATTERNS)
    has_farewell = any(re.search(p, text_lower) for p in FAREWELL_PATTERNS)
    polite_count = sum(1 for p in POLITE_PATTERNS if re.search(p, text_lower))

    politeness_detail = {
        "has_greeting": has_greeting,
        "has_farewell": has_farewell,
        "polite_words_count": polite_count,
    }

    politeness_score = 0.0
    if has_greeting:
        politeness_score += 0.3
    if has_farewell:
        politeness_score += 0.3
    politeness_score += min(0.4, polite_count * 0.1)

    # Скорость речи (слов в минуту)
    speech_speed = (word_count / duration_seconds * 60) if duration_seconds > 0 else 0

    # Рекомендации
    recommendations = []
    if not has_greeting:
        recommendations.append("Добавьте приветствие в начале разговора")
    if not has_farewell:
        recommendations.append("Добавьте прощание в конце разговора")
    if filler_total > 5:
        top_fillers = sorted(filler_detail.items(), key=lambda x: -x[1])[:3]
        top_str = ", ".join(f'"{w}" ({c}x)' for w, c in top_fillers)
        recommendations.append(f"Сократите слова-паразиты ({filler_total} шт.): {top_str}")
    elif filler_total > 0:
        recommendations.append(f"Слова-паразиты: {filler_total} шт. (допустимо)")
    if speech_speed > 180:
        recommendations.append(f"Темп речи слишком быстрый ({speech_speed:.0f} сл/мин), говорите медленнее")
    if 0 < speech_speed < 80:
        recommendations.append(f"Темп речи слишком медленный ({speech_speed:.0f} сл/мин)")
    if polite_count == 0:
        recommendations.append("Используйте вежливые слова (пожалуйста, спасибо)")

    # Общая оценка
    filler_penalty = min(0.3, filler_total * 0.02)
    speed_penalty = 0.1 if (speech_speed > 180 or (0 < speech_speed < 80)) else 0
    overall_score = max(0, min(1.0, politeness_score - filler_penalty - speed_penalty))

    return {
        "filler_words_count": filler_total,
        "filler_words_detail": filler_detail,
        "politeness_score": round(politeness_score, 2),
        "politeness_detail": politeness_detail,
        "speech_speed_wpm": round(speech_speed, 1),
        "recommendations": recommendations,
        "overall_score": round(overall_score, 2),
    }
