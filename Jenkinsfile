pipeline{
  agent any
  stages {
    stage ('QA') {
      parallel {
        stage('test') {
          agent {
            docker {
              image 'node:16.14.0-alpine'
              label "slave"
            }
          }
          when {
            not {
              branch 'master'
            }
          }
          environment {
            TEST_DB_NAME = credentials('DATABASE_NAME_TEST')
            TEST_DB_USERNAME = credentials('DATABASE_USERNAME_TEST')
            TEST_DB_PASSWORD = credentials('DATABASE_PASSWORD_TEST')
            TEST_DB_PORT = credentials('DATABASE_PORT_TEST')
            TEST_DB_HOSTNAME = credentials('DATABASE_HOST_TEST')
          }
          steps {
            sh 'npm install'
            sh 'npm i -g mocha chai'
            sh 'mocha test/**.test.js --timeout 30000 --exit'
          }
        }
        stage('linter') {
          agent {
            docker {
                image 'node:16.14.0-alpine'
                label "slave"
            }
          }
          when {
            not {
              branch 'master'
            }
          }
          steps {
            sh 'npm install'
            sh 'npm i -g eslint'
            sh 'eslint .'
          }
        }
      }
    }

    stage("build"){
      failFast true
      parallel {
        stage('x86') {
          agent { label 'slave' }

          when {
            branch 'master'
          }

          environment {
            AWS_KEY = credentials('AWS_KEY')
            AWS_SECRET = credentials('AWS_SECRET')
            AWS_REGION = credentials('AWS_REGION')
          }

          steps {
            withCredentials([file(credentialsId: 'GOOGLE_CLOUD_KEY', variable: 'google_cloud_key')]) {
              sh 'sudo cp /$google_cloud_key config/google-cloud-key.json'
              sh 'forstok build --arch x86'
            }
          }
        }
      }

      // agent { label "slave" }
      // when {
      //   branch 'master'
      // }
      // environment {
      //     AWS_KEY = credentials('AWS_KEY')
      //     AWS_SECRET = credentials('AWS_SECRET')
      //     AWS_REGION = credentials('AWS_REGION')
      // }
      // steps {
      //   sh 'bin/build'
      // }
    }

    stage("deploy"){
      failFast true
      parallel{
        stage('polling-azure'){
          agent { label 'master' }

          when {
            branch 'master'
          }
          environment {
            AWS_KEY = credentials('AWS_KEY')
            AWS_SECRET = credentials('AWS_SECRET')
            AWS_REGION = credentials('AWS_REGION')
          }
          steps {
            withCredentials([file(credentialsId: 'GOOGLE_CLOUD_KEY', variable: 'google_cloud_key')]) {
              sh 'sudo cp /$google_cloud_key config/google-cloud-key.json'
              sh 'forstok deploy --cluster polling-azure'
            }
          }
          post {
            failure {
              slackSend message: "${env.JOB_NAME} fails, info: ${env.BUILD_URL}",
                        color: 'danger', channel: '#order-army'
            }
            aborted {
              slackSend message: "${env.JOB_NAME} aborted, info: ${env.BUILD_URL}",
                        color: '#949393', channel: '#order-army'
            }
          }
        }
      }
      // agent { label "master" }
      // when {
      //   branch 'master'
      // }
      // environment {
      //     AWS_KEY = credentials('AWS_KEY')
      //     AWS_SECRET = credentials('AWS_SECRET')
      //     AWS_REGION = credentials('AWS_REGION')
      // }
      // steps {
      //   sh 'bin/deploy'
      // }
    }
  }
}