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

const correctAnswers = [
    {
      answerIndex: 0,
    },
    {
      answerIndex: 1,
    },
    {
      answerIndex: 3,
    },
    {
      answerIndex: 3,
    }
  ];

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
            question:{},
            playerAnswers: {}
        },
        moveFunction: function (player, move, state) {
            const playerRef = player.ref;
            const playerAnswered = move.answer;
            if(playerAnswered != undefined && questions[state.players[playerRef].currentQuestionIndex] != undefined){
                //Nameri dali e pravilen otgovora
                state.playerAnswers[playerRef] = {
                  yourAnswer:move.answer,
                  correctAnswer: correctAnswers[state.players[playerRef].currentQuestionIndex].answerIndex
                };
                const isAnswerCorrect =  correctAnswers[state.players[playerRef].currentQuestionIndex].answerIndex === playerAnswered;
                //Ako e correct da dadem to4ka
                if(isAnswerCorrect){
                    state.players[playerRef].score += 1;
                }
                state.players[playerRef].betweenQuestionsTime = TIME_BETWEEN_QUESTIONS;
            }

            state.players[playerRef].currentQuestionIndex += 1;

            if(questions[state.players[playerRef].currentQuestionIndex]){
                state.question[playerRef] = questions[state.players[playerRef].currentQuestionIndex]
            }
        },
        maxPlayers: 2, // Number of Players you want in a single game
        timeFunction: function (state) {
            Object.keys(state.players).forEach((playerRef) => {
                if(!state.players[playerRef].finished){
                  if(state.players[playerRef].betweenQuestionsTime){
                    state.players[playerRef].betweenQuestionsTime -= 1;
                    if(state.players[playerRef].betweenQuestionsTime <= 0){
                      state.players[playerRef].timeLeftToAnswer = TIME_TO_ANSWER;
                    }
                  }
                  else{
                    state.players[playerRef].timeLeftToAnswer -= 1;
  
                    if(state.players[playerRef].timeLeftToAnswer <= 0 && questions[state.players[playerRef].currentQuestionIndex] != undefined){
  
                      state.players[playerRef].currentQuestionIndex += 1;
                      state.question[playerRef] = questions[state.players[playerRef].currentQuestionIndex]
                      state.playerAnswers[playerRef] = {};
                      state.playerAnswers[playerRef].yourAnswer = undefined;
                      state.playerAnswers[playerRef].correctAnswer = correctAnswers[state.players[playerRef].currentQuestionIndex]?.answerIndex
                      state.players[playerRef].betweenQuestionsTime = TIME_BETWEEN_QUESTIONS;
                    }
                  }
  
                  if(state.players[playerRef].betweenQuestionsTime <= 0 && state.players[playerRef].currentQuestionIndex > (questions.length - 1) ){
                      state.players[playerRef].finished = true;
                  }
                }
            })
            
        },
        // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
        // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
        statePresenter: function (state, playerRef) {
            if(state.players[playerRef].betweenQuestionsTime > 0){
              
              return {
                  players:state.players,
                  question: questions[state.players[playerRef].currentQuestionIndex - 1],
                  me:{
                    ...state.players[playerRef],
                    yourAnswer:state.playerAnswers[playerRef].yourAnswer,
                    correctAnswer:state.playerAnswers[playerRef].correctAnswer
                  }
              };
            }
            return {
                players:state.players,
                question:state.question[playerRef],
                me:state.players[playerRef]
            };
        },
        connectFunction: function (state, playerRef) {
            state.players[playerRef] = {
                currentQuestionIndex: 0,
                timeLeftToAnswer: TIME_TO_ANSWER,
                betweenQuestionsTime: 0,
                finished:false,
                score: 0
            }
            state.question[playerRef] = questions[0]
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