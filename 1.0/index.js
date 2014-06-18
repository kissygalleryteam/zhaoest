
KISSY.add(function (S, Node,Base) {
    var EMPTY = '';
    var $ = Node.all;
    function Zhaoest(size) {
	
		
		this.size           = size; // Size of the grid
		this.inputManager   = new KeyboardInputManager();
		this.storageManager = new LocalStorageManager();
		this.actuator       = new HTMLActuator();
		
		this.startTiles     = 2;

		this.inputManager.on("move", this.move.bind(this));
		this.inputManager.on("restart", this.restart.bind(this));
		this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

		this.setup();
    }
	
	Zhaoest.prototype = {
				restart: function () {
				  this.storageManager.clearGameState();
				  this.actuator.continueGame(); // Clear the game won/lost message
				  this.setup();
				},
				// Keep playing after winning (allows going over 2048)
				keepPlaying: function () {
				  this.keepPlaying = true;
				  this.actuator.continueGame(); // Clear the game won/lost message
				},
				// Return true if the game is lost, or has won and the user hasn't kept playing
				isGameTerminated: function () {
				  if (this.over || (this.won && !this.keepPlaying)) {
					return true;
				  } else {
					return false;
				  }
				},
				// Set up the game
				setup: function () {
				  var previousState = this.storageManager.getGameState();

				  // Reload the game from a previous game if present
				  if (previousState) {
					this.grid        = new Grid(previousState.grid.size,previousState.grid.cells); // Reload grid
					this.score       = previousState.score;
					this.over        = previousState.over;
					this.won         = previousState.won;
					this.keepPlaying = previousState.keepPlaying;
				  } else {
					this.grid        = new Grid(this.size);
					this.score       = 0;
					this.over        = false;
					this.won         = false;
					this.keepPlaying = false;
					// Add the initial tiles
					this.addStartTiles();
				  }
				  // Update the actuator
				  this.actuate();
				},
				// Set up the initial tiles to start the game with
				addStartTiles: function () {
				  for (var i = 0; i < this.startTiles; i++) {
					this.addRandomTile();
				  }
				},
				// Adds a tile in a random position
				addRandomTile: function () {
				  if (this.grid.cellsAvailable()) {
					var value = Math.random() < 0.9 ? 2 : 4;
					var tile = new Tile(this.grid.randomAvailableCell(), value);

					this.grid.insertTile(tile);
				  }
				},

				// Sends the updated grid to the actuator
				actuate: function () {
				  if (this.storageManager.getBestScore() < this.score) {
					this.storageManager.setBestScore(this.score);
				  }

				  // Clear the state when the game is over (game over only, not win)
				  if (this.over) {
					this.storageManager.clearGameState();
				  } else {
					this.storageManager.setGameState(this.serialize());
				  }

				  this.actuator.actuate(this.grid, {
					score:      this.score,
					over:       this.over,
					won:        this.won,
					bestScore:  this.storageManager.getBestScore(),
					terminated: this.isGameTerminated()
				  });

				},
				// Represent the current game as an object
				serialize: function () {
				  return {
					grid:        this.grid.serialize(),
					score:       this.score,
					over:        this.over,
					won:         this.won,
					keepPlaying: this.keepPlaying
				  };
				},
				// Save all tile positions and remove merger info
				prepareTiles: function () {
				  this.grid.eachCell(function (x, y, tile) {
					if (tile) {
					  tile.mergedFrom = null;
					  tile.savePosition();
					}
				  });
				},
				// Move a tile and its representation
				moveTile: function (tile, cell) {
				  this.grid.cells[tile.x][tile.y] = null;
				  this.grid.cells[cell.x][cell.y] = tile;
				  tile.updatePosition(cell);
				},
				// Move tiles on the grid in the specified direction
				move : function (direction) {
				  // 0: up, 1: right, 2: down, 3: left
				  var self = this;

				  if (this.isGameTerminated()) return; // Don't do anything if the game's over

				  var cell, tile;

				  var vector     = this.getVector(direction);
				  var traversals = this.buildTraversals(vector);
				  var moved      = false;

				  // Save the current tile positions and remove merger information
				  this.prepareTiles();

				  // Traverse the grid in the right direction and move tiles
				  traversals.x.forEach(function (x) {
					traversals.y.forEach(function (y) {
					  cell = { x: x, y: y };
					  tile = self.grid.cellContent(cell);

					  if (tile) {
						var positions = self.findFarthestPosition(cell, vector);
						var next      = self.grid.cellContent(positions.next);

						// Only one merger per row traversal?
						if (next && next.value === tile.value && !next.mergedFrom) {
						  var merged = new Tile(positions.next, tile.value * 2);
						  merged.mergedFrom = [tile, next];

						  self.grid.insertTile(merged);
						  self.grid.removeTile(tile);

						  // Converge the two tiles' positions
						  tile.updatePosition(positions.next);

						  // Update the score
						  self.score += merged.value;

						  // The mighty 2048 tile
						  //Adaption Start
						  //if (merged.value === 2048) self.won = true;
						  if (merged.value === (window.my_goal || 2048)) self.won = true;
						  //Adaption Close
						} else {
						  self.moveTile(tile, positions.farthest);
						}

						if (!self.positionsEqual(cell, tile)) {
						  moved = true; // The tile moved from its original cell!
						}
					  }
					});
				  });

				  if (moved) {
					this.addRandomTile();

					if (!this.movesAvailable()) {
					  this.over = true; // Game over!
					}

					this.actuate();
				  }
				},
				// Get the vector representing the chosen direction
				getVector: function (direction) {
				  // Vectors representing tile movement
				  var map = {
					0: { x: 0,  y: -1 }, // Up
					1: { x: 1,  y: 0 },  // Right
					2: { x: 0,  y: 1 },  // Down
					3: { x: -1, y: 0 }   // Left
				  };

				  return map[direction];
				},
				// Build a list of positions to traverse in the right order
				buildTraversals : function (vector) {
				  var traversals = { x: [], y: [] };

				  for (var pos = 0; pos < this.size; pos++) {
					traversals.x.push(pos);
					traversals.y.push(pos);
				  }

				  // Always traverse from the farthest cell in the chosen direction
				  if (vector.x === 1) traversals.x = traversals.x.reverse();
				  if (vector.y === 1) traversals.y = traversals.y.reverse();

				  return traversals;
				},
				findFarthestPosition: function (cell, vector) {
				  var previous;

				  // Progress towards the vector direction until an obstacle is found
				  do {
					previous = cell;
					cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
				  } while (this.grid.withinBounds(cell) &&
						   this.grid.cellAvailable(cell));

				  return {
					farthest: previous,
					next: cell // Used to check if a merge is required
				  };
				},
				movesAvailable: function () {
				  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
				},
				// Check for available matches between tiles (more expensive check)
				tileMatchesAvailable : function () {
				  var self = this;

				  var tile;

				  for (var x = 0; x < this.size; x++) {
					for (var y = 0; y < this.size; y++) {
					  tile = this.grid.cellContent({ x: x, y: y });

					  if (tile) {
						for (var direction = 0; direction < 4; direction++) {
						  var vector = self.getVector(direction);
						  var cell   = { x: x + vector.x, y: y + vector.y };

						  var other  = self.grid.cellContent(cell);

						  if (other && other.value === tile.value) {
							return true; // These two tiles can be merged
						  }
						}
					  }
					}
				  }
				  return false;
				},
				positionsEqual : function (first, second) {
				  return first.x === second.x && first.y === second.y;
				},

				localStorageSupported : function () {
				  var testKey = "test";
				  var storage = window.localStorage;

				  try {
					storage.setItem(testKey, "1");
					storage.removeItem(testKey);
					return true;
				  } catch (error) {
					return false;
				  }
				},
				// Best score getters/setters
				getBestScore : function () {
				  return this.storage.getItem(this.bestScoreKey) || 0;
				},
				setBestScore : function (score) {
				  this.storage.setItem(this.bestScoreKey, score);
				},
				// Game state getters/setters and clearing
				getGameState : function () {
				  var stateJSON = this.storage.getItem(this.gameStateKey);
				  return stateJSON ? JSON.parse(stateJSON) : null;
				},
				setGameState : function (gameState) {
				  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
				},
				clearGameState : function () {
				  this.storage.removeItem(this.gameStateKey);
				},
	};
	
	function LocalStorageManager() {
	  this.bestScoreKey     = "bestScore";
	  this.gameStateKey     = "gameState";

	  var supported = this.localStorageSupported();
	  this.storage = supported ? window.localStorage : window.fakeStorage;
	}
		
	LocalStorageManager.prototype = {
		localStorageSupported : function () {
		  var testKey = "test";
		  var storage = window.localStorage;

		  try {
			storage.setItem(testKey, "1");
			storage.removeItem(testKey);
			return true;
		  } catch (error) {
			return false;
		  }
		},
		// Best score getters/setters
		getBestScore : function () {
		  return this.storage.getItem(this.bestScoreKey) || 0;
		},
		setBestScore : function (score) {
		  this.storage.setItem(this.bestScoreKey, score);
		},
		// Game state getters/setters and clearing
		getGameState : function () {
		  var stateJSON = this.storage.getItem(this.gameStateKey);
		  return stateJSON ? JSON.parse(stateJSON) : null;
		},
		setGameState : function (gameState) {
		  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
		},
		clearGameState : function () {
		  this.storage.removeItem(this.gameStateKey);
		},
	};
	
	function KeyboardInputManager() {
	  this.events = {};

	  if (window.navigator.msPointerEnabled) {
		//Internet Explorer 10 style
		this.eventTouchstart    = "MSPointerDown";
		this.eventTouchmove     = "MSPointerMove";
		this.eventTouchend      = "MSPointerUp";
	  } else {
		this.eventTouchstart    = "touchstart";
		this.eventTouchmove     = "touchmove";
		this.eventTouchend      = "touchend";
	  }

	  this.listen();
	}
	
	KeyboardInputManager.prototype = {
			on : function (event, callback) {
			  if (!this.events[event]) {
				this.events[event] = [];
			  }
			  this.events[event].push(callback);
			},
			emit : function (event, data) {
			  var callbacks = this.events[event];
			  if (callbacks) {
				callbacks.forEach(function (callback) {
				  callback(data);
				});
			  }
			},
			listen : function () {
			  var self = this;

			  var map = {
				38: 0, // Up
				39: 1, // Right
				40: 2, // Down
				37: 3, // Left
				75: 0, // Vim up
				76: 1, // Vim right
				74: 2, // Vim down
				72: 3, // Vim left
				87: 0, // W
				68: 1, // D
				83: 2, // S
				65: 3  // A
			  };

			  // Respond to direction keys
			  document.addEventListener("keydown", function (event) {
				var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
								event.shiftKey;
				var mapped    = map[event.which];

				if (!modifiers) {
				  if (mapped !== undefined) {
					event.preventDefault();
					self.emit("move", mapped);
				  }
				}

				// R key restarts the game
				if (!modifiers && event.which === 82) {
				  self.restart.call(self, event);
				}
			  });

			  // Respond to button presses
			  this.bindButtonPress(".retry-button", this.restart);
			  this.bindButtonPress(".restart-button", this.restart);
			  this.bindButtonPress(".keep-playing-button", this.keepPlaying);

			  // Respond to swipe events
			  var touchStartClientX, touchStartClientY;
			  var gameContainer = document.getElementsByClassName("game-container")[0];

			  gameContainer.addEventListener(this.eventTouchstart, function (event) {
				if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
					event.targetTouches > 1) {
				  return; // Ignore if touching with more than 1 finger
				}

				if (window.navigator.msPointerEnabled) {
				  touchStartClientX = event.pageX;
				  touchStartClientY = event.pageY;
				} else {
				  touchStartClientX = event.touches[0].clientX;
				  touchStartClientY = event.touches[0].clientY;
				}

				event.preventDefault();
			  });

			  gameContainer.addEventListener(this.eventTouchmove, function (event) {
				event.preventDefault();
			  });

			  gameContainer.addEventListener(this.eventTouchend, function (event) {
				if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
					event.targetTouches > 0) {
				  return; // Ignore if still touching with one or more fingers
				}

				var touchEndClientX, touchEndClientY;

				if (window.navigator.msPointerEnabled) {
				  touchEndClientX = event.pageX;
				  touchEndClientY = event.pageY;
				} else {
				  touchEndClientX = event.changedTouches[0].clientX;
				  touchEndClientY = event.changedTouches[0].clientY;
				}

				var dx = touchEndClientX - touchStartClientX;
				var absDx = Math.abs(dx);

				var dy = touchEndClientY - touchStartClientY;
				var absDy = Math.abs(dy);

				if (Math.max(absDx, absDy) > 10) {
				  // (right : left) : (down : up)
				  self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
				}
			  });
			},
            restart : function (event) {
			  event.preventDefault();
			  this.emit("restart");
			},
			keepPlaying : function (event) {
			  event.preventDefault();
			  this.emit("keepPlaying");
			},
			bindButtonPress : function (selector, fn) {
			  var button = document.querySelector(selector);
			  button.addEventListener("click", fn.bind(this));
			  button.addEventListener(this.eventTouchend, fn.bind(this));
			}
	};

	function HTMLActuator() {
	  this.tileContainer    = document.querySelector(".tile-container");
	  this.scoreContainer   = document.querySelector(".score-container");
	  this.bestContainer    = document.querySelector(".best-container");
	  this.messageContainer = document.querySelector(".game-message");

	  this.score = 0;
	}
	
	HTMLActuator.prototype = {
		actuate : function (grid, metadata) {
		  var self = this;

		  window.requestAnimationFrame(function () {
			self.clearContainer(self.tileContainer);

			grid.cells.forEach(function (column) {
			  column.forEach(function (cell) {
				if (cell) {
				  self.addTile(cell);
				}
			  });
			});

			self.updateScore(metadata.score);
			self.updateBestScore(metadata.bestScore);

			//Adaption Start
			var maxScore = 0;
			for(i in grid.cells){
			  for(j in grid.cells[i]){
				if(grid.cells[i][j]){
				  maxScore = maxScore > grid.cells[i][j].value ? maxScore : grid.cells[i][j].value;
				}
			  }
			}
			//Adaption Close

			if (metadata.terminated) {
			  if (metadata.over) {
				//Adaption Start
				//self.message(false); // You lose 
				self.message(false, maxScore); // You lose 
				//Adaption Close
			  } else if (metadata.won) {
				self.message(true); // You win!
			  }
			}

		  });
		},
		// Continues the game (both restart and keep playing)
		continueGame : function () {
		  this.clearMessage();
		},
		clearContainer : function (container) {
		  while (container.firstChild) {
			container.removeChild(container.firstChild);
		  }
		},
		addTile : function (tile) {
		  var self = this;

		  var wrapper   = document.createElement("div");
		  var inner     = document.createElement("div");
		  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
		  var positionClass = this.positionClass(position);

		  // We can't use classlist because it somehow glitches when replacing classes
		  var classes = ["tile", "tile-" + tile.value, positionClass];

		  if (tile.value > 2048) classes.push("tile-super");

		  this.applyClasses(wrapper, classes);

		  inner.classList.add("tile-inner");
		  inner.textContent = tile.value;
		  //Adaption Start
		  if(window.my_list){
			inner.textContent = my_list[tile.value] || tile.value;
			if(inner.textContent.substring(0,4)=='http'){
			  inner.innerHTML = '<img src="'+inner.textContent+'" class="tile-inner"/>';
			}
			inner.style.fontSize = (1/inner.textContent.length * girdWidth)+ 'px';
			inner.style.fontFamily = '黑体';
		  }
		  //Adaption Close

		  if (tile.previousPosition) {
			// Make sure that the tile gets rendered in the previous position first
			window.requestAnimationFrame(function () {
			  classes[2] = self.positionClass({ x: tile.x, y: tile.y });
			  self.applyClasses(wrapper, classes); // Update the position
			});
		  } else if (tile.mergedFrom) {
			classes.push("tile-merged");
			this.applyClasses(wrapper, classes);

			// Render the tiles that merged
			tile.mergedFrom.forEach(function (merged) {
			  self.addTile(merged);
			});
		  } else {
			classes.push("tile-new");
			this.applyClasses(wrapper, classes);
		  }

		  // Add the inner part of the tile to the wrapper
		  wrapper.appendChild(inner);

		  // Put the tile on the board
		  this.tileContainer.appendChild(wrapper);
		},
        applyClasses : function (element, classes) {
		  element.setAttribute("class", classes.join(" "));
		},
		normalizePosition : function (position) {
		  return { x: position.x + 1, y: position.y + 1 };
		},
		positionClass : function (position) {
		  position = this.normalizePosition(position);
		  return "tile-position-" + position.x + "-" + position.y;
		},
		updateScore : function (score) {
		  this.clearContainer(this.scoreContainer);

		  var difference = score - this.score;
		  this.score = score;

		  this.scoreContainer.textContent = this.score;

		  if (difference > 0) {
			var addition = document.createElement("div");
			addition.classList.add("score-addition");
			addition.textContent = "+" + difference;

			this.scoreContainer.appendChild(addition);
		  }
		},
		updateBestScore : function (bestScore) {
		  this.bestContainer.textContent = bestScore;
		},
        message : function (won, score) {
		  var type    = won ? "game-won" : "game-over";
		  //Adaption Start
		  //var message = won ? "You win!" : "Game over!";
		  var message = won ? "恭喜，你可以用杜蕾斯了！" : (my_mark[score] || "Game over!");
		  //Adaption Close

		  this.messageContainer.classList.add(type);
		  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
		},
        clearMessage : function () {
		  // IE only takes one value to remove at a time.
		  this.messageContainer.classList.remove("game-won");
		  this.messageContainer.classList.remove("game-over");
		}	
	};
	
	function Grid(size, previousState) {
	  this.size = size;
	  this.cells = previousState ? this.fromState(previousState) : this.empty();
	}
	
	Grid.prototype = {
			// Build a grid of the specified size
		empty : function () {
		  var cells = [];

		  for (var x = 0; x < this.size; x++) {
			var row = cells[x] = [];

			for (var y = 0; y < this.size; y++) {
			  row.push(null);
			}
		  }

		  return cells;
		},

		fromState : function (state) {
		  var cells = [];

		  for (var x = 0; x < this.size; x++) {
			var row = cells[x] = [];

			for (var y = 0; y < this.size; y++) {
			  var tile = state[x][y];
			  row.push(tile ? new Tile(tile.position, tile.value) : null);
			}
		  }

		  return cells;
		},

		// Find the first available random position
		randomAvailableCell : function () {
		  var cells = this.availableCells();

		  if (cells.length) {
			return cells[Math.floor(Math.random() * cells.length)];
		  }
		},

		availableCells : function () {
		  var cells = [];

		  this.eachCell(function (x, y, tile) {
			if (!tile) {
			  cells.push({ x: x, y: y });
			}
		  });

		  return cells;
		},

		// Call callback for every cell
		eachCell : function (callback) {
		  for (var x = 0; x < this.size; x++) {
			for (var y = 0; y < this.size; y++) {
			  callback(x, y, this.cells[x][y]);
			}
		  }
		},

		// Check if there are any cells available
		cellsAvailable : function () {
		  return !!this.availableCells().length;
		},

		// Check if the specified cell is taken
		cellAvailable : function (cell) {
		  return !this.cellOccupied(cell);
		},

		cellOccupied : function (cell) {
		  return !!this.cellContent(cell);
		},

		cellContent : function (cell) {
		  if (this.withinBounds(cell)) {
			return this.cells[cell.x][cell.y];
		  } else {
			return null;
		  }
		},
		// Inserts a tile at its position
		insertTile : function (tile) {
		  this.cells[tile.x][tile.y] = tile;
		},
        removeTile : function (tile) {
		  this.cells[tile.x][tile.y] = null;
		},
        withinBounds : function (position) {
		  return position.x >= 0 && position.x < this.size &&
				 position.y >= 0 && position.y < this.size;
		},
		serialize : function () {
		  var cellState = [];

		  for (var x = 0; x < this.size; x++) {
			var row = cellState[x] = [];

			for (var y = 0; y < this.size; y++) {
			  row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
			}
		  }

		  return {
			size: this.size,
			cells: cellState
		  };
		}
	};
	
	function Tile(position, value) {
	  this.x                = position.x;
	  this.y                = position.y;
	  this.value            = value || 2;

	  this.previousPosition = null;
	  this.mergedFrom       = null; // Tracks tiles that merged together
	}
	
	Tile.prototype = {
		savePosition : function () {
		  this.previousPosition = { x: this.x, y: this.y };
		},

		updatePosition : function (position) {
		  this.x = position.x;
		  this.y = position.y;
		},

		serialize : function () {
		  return {
			position: {
			  x: this.x,
			  y: this.y
			},
			value: this.value
		  };
		}
		

	};
	
	
    return Zhaoest;
}, {requires:['node', 'base']});



