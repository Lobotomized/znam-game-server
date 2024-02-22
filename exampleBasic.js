const e = require('express');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;
const delayStartBlocker = require('./blockers').delayStartBlocker


// let consecutiveBonusMultipliers = [1, 1.1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5];
// let addBonus = (extraTime, bonusIndex) => {
//   return extraTime * consecutiveBonusMultipliers[bonusIndex];
// };
// score = score + addBonus(answer.extraTime, consecutiveIndex)

const TIME_TO_ANSWER = 20;
const TIME_BETWEEN_QUESTIONS = 5;

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
function generateRandomSubset(arr, numElements) {
  if (numElements > arr.length || numElements <= 0) {
    throw new Error('Invalid number of elements requested');
  }
  
  const result = [];
  const rest = [];
  
  while (result.length < numElements) {
    const index = Math.floor(Math.random() * arr.length); // Generate a random index within the range of the original array's length
    
    // Check for duplicates to avoid including the same element twice
    if (!result.includes(arr[index])) {
      result.push(arr[index]);
    }
  }
  
  for (let i = 0; i < arr.length; i++) {
    if (!result.includes(arr[i])) {
      rest.push(arr[i]);
    }
  }
  
  return [result, rest];
}

const questions = [
  {
    _id: "1",
    title: "Коя година е създадена България?",
    answers: [
      {
        _id: "1.1",
        text: "681г.",
      },
      {
        _id: "1.2",
        text: "682г.",
      },
      {
        _id: "1.3",
        text: "680г.",
      },
      {
        _id: "1.4",
        text: "685г.",
      },
    ],
    correctAnswer:0,
  },
  {
    _id: "2",
    title: "Как се казвам?",
    answers: [
      {
        _id: "2.1",
        text: "Шави",
      },
      {
        _id: "2.2",
        text: "Алекс",
      },
      {
        _id: "2.3",
        text: "Ники",
      },
      {
        _id: "2.4",
        text: "Иво",
      },
    ],
    correctAnswer:1,
  },
  {
    _id: "3",
    title: "Какъв тест е това?",
    answers: [
      {
        _id: "3.1",
        text: "По български",
      },
      {
        _id: "3.2",
        text: "По математика???",
      },
      {
        _id: "3.3",
        text: "Образувателен",
      },
      {
        _id: "3.4",
        text: "Нещо друго",
      },
    ],
    correctAnswer:3,
  },
  {
    _id: "4",
    title: "Още един въпрос?",
    answers: [
      {
        _id: "4.1",
        text: "Отговор 1",
      },
      {
        _id: "4.2",
        text: "Отговор 2",
      },
      {
        _id: "4.3",
        text: "Правилен отговор",
      },
      {
        _id: "4.4",
        text: "Отговор 4",
      },
    ],
    correctAnswer:2,
  },
];



/*
type playersProgress = { [userID: string]: playerProgress };
type playerProgress = {
  currentQuestionIndex: number | null;
  timeLeftToAnswer: number;
  finished: boolean;
};

*/


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

app.use('/static', express.static('public'))

newG({
    baseState: {
        players:{},
        questions:undefined,
        reserveQuestions:undefined
    },
    moveFunction: function (player, move, state) {
        const playerRef = player.ref;

        const me = state.players[playerRef];
        if(move.joker){
          const jokerIndex = me.availableJokers.indexOf(move.joker)
          if(jokerIndex > -1){

            const spliced =  me.availableJokers.splice(jokerIndex, 1);

            me.usedJokerTemp.push(...spliced);
          }
          return;
        }
        else if(move.answer){
          //When Answer
          me.answeredIndex = move.answer;

          if(me.currentQuestionIndex < state.questions.length){
            me.currentQuestionIndex += 1;
          }
          else{
            me.finished = true;
          }
        } else if(move.joker){
          if(me.availableJokers.includes(move.joker)){
            me.availableJokers.splice(me.availableJokers.indexOf(move.joker),1);
          }
        }
    },
    maxPlayers: 2, // Number of Players you want in a single game
    timeFunction: function (state) {
        Object.keys(state.players).forEach((playerRef) => {
            const me = state.players[playerRef]

            if(!me.finished){
              if(me.timeBetweenQuestionsCounter > 0){
                me.usedJokerTemp = [];
                me.timeBetweenQuestionsCounter -= 1;
                return;
              }
              else if(me.timeBetweenQuestionsCounter === 0){
                me.timeToAnswerCounter = TIME_TO_ANSWER
                me.timeBetweenQuestionsCounter -= 1;
                if(state.questions[me.currentQuestionIndex]){
                  me.currentQuestion = JSON.parse(JSON.stringify(state.questions[me.currentQuestionIndex]))
                }
              }

              if(me.timeToAnswerCounter < 0){
                me.timeBetweenQuestionsCounter = TIME_BETWEEN_QUESTIONS;
                me.currentQuestionIndex += 1;
              }
              else{
                me.timeToAnswerCounter -= 1;
              }

              if(me.answeredIndex != undefined){
                if(me.timeBetweenQuestionsCounter < 0){
                  //check if answer correct
                  if(me.answeredIndex === me.currentQuestion.correctAnswer){
                    me.score += 5;
                  }
                  
                  me.timeBetweenQuestionsCounter = TIME_BETWEEN_QUESTIONS;
                  me.answeredIndex = undefined;
                }
              }

              if(me.usedJokerTemp.length){
                jokersFunk(state,me)
              }
            }
        })
        
    },
    // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
    // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
    statePresenter: function (state, playerRef) {
        const me  = state.players[playerRef]
        if(me.finished){
          return {
            me:me,
            players:state.players
          }
        }
        if(me.timeBetweenQuestionsCounter > 0){
          return {
              players:state.players,
              question: me.currentQuestion,
              me:{
                ...me,
                yourAnswer:me.answeredIndex,
                correctAnswer: me.currentQuestion.correctAnswer
              }
          };
        }
        return {
            players:state.players,
            question:{
              ...me.currentQuestion,
              correctAnswer: undefined
            },
            me:me,
        };
    },
    connectFunction: function (state, playerRef) {
        state.players[playerRef] = {
            timeBetweenQuestionsCounter:0,
            timeToAnswerCounter:120,
            finished: false,
            score: 0,
            username:'hui',
        
            usedJokerTemp:[],
            availableJokers: ['50na50','stealTime','changeQuestion'],
            answeredQuestion: undefined,
            currentQuestionIndex: 0,
            currentQuestion: undefined
            // timeLeftToAnswer: TIME_TO_ANSWER,c
            // betweenQuestionsTime: 0,
            // finished:false,
            // score: 0
        }
        const questionsAndReserve = generateRandomSubset(questions,3)
        state.questions = questionsAndReserve[0];
        state.reserveQuestions = questionsAndReserve[1];
    },
    disconnectFunction: function (state, playerRef) {
        state[playerRef] = undefined;
    },
    delay:500
},
io)


app.get('/', function (req, res) {
    return res.status(200).sendFile(__dirname + '/exampleBasic.html');
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});




/*
  player : {
    timeBetweenQuestionsCounter:30,
    timeToAnswerCounter:120,
    finished: true,
    score: 5,
    username:'hui',

    usedJokerTemp:[{}]
    availableJokers: ['50na50','stealTime','changeQuestion'],
    answeredQuestion: answeredIndex,
  }


  move: Сетваме, answeredIndex, usedJoker и availableJokers,


  timeFunction: 
    Проверяваме дали timeBetweenQuestionsCounter > 0. Махаме  usedJokerTemp e set na []. Ако е по-голямо от 0 не продължаваме нататък. Ако съществува извади 1.
    Ако е по-малко от 0 направи answeredIndex да е undefined и set timeTOAnswerCounter на константата му.
    Проверяваме дали timeToAnswerCounter < 0. Ако е по-малко от 0 сетваме timeBetweenQuestionsCounter на константата му. Иначе извади 1.
    Проверяваме дали answeredIndex съществува:
      Ако timeBetweenQuestionsCounter < 0   проверяваме дали отговора е верен и ако е верен отговор вдигаме score,
      set timeBetweenQuestionsCounter на константата му, 
    

  statePresenter:
    if betweenQuestionsTime > 0 показваме answeredQuestion и correctAnswer на стария въпрос. 
    else 
    

*/