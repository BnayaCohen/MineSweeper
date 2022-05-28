'use strict'
window.addEventListener("contextmenu", e => e.preventDefault());

const MINE = '💣'
const MINE_EXPLODE = '💥'
const MARK_MINE = '🚩'
const LIFE = '💖'
const NORMAL = '🙂'
const DEAD = '💩'
const WIN = '🤑'
const HINT = '💡'
const EXPLODE_AUDIO = new Audio('snd/Explode.aac')
const HINT_AUDIO = new Audio('snd/Hint.aac')

// A Matrix containing cell objects
var gBoard
// Global object of game details
var gGame
// Array of the difficulties
var gLevel = [
    { ID: 'Explorer', SIZE: 4, MINES: 2 },
    { ID: 'Normal', SIZE: 8, MINES: 12 },
    { ID: 'Hell Mode', SIZE: 12, MINES: 30 },
]

var gCurrGameLevel
var gTimerInterval
var gFirstClick
var gStartingLives
var gManualMode
var gManualCreateCount
var gGameMoves
var gMovesCount
var gWasMove


// reset all the variables
function initGame(gameLevel) {
    clearInterval(gTimerInterval)
    // in case that the its not by the click from the smiley
    if (gameLevel >= 0) gCurrGameLevel = gLevel[gameLevel]

    gStartingLives = gCurrGameLevel.MINES < 3 ? gCurrGameLevel.MINES : 3
    gGame = {
        isOn: true,
        isBoardFilled: false,
        lives: gStartingLives,
        hints: 3,
        hintMode: false,
        safeClicks: 3,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0
    }
    var elTimer = document.querySelector('.timer')
    elTimer.innerText = gGame.secsPassed

    var elLives = document.querySelector('.lives')
    elLives.innerText = LIFE.repeat(gGame.lives)

    var elSmiley = document.querySelector('.smiley')
    elSmiley.innerText = NORMAL

    var elHint = document.querySelector('.hints')
    elHint.innerText = HINT.repeat(gGame.hints)

    var elBestScore = document.querySelector('.best-score')
    var currScore = getScore(gCurrGameLevel) ? getScore(gCurrGameLevel) : '?'
    elBestScore.innerText = 'Best Score In ' + gCurrGameLevel.ID + ' is- ' + currScore

    var elSafeClick = document.querySelector('.safe-click')
    elSafeClick.innerText = gGame.safeClicks

    var elBtnManualCreate = document.querySelector('.manual-create')
    elBtnManualCreate.style.backgroundColor = "#595041"
    elBtnManualCreate.innerText = 'Manual Create'

    var elBtnSevenBoom = document.querySelector('.seven-boom')
    elBtnSevenBoom.style.backgroundColor = "#595041"

    gFirstClick = true
    gManualMode = false
    gManualCreateCount = 0
    gGameMoves = []
    gGameMoves.push([])
    gMovesCount = 0
    gWasMove = false

    // Build an empty board
    gBoard = buildBoard()
    renderBoard(gBoard)
}

// fills the game board and starts the timer
function startGame(firstCellLocation) {
    if (!gManualMode) {
        if (!gGame.isBoardFilled) fillBoard(firstCellLocation)
        gFirstClick = false
        startTimer()
    }
}

// Builds empty board
function buildBoard() {
    var board = [];

    for (var i = 0; i < gCurrGameLevel.SIZE; i++) {
        board.push([]);
        for (var j = 0; j < gCurrGameLevel.SIZE; j++) {
            board[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false,
            }
        }
    }
    return board;
}

// Fill the board with all the elements execpt the cell location
function fillBoard(cellLocation) {
    // Set the mines randomly
    for (var i = 0; i < gCurrGameLevel.MINES; i++) {
        var iIdx = getRandomIntInclusive(0, gBoard.length - 1)
        var jIdx = getRandomIntInclusive(0, gBoard.length - 1)
        // To makes sure the new cell is not with a mine
        while (gBoard[iIdx][jIdx].isMine
            || !isValidCellForMineAtFirstTime(cellLocation, { i: iIdx, j: jIdx })) {
            iIdx = getRandomIntInclusive(0, gBoard.length - 1)
            jIdx = getRandomIntInclusive(0, gBoard.length - 1)
        }
        gBoard[iIdx][jIdx].isMine = true
    }
    // Updates the neighbors count around every mine
    setMinesNegsCount(gBoard)
    gGame.isBoardFilled = true
}

// the first click on the board needs to be without mines on the 1st degree cells
function isValidCellForMineAtFirstTime(cellLocation, mineLocation) {
    return !((cellLocation.i - 1 <= mineLocation.i && mineLocation.i <= cellLocation.i + 1)
        && (cellLocation.j - 1 <= mineLocation.j && mineLocation.j <= cellLocation.j + 1))
}

// Counts the neighbors around the mines
function setMinesNegsCount(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[i].length; j++) {
            if (board[i][j].isMine)
                addCountAroundMine(board, i, j)
        }
    }
}

// Add 1 for every cell around the mine
function addCountAroundMine(board, rowIdx, colIdx) {
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= board.length) continue

        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= board[i].length) continue
            if (i === rowIdx && j === colIdx) continue

            board[i][j].minesAroundCount++
        }
    }
}

// renders the board to the DOM
function renderBoard(board) {
    var strHTML = '<table><tbody>';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>'
        for (var j = 0; j < board[i].length; j++) {
            var className = 'cell cell-' + i + '-' + j + ' not-shown'
            var clickFunction = 'onmousedown="(mouseClicked(event,this, ' + i + ', ' + j + '))" '
            strHTML += '<td ' + clickFunction + 'class="' + className + '"></td>'
        }
        strHTML += '</tr>'
    }
    strHTML += '</tbody></table>'

    var elContainer = document.querySelector('.board-container')
    elContainer.innerHTML = strHTML
}

function mouseClicked(e, elCell, i, j) {
    if (gGame.isOn) {
        switch (e.which) {
            case 1: cellClicked(elCell, i, j)
                break
            case 3: cellMarked(elCell, i, j)
                break
        }
    }
}

// Left click on the mouse
function cellClicked(elCell, i, j) {

    if (gFirstClick) startGame({ i, j })

    var currCell = gBoard[i][j]

    if (gManualMode) {
        if (!currCell.isMine) {
            // Update the model
            gManualCreateCount++
            currCell.isMine = true
            // Update the DOM
            elCell.innerText = MINE
        }
    } else if (gGame.hintMode) {
        revealHint({ i, j })
    } else if(!currCell.isShown) {
        if (revealedCellIsEmpty({ i, j })) expandShown(i, j)// expend if the cell value is empty - 0
        // Handle if its a case of mine
        if (currCell.isMine) {
            elCell.innerText = MINE_EXPLODE
            currCell.isShown = true
            gGameMoves[gMovesCount].push([currCell, { i, j }])
            gWasMove = true
            //DOM
            elCell.classList.add('shown')
            elCell.classList.remove('not-shown')
        }
        // UPdate the moves array
        if (gWasMove) {
            gMovesCount++
            gGameMoves.push([])
            gWasMove = false
        }
        console.log(gGameMoves);
        checkGameOver(currCell.isMine)
    }

}

// Right click on the mouse
function cellMarked(elCell, i, j) {
    if (!gBoard[i][j].isShown && !gGame.hintMode) {
        if (!gBoard[i][j].isMarked) {
            elCell.innerText = MARK_MINE
            gGame.markedCount++
            gBoard[i][j].isMarked = true
        } else {
            elCell.innerText = ' '
            gGame.markedCount--
            gBoard[i][j].isMarked = false
        }

        checkGameOver()
    }
}

// Checks if the game is over if he win of he lost all his lives by bombs
function checkGameOver(mineClicked = false) {
    // in case the he touched the mine
    // Remove 1 life or end the give if he dont have lives left
    if (mineClicked) {
        EXPLODE_AUDIO.play()
        var elSpan = document.querySelector('.lives')
        if (gGame.lives === 1) {
            for (var i = 0; i < gBoard.length; i++) {
                for (var j = 0; j < gBoard[i].length; j++) {
                    if (gBoard[i][j].isMine && !gBoard[i][j].isShown) {
                        var elCell = document.querySelector(`.cell-${i}-${j}`)
                        elCell.innerText = MINE
                        elCell.classList.add('mine-reveal')
                    }
                }
            }
            var elSmiley = document.querySelector('.smiley')
            elSmiley.innerText = DEAD
            elSpan.innerText = ''
            gGame.isOn = false
        }
        else {
            gGame.lives--
            elSpan.innerText = LIFE.repeat(gGame.lives)
        }
    } else if (gGame.markedCount === gCurrGameLevel.MINES - gStartingLives + gGame.lives) {
        // in case that he didnt clicked the mine check if he win

        var shownCellsNeeded = gCurrGameLevel.SIZE * gCurrGameLevel.SIZE - gCurrGameLevel.MINES
        if (gGame.shownCount === shownCellsNeeded) {//- gStartingLives + gGame.lives 
            gGame.isOn = false
            var elSmiley = document.querySelector('.smiley')
            elSmiley.innerText = WIN
            updateScore(gCurrGameLevel, gGame.secsPassed)
        }
    }

    if (!gGame.isOn) clearInterval(gTimerInterval)
}

//reavel the cell and return if it was empty // Not exclusive for mines and marked cells
function revealedCellIsEmpty(location) {
    var isEmpty = false

    var currCell = gBoard[location.i][location.j]
    if (!currCell.isMarked && !currCell.isMine) {
        // MODEL
        if (!currCell.isShown) gGame.shownCount++
        currCell.isShown = true
        //DOM
        var elCell = document.querySelector(`.cell-${location.i}-${location.j}`)
        elCell.classList.add('shown')
        elCell.classList.remove('not-shown')
        var minesCount = currCell.minesAroundCount
        if (minesCount) elCell.innerText = minesCount
        else {
            elCell.innerText = ''
            isEmpty = true
        }
        // Add the cell to moves array for the 'undo' function
        gGameMoves[gMovesCount].push([currCell, location])
        gWasMove = true
    }

    return isEmpty
}

// Recursion function to expend all the empty cells
function expandShown(rowIdx, colIdx) {
    var i = rowIdx ? rowIdx - 1 : 0
    while (i <= rowIdx + 1) {
        if (i === gBoard.length) break

        var j = colIdx ? colIdx - 1 : 0
        while (j <= colIdx + 1) {
            if (j === gBoard[0].length) break

            if (!gBoard[i][j].isShown) {
                if (revealedCellIsEmpty({ i, j })) expandShown(i, j)
            }
            j++
        }
        i++
    }
}

function startTimer() {
    var startTime = Date.now()

    gTimerInterval = setInterval(() => {
        gGame.secsPassed = ((Date.now() - startTime) / 1000).toFixed(1)
        var elSpan = document.querySelector('.timer')
        elSpan.innerText = gGame.secsPassed

    }, 100)
}

// Using the local storage
function updateScore(level, score) {
    if (localStorage.getItem(level.ID) < score)
        localStorage.setItem(level.ID, score)
}
function getScore(level) {
    return localStorage.getItem(level.ID)
}