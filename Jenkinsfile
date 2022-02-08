pipeline{
  agent any
  stages {
    stage('test') {
        agent {
          docker {
            image 'node:12.22.0-alpine'
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

    stage("build"){
      agent { label "slave" }
      when {
        branch 'develop'
      }
      environment {
          AWS_KEY = credentials('AWS_KEY')
          AWS_SECRET = credentials('AWS_SECRET')
          AWS_REGION = credentials('AWS_REGION')
      }
      steps {
        sh 'bin/build'
      }
    }

    stage("deploy"){
      agent { label "master" }
      when {
        branch 'master'
      }
      environment {
          AWS_KEY = credentials('AWS_KEY')
          AWS_SECRET = credentials('AWS_SECRET')
          AWS_REGION = credentials('AWS_REGION')
      }
      steps {
        sh 'bin/deploy'
      }
    }
  }
}