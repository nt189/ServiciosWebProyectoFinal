FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install flask requests firebase-admin flask-cors
EXPOSE 5002
CMD ["python", "app.py"]