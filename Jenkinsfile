pipeline{
  agent any
  stages {
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