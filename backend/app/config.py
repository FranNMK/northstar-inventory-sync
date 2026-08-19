import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]
WEBHOOK_SECRET: str = os.environ["WEBHOOK_SECRET"]
