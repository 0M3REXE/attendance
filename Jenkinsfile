pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install') {
            steps { sh 'npm install' }
        }
        stage('Selenium Tests') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh 'cd selenium-tests && pip install --break-system-packages -r requirements.txt'
                    sh 'cd selenium-tests && python -m pytest -q'
                }
            }
        }
        stage('Build Docker Image') {
            steps { sh 'docker build -t attendance-app:latest .' }
        }
    }
}
