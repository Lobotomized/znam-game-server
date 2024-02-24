
const TIME_BETWEEN_QUESTIONS  = 5;
const TIME_TO_ANSWER = 20;
module.exports.TIME_TO_ANSWER =  TIME_TO_ANSWER;
module.exports.TIME_BETWEEN_QUESTIONS = TIME_BETWEEN_QUESTIONS;



//Jokers

const removeTwo = function(state, me){
    let removed = getTwoUniqueRandomIntegersInRangeExcluding(0,me.currentQuestion.answers.length - 1, me.currentQuestion.correctAnswer);
    me.currentQuestion.answers[removed[0]].text = '';
    me.currentQuestion.answers[removed[1]].text = '';
    me.usedJokerTemp.splice(me.usedJokerTemp.indexOf('50na50'), 1);
  
  }
  
  const stealTimeJoker = function(state, me){
  
    Object.keys(state.players).forEach((playerRef) => {
      const player = state.players[playerRef]
      if(player !== me){
        player.timeToAnswerCounter -= 2;
        me.timeToAnswerCounter += 2;
      }
    })
    me.usedJokerTemp.splice(me.usedJokerTemp.indexOf('stealTime'), 1);
  }
  
  
  const changeQuestion = function(state,me){
    me.currentQuestion = getRandomElementFromArray(state.reserveQuestions)
    me.timeToAnswerCounter = TIME_TO_ANSWER;
    me.usedJokerTemp.splice(me.usedJokerTemp.indexOf('changeQuestion'), 1);
  }
  
  function jokersFunk(state,me){
    me.usedJokerTemp.forEach((joker) => {
      switch(joker){
        case "stealTime":
            stealTimeJoker(state,me)
          break;
        case "changeQuestion":
            changeQuestion(state,me)
          break;
        case "50na50":
          removeTwo(state,me);
          break;
      }
    })
  }

module.exports.WaitForAnswer = function(state,me){
    me.currentQuestion = JSON.parse(JSON.stringify(state.questions[me.currentQuestionIndex]));
    me.timeToAnswerCounter -=1;
    if(me.answerIndex != undefined){
        me.state = 'Answer';
        me.timeBetweenQuestionsCounter = TIME_BETWEEN_QUESTIONS
        return;
    }

    if(me.timeToAnswerCounter <= 0){
        me.state = 'TimeExpired';
        me.timeBetweenQuestionsCounter = TIME_BETWEEN_QUESTIONS
        return;
    }

    if(me.usedJokerTemp.length){
        me.state = 'Joker';
        return;
    }  
}

module.exports.BetweenQuestions = function(state,me){
    me.timeBetweenQuestionsCounter -= 1;
    
    if(me.timeBetweenQuestionsCounter <= 0){
        me.answerIndex = undefined;
        me.currentQuestion = undefined;

        if(me.currentQuestionIndex === state.questions.length - 1){
            me.state = 'Final'
        }
        else{
            me.currentQuestionIndex += 1;
            me.timeToAnswerCounter = TIME_TO_ANSWER;
            me.state = 'WaitForAnswer';
        }
    }
}

module.exports.Answer = function(state,me){
    
    if(me.currentQuestion.correctAnswer === me.answerIndex){
        me.score += 5;
    }
    me.state = 'BetweenQuestions';
}



module.exports.TimeExpired = function(state,me){
    if(me.currentQuestionIndex === state.questions.length - 1){
        me.state = 'Final'
    }
    else{
        me.state = 'BetweenQuestions'
    }
}



module.exports.Joker = function(state,me){
    
    me.state = 'WaitForAnswer'
}

module.exports.Final = function(state,me){
    me.finished = true;
}