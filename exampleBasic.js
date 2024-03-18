const e = require('express');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;
const delayStartBlocker = require('./blockers').delayStartBlocker
const { WaitForAnswer, BetweenQuestions, Answer, TimeExpired, Joker, Final, TIME_TO_ANSWER } = require('./stateFunctions');
const { questionsPool } = require('./constants');

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

const questions = questionsPool;

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
                    yourAnswer:me.answerIndex,
                    correctAnswer: me.currentQuestion.correctAnswer
                  },
                  globalState: state.globalState
              };
          case 'Final':
            return {
              me:me,
              players:state.players,
              globalState: state.globalState
            }
          default :
            return {
                players:state.players,
                question:{
                  ...me.currentQuestion,
                  correctAnswer: undefined
                },
                me:{...me, currentQuestion: undefined},
                globalState: state.globalState
            };
        }
    },
    connectFunction: function (state, playerRef) {
        state.players[playerRef] = {
            timeBetweenQuestionsCounter:0,
            timeToAnswerCounter:TIME_TO_ANSWER,
            finished: false,
            score: 0,
            username: playerRef,
            consecutiveAnswers: 0,
            
            usedJokerTemp:[],
            availableJokers: ['50na50','stealTime','changeQuestion'],
            answeredQuestion: undefined,
            currentQuestionIndex: 0,
            currentQuestion: undefined,

            state:'WaitForAnswer'

        }
        const questionsAndReserve = generateRandomSubset(questions,15)
        state.questions = questionsAndReserve[0];
        state.reserveQuestions = questionsAndReserve[1];
        state.globalState = {
          questionsLength: state.questions.length
        }
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


http.listen(3001, function () {
    console.log('listening on *:3001');
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