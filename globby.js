const newGame = function(properties){
    let baseState = properties.baseState || {};
    
    const timeFunction = properties.timeFunction || function(player,move,state){};
    const moveFunction = properties.moveFunction || function(state){};
    const maxPlayers = properties.maxPlayers || 2;
    const minPlayers = properties.minPlayers || maxPlayers;
    const statePresenter = properties.statePresenter || function(copyState,playerRef){
        return copyState
    }

    const connectFunction = properties.connectFunction || function(state,playerRef){

    }
    
    const disconnectFunction = properties.disconnectFunction || function(state,playerRef){

    }

    const startBlockerFunction = properties.startBlockerFunction || function(minPlayers,maxPlayers,currentPlayers,state){
        /* 
            Return Undefined to start game and an object to block
        */
        if(minPlayers == maxPlayers){
            //Nqma custom minPlayers ot suzdatelq
            if(state.started){
                return;
            }
            else if(!state.started && currentPlayers.length == maxPlayers){
                state.started = true;
            }
            else{
                return {message:"Not Enough Players To Start",required:minPlayers,current:currentPlayers.length}; // Return object while you want users to join the same room
            }
        }
        else{
            if(currentPlayers.length < minPlayers && !state.started){
                return {message:"Not Enough Players To Start",required:minPlayers,current:currentPlayers.length}; // Return object while you want users to join the same room
            }
            else{
                state.started = true;
                return;// Return undefined when you want the user to join new game
            }
        }
    }

    const allowJoinFunction = properties.joinBlockerFunction || function(minPlayers,maxPlayers,currentPlayers,state){
        /*
        Return true if you want the user to join the same room AND false to return a new room
        */
        if(minPlayers == maxPlayers){
            //Nqma custom minPlayers ot suzdatelq
            if(!state.started){
                return true // Return true if you want users to join the same room
            }
            else{
                return false //Return false if you want a new room to be open for the user
            }
        }
        else{
            if(currentPlayers.length < maxPlayers){
                return true;// Return false when you want the user to join a new game
            }
            else{
                return false;
            }
        }


        
    }

    const lobby = function(){
        this.games = [];
        
  
        this.gamesNum = function(){
            return games.length
        }

        this.joinSpecificGame = function(gameId,playerId){
            let ga = this.games.find((g) => {
                return g.players.find((player) => {
                    return player.id == playerId;
                })
            })
            
            if(!ga){
                ga = this.games.find((g) => {
                    let st =  g.returnState(playerId);
                    return allowJoinFunction(minPlayers,maxPlayers,st.players,st)
                })

                if(ga){
                    ga.join(playerId);
                }
            }
            else{
                ga = new g(gameId);
                this.games.push(ga)
                ga.join(playerId)
            }
        }
  
        this.joinGame = function(playerId){
            let ga = this.games.find((g) => {
                return g.players.find((player) => {
                    return player.id == playerId;
                })
            })
  
            if(!ga){
                ga = this.games.find((g) => {
                    let st =  g.returnState(playerId);
                    return allowJoinFunction(minPlayers,maxPlayers,st.players,st)
                })
                if(ga){
                    ga.join(playerId);
                }
            }
            if(!ga){
                ga = new g();
                this.games.push(ga)
                ga.join(playerId)
            }
            return ga.returnState(playerId);
        }

        
  
        this.move = function(playerId,move){
            let ga = this.games.find((g) => {
                return g.players.find((player) => {
                    return player.id == playerId;
                })
            })
  
            
            if(!ga){
                return
            }
            
            return ga.move(playerId,move);
        }
    }
  
    function g(){
  
            let state = JSON.parse(JSON.stringify(baseState));
            state.playersConfigArray = this.players;
            
            this.playerId = '';
            this.players = [];
  
            this.move = (playerId,move) => {
                let player = state.playersConfigArray.find((pl) => {
                    return pl.id == playerId
                })

                const blocker = startBlockerFunction(minPlayers,maxPlayers,state.playersConfigArray,state)

                if(blocker !=undefined){
                    return blocker;
                }

                moveFunction(player, move,state)
                return this.returnState(playerId);
            }

            this.timeFunction = (playerId) => {
                
                const blocker = startBlockerFunction(minPlayers,maxPlayers,state.playersConfigArray,state)

                if(blocker !=undefined){
                    return blocker;
                }

                if(timeFunction != undefined){
                    timeFunction(state,playerId)
                }

                return this.returnState(playerId);
            }
  
            this.returnState = (playerId) => {
                let copyState =  JSON.parse(JSON.stringify(state));
                let player = state.playersConfigArray.find((pl) => {
                    return pl.id == playerId
                })
                if(player){
                     
                    copyState = statePresenter(copyState,player.ref)
                }
                return copyState
            }
  
            this.join = (playerId) => {
                    const player = {id:playerId,ref:'player'+(this.players.length+1)}
                    this.players.push(player);
  
                    state.playersConfigArray = this.players;
                    
                    connectFunction(state,player.ref)
                    return this.returnState(playerId);
     
            }
            this.disconnect = (playerId) => {
                    let pl =this.players.find((pl) => {
                        return pl.id == playerId;
                    })
                    this.players.splice(this.players.indexOf(pl),1);

                    disconnectFunction(state,pl.ref)
            }
        }
  
    return lobby
  
  }


module.exports.newGame =  newGame;


module.exports.newIOServer = function newServer(properties,io){
    let g = newGame(properties);
    const frameRate = properties.delay || 100;
    const lobby = new g();
    
    const helperFunctionDelay = function(){
        setTimeout(()=>{
            lobby.games.forEach((game) => {
                if(!game.players.length){
                    lobby.games.splice(lobby.games.indexOf(game),1)
                }
                else{
                    game.players.forEach((player) => {
                        io.to(player.id).emit('returnState',game.timeFunction(player.id))
                    })
                }
            })
            helperFunctionDelay();
        },frameRate)
    }
    helperFunctionDelay();

    io.on('connection', function(socket){
        socket.on('disconnect', () => {
            let game  = lobby.games.find((game) =>{
                let isThisIt = false;

                game.players.forEach((player) => {
                    if(player.id === socket.id){
                        isThisIt = true;
                    }
                })

                return isThisIt;
            })

            game.disconnect(socket.id)
            if(!game.players.length){
                lobby.games.splice(lobby.games.indexOf(game), 1)
            }

        })
        
        lobby.joinGame(socket.id)


        socket.on('games', () => {
            io.to(socket.id).emit('games',lobby.games)
        })
        
        socket.on('move', (data) =>{
          let state = lobby.move(socket.id,data);
          if(state.playersConfigArray){
            state.playersConfigArray.forEach((pl) => {
                io.to(pl.id).emit('returnState', state)
             })
          }

        })
      });
}
