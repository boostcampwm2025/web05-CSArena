import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Naver Cloud API
    CLOVASTUDIO_API_KEY: str = os.getenv("CLOVASTUDIO_API_KEY", "")

    # Google Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # PostgreSQL Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # Model Settings
    LLM_MODEL: str = "HCX-007"  # 질문 생성용 
    EMBEDDING_MODEL: str = "clir-emb-dolphin"
    EMBEDDING_DIMENSION: int = 1024

    # Generation Settings
    TEMPERATURE: float = 0.3
    TOP_K_CHUNKS: int = 5
    QUESTIONS_PER_TOPIC: int = 10
    UNSOLVED_THRESHOLD: int = int(os.getenv("UNSOLVED_THRESHOLD", "30"))

    @classmethod
    def get_db_url(cls) -> str:
        return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"

    @classmethod
    def validate(cls) -> bool:
        required = [
            cls.CLOVASTUDIO_API_KEY, 
            cls.GEMINI_API_KEY,
            cls.DB_NAME, 
            cls.DB_USER, 
            cls.DB_PASSWORD,
        ]
        return all(required)


config = Config()
