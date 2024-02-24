const e = require('express');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;
const delayStartBlocker = require('./blockers').delayStartBlocker
const { WaitForAnswer, BetweenQuestions, Answer, TimeExpired, Joker, Final, TIME_TO_ANSWER } = require('./stateFunctions');

// let consecutiveBonusMultipliers = [1, 1.1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5];
// let addBonus = (extraTime, bonusIndex) => {
//   return extraTime * consecutiveBonusMultipliers[bonusIndex];
// };
// score = score + addBonus(answer.extraTime, consecutiveIndex)


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


app.use('/static', express.static('public'))

newG({
    baseState: {
        players:{},
        questions:undefined,
        reserveQuestions:undefined
    },
    moveFunction: function (player, move, state) {
        const me = state.players[player.ref];
        if(move.joker){
          const jokerIndex = me.availableJokers.indexOf(move.joker)
          if(jokerIndex > -1){

            const spliced =  me.availableJokers.splice(jokerIndex, 1);

            me.usedJokerTemp.push(...spliced);
          }
        }
        else if(move.answer != undefined){
          me.answerIndex = move.answer;
        }

    },
    maxPlayers: 2, // Number of Players you want in a single game
    timeFunction: function (state) {
        Object.keys(state.players).forEach((playerRef) => {
            const me = state.players[playerRef];
            switch(me.state){
              case 'WaitForAnswer':
                WaitForAnswer(state,me)
              break;
              case 'Answer':
                Answer(state,me)
              break;
              case 'BetweenQuestions':
                BetweenQuestions(state,me)
              break;
              case 'TimeExpired':
                TimeExpired(state,me)
              break;
              case 'Final':
                Final(state,me)
              break;
              case 'Joker':
                Joker(state,me)
              break;

            }
        })
    },
    // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
    // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
    statePresenter: function (state, playerRef) {
        const me  = state.players[playerRef]
        switch(me.state){
          case 'BetweenQuestions':
              return {
                  players:state.players,
                  question: me.currentQuestion,
                  me:{
                    ...me,
                    yourAnswer:me.answeredIndex,
                    correctAnswer: me.currentQuestion.correctAnswer
                  }
              };
          case 'Final':
            return {
              me:me,
              players:state.players
            }
          default :
            return {
                players:state.players,
                question:{
                  ...me.currentQuestion,
                  correctAnswer: undefined
                },
                me:me,
            };
        }
    },
    connectFunction: function (state, playerRef) {
        state.players[playerRef] = {
            timeBetweenQuestionsCounter:0,
            timeToAnswerCounter:TIME_TO_ANSWER,
            finished: false,
            score: 0,
            username:'hui',

            usedJokerTemp:[],
            availableJokers: ['50na50','stealTime','changeQuestion'],
            answeredQuestion: undefined,
            currentQuestionIndex: 0,
            currentQuestion: undefined,

            state:'WaitForAnswer'

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