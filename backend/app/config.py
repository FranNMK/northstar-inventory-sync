import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]
WEBHOOK_SECRET: str = os.environ["WEBHOOK_SECRET"]
JWT_SECRET: str = os.environ["JWT_SECRET"]
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))
