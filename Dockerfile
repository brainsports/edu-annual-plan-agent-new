# 1. Python 버전 최신화 (3.11 권장)
FROM python:3.11-slim

# 2. 한글 폰트 및 시스템 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    fonts-nanum \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. 라이브러리 설치 (코드를 복사하기 전에 수행하여 빌드 속도 개선)
# 프로젝트 폴더에 requirements.txt가 반드시 있어야 합니다.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 전체 복사
COPY . .

# 5. 폰트 캐시 갱신 (Matplotlib 한글 깨짐 방지)
RUN fc-cache -fv

# 6. 클라우드런 포트 개방
EXPOSE 8080

# 7. Streamlit 실행 (권장 옵션 추가)
CMD ["streamlit", "run", "main.py", "--server.port=8080", "--server.address=0.0.0.0"]