module.exports.WaitForAnswer = function(state,me){
    me.timeToAnswerCounter -=1;
    if(me.answerIndex){
        me.state = 'Answer';
        return;
    }

    if(me.timeToAnswerCounter <= 0){
        me.state = 'TimeExpired';
        return;
    }

    if(me.usedJokerTemp.length){
        me.state = 'Joker';
        return;
    }
    
    
    
}

module.exports.BetweenQuestions = function(state,me){
    
}

module.exports.Answer = function(state,me){
    
    me.state = 'BetweenQuestions';
}



module.exports.TimeExpired = function(state,me){
    
    me.state = 'BetweenQuestions'
}



module.exports.Joker = function(state,me){
    
    me.state = 'WaitForAnswer'
}

module.exports.Finish = function(state,me){
    
}