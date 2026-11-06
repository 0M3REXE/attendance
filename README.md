# Student Attendance and Academic Performance Management System

Lightweight Node.js + Express + SQLite app.

## Run locally
```
npm install
npm start
```
Open http://localhost:3000  (login: admin / admin123)

## Docker
```
docker build -t attendance-app .
docker run -p 3000:3000 attendance-app
```

## Selenium tests
```
cd selenium-tests
pip install -r requirements.txt
python -m pytest -q
```
(Start the app first on port 3000, or tests auto-start it.)
