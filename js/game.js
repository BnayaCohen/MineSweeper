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

// A Matrix containing cell objects
var gBoard
// Global object of game details
var gGame
// Array of the difficulties
var gLevel = [
    { SIZE: 4, MINES: 2 },
    { SIZE: 8, MINES: 12 },
    { SIZE: 12, MINES: 30 },
]

var gCurrGameLevel
var gTimerInterval
var gFirstClick
var gStartingLives


function initGame(gameLevel) {
    // reset all the variables
    clearInterval(gTimerInterval)
    if (gameLevel >= 0) gCurrGameLevel = gLevel[gameLevel]// in case that the its not by the click from the smiley

    gStartingLives = gCurrGameLevel.MINES < 3 ? gCurrGameLevel.MINES : 3
    gGame = {
        isOn: true,
        lives: gStartingLives,
        hints: 3,
        hintMode: false,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0
    }
    var elSpan = document.querySelector('.timer')
    elSpan.innerText = gGame.secsPassed
    elSpan = document.querySelector('.lives')
    elSpan.innerText = LIFE.repeat(gGame.lives)
    var elSmiley = document.querySelector('.smiley')
    elSmiley.innerText = NORMAL
    gFirstClick = true
    // Build an empty board
    gBoard = buildBoard()
    renderBoard(gBoard)
}

// fills the game board and starts the timer
function startGame(firstCellLocation) {
    fillBoard(firstCellLocation)
    gFirstClick = false
    startTimer()
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
}

// the first click on the board needs to be outside the 1st degree cells
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
            if (board[i][j].isMine) var cell = MINE
            else var cell = board[i][j].minesAroundCount ? board[i][j].minesAroundCount : ' '
            cell = '' ////////////
            var className = 'cell cell-' + i + '-' + j
            var clickFunction = 'onmousedown="(mouseClicked(event,this, ' + i + ', ' + j + '))" '
            strHTML += '<td ' + clickFunction + 'class="' + className + '"> ' + cell + ' </td>'
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

    if (!currCell.isMarked && !currCell.isShown) {
        if (gGame.hintMode) {
            revealHint({ i, j })
        } else {
            currCell.isShown = true
            gGame.shownCount++
            elCell.classList.add('shown')

            var cellValue = currCell.minesAroundCount ? currCell.minesAroundCount : ''
            elCell.innerText = currCell.isMine ? MINE_EXPLODE : cellValue
            if (!cellValue) expandShown(i, j)// expend if the cell value is empty - 0

            checkGameOver(currCell.isMine)
        }
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

// Consume hint
function useHint() {
    if (!gGame.hintMode && gGame.hints > 0) {
        gGame.hints--
        gGame.hintMode = true
        var elHint = document.querySelector('.hints')
        elHint.innerText = HINT.repeat(gGame.hints)
    }
}

//reveal all the neighbors of the current cell
function revealHint(cellLocation) {
    var revealedCells = []

    for (var i = cellLocation.i - 1; i <= cellLocation.i + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue

        for (var j = cellLocation.j - 1; j <= cellLocation.j + 1; j++) {
            if (j < 0 || j >= gBoard[i].length) continue

            if (!gBoard[i][j].isShown) {
                revealedCells.push([gBoard[i][j], i, j])
                var elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.classList.add('shown')
                var cellValue = gBoard[i][j].minesAroundCount ? gBoard[i][j].minesAroundCount : ''
                if (gBoard[i][j].isMine) cellValue = MINE
                elCell.innerText = cellValue
            }
        }
    }
    setTimeout(() => {
        for (var i = 0; i < revealedCells.length; i++) {
            if (!revealedCells[i][0].isShown) {
                var elCell = document.querySelector(`.cell-${revealedCells[i][1]}-${revealedCells[i][2]}`)
                elCell.classList.remove('shown')
                elCell.innerText = revealedCells[i][0].isMarked ? MARK_MINE : ''
            }
        }
        gGame.hintMode = false
    }, 1000)
}

// Checks if the game is over if he win of he lost all his lives by bombs
function checkGameOver(mineClicked = false) {
    // in case the he touched the mine
    // Remove 1 life or end the give if he dont have lives left
    if (mineClicked) {
        EXPLODE_AUDIO.play()
        if (gGame.lives === 1) {
            for (var i = 0; i < gBoard.length; i++) {
                for (var j = 0; j < gBoard[i].length; j++) {
                    if (gBoard[i][j].isMine && !gBoard[i][j].isShown) {
                        var elCell = document.querySelector(`.cell-${i}-${j}`)
                        elCell.innerText = MINE
                        elCell.classList.add('bomb-reveal')
                    }
                }
            }
            var elSmiley = document.querySelector('.smiley')
            elSmiley.innerText = DEAD
            gGame.isOn = false
        }
        else {
            gGame.lives--
            var elSpan = document.querySelector('.lives')
            elSpan.innerText = LIFE.repeat(gGame.lives)
        }
    } else if (gGame.markedCount === gCurrGameLevel.MINES - gStartingLives + gGame.lives) {
        // in case that he didnt clicked the mine check if he win

        var shownCellsNeeded = gCurrGameLevel.SIZE * gCurrGameLevel.SIZE - gCurrGameLevel.MINES
        if (gGame.shownCount - gStartingLives + gGame.lives === shownCellsNeeded) {
            gGame.isOn = false
            var elSmiley = document.querySelector('.smiley')
            elSmiley.innerText = WIN
        }
    }

    if (!gGame.isOn) clearInterval(gTimerInterval)
}

// shows the 1st degree neighbors of the current index of the board
function expandShown(rowIdx, colIdx) {
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue

        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= gBoard[i].length) continue
            if (i === rowIdx && j === colIdx) continue

            var currCell = gBoard[i][j]
            if (!currCell.isMarked && !currCell.isMine) {
                var elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.classList.add('shown')
                elCell.innerText = currCell.minesAroundCount ? currCell.minesAroundCount : ''
                if (!currCell.isShown) gGame.shownCount++
                currCell.isShown = true
                console.log(gGame.shownCount);
            }
        }
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