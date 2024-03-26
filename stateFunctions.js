
const TIME_BETWEEN_QUESTIONS  = 5;
const TIME_TO_ANSWER = 30;
module.exports.TIME_TO_ANSWER =  TIME_TO_ANSWER;
module.exports.TIME_BETWEEN_QUESTIONS = TIME_BETWEEN_QUESTIONS;


//helper functions

function getRandomElementFromArray(arr) {
  
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
  }
  function getTwoUniqueRandomIntegersInRangeExcluding(min, max, excluded) {
    let randomNumber1, randomNumber2;
    do {
      randomNumber1 = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (randomNumber1 === excluded);
    do {
      randomNumber2 = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (randomNumber2 === excluded || randomNumber2 === randomNumber1);
    return [randomNumber1, randomNumber2];
  }


//Jokers


const removeTwo = function(state, me){
    let removed = getTwoUniqueRandomIntegersInRangeExcluding(0,me.currentQuestion.answers.length - 1, me.currentQuestion.correctAnswer);
    me.currentQuestion.answers[removed[0]].disabled = true;
    me.currentQuestion.answers[removed[1]].disabled  = true;

    me.usedJokerTemp.splice(me.usedJokerTemp.indexOf('50na50'), 1);
  
  }
  
  const stealTimeJoker = function(state, me){
  
    Object.keys(state.players).forEach((playerRef) => {
      const player = state.players[playerRef]
      if(player !== me){
        player.timeToAnswerCounter -= 6;
        me.timeToAnswerCounter += 10;
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
    if(!me.currentQuestion){
        me.currentQuestion = JSON.parse(JSON.stringify(state.questions[me.currentQuestionIndex]));
    }
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
      me.consecutiveAnswers += 1
      me.score += addBonus(me.timeToAnswerCounter, me.consecutiveAnswers);
    } else {
      me.consecutiveAnswers += 0
    }
    me.state = 'BetweenQuestions';
}

const consecutiveBonusMultipliers = [1, 1, 1.1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5];
const addBonus = (extraTime, bonusIndex) => {
  return extraTime * consecutiveBonusMultipliers[bonusIndex];
};

module.exports.TimeExpired = function(state,me){
    if(me.currentQuestionIndex === state.questions.length - 1){
        me.state = 'Final'
    }
    else{
        me.state = 'BetweenQuestions'
    }
}



module.exports.Joker = function(state,me){
    jokersFunk(state,me)
    me.state = 'WaitForAnswer'
}

module.exports.Final = function(state,me){
    me.finished = true;
}