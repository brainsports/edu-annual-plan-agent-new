FROM python:3.9-slim

RUN apt-get update && apt-get install -y fonts-nanum && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir streamlit google-generativeai pandas matplotlib python-docx openpyxl

EXPOSE 8080

CMD ["streamlit", "run", "main.py", "--server.port=8080", "--server.address=0.0.0.0"]
