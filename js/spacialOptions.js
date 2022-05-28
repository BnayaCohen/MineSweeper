// Start the option of the manual create
function manualCreate(elBtn) {
    if (!gManualMode) {
        initGame(-1)
        gManualMode = true
        elBtn.style.backgroundColor = "#71a0d6"
        elBtn.innerText = '-Finish Create-'
    } else if (gManualCreateCount > 0 && !gGame.isBoardFilled) {
        fillManualBoard()
        gCurrGameLevel.MINES = gManualCreateCount
        gManualMode = false
        gStartingLives = gCurrGameLevel.MINES < 3 ? gCurrGameLevel.MINES : 3
        gGame.lives = gStartingLives
        var elLives = document.querySelector('.lives')
        elLives.innerText = LIFE.repeat(gGame.lives)
        elBtn.innerText = 'Play!'
    }
}

// Updates the board with the mines and hide all the bombs from the DOM
function fillManualBoard() {
    // Hide the placed bombs
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard.length; j++) {
            var elCell = document.querySelector(`.cell-${i}-${j}`)
            elCell.innerText = ''
        }
    }

    // Updates the neighbors count around every mine
    setMinesNegsCount(gBoard)
    gGame.isBoardFilled = true
}

function undo() {
    if (gGameMoves.length > 1 && gGame.isOn) {
        // Set an array of the last moves and deletes him from the array
        var undoMoves = gGameMoves.splice(gGameMoves.length - 2, 1)[0]
        // Starts to unshow every cell 
        for (var i = 0; i < undoMoves.length; i++) {
            var undoCell = undoMoves[i][0]
            //MODEL
            undoCell.isShown = false
            if (!undoCell.isMine) gGame.shownCount--
            else {
                gGame.lives++
                //DOM
                var elLives = document.querySelector('.lives')
                elLives.innerText = LIFE.repeat(gGame.lives)
            }
            //DOM
            var cellLocation = undoMoves[i][1]
            var elCell = document.querySelector(`.cell-${cellLocation.i}-${cellLocation.j}`)
            elCell.classList.remove('shown')
            elCell.classList.add('not-shown')
            elCell.innerText = ''
        }
        // Set the counter 1 move backward
        gMovesCount--
    }
}

// Restarts the game and sets the board to 7 boom
function sevenBoom(elBtn) {
    initGame(-1)
    fillBoardSevenBoom()
    elBtn.style.backgroundColor = "#71a0d6"
}

// Fill the board in mines by the rules of the 7 boom
function fillBoardSevenBoom() {
    var sevenBoomCount = -1
    gCurrGameLevel.MINES = 0

    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[i].length; j++) {
            sevenBoomCount++ // index starts from 0
            if (sevenBoomCount % 7 === 0 && sevenBoomCount !== 0) {
                gBoard[i][j].isMine = true
                gCurrGameLevel.MINES++
                continue
            }
            var countStr = sevenBoomCount + ''
            for (var d = 0; d < countStr.length; d++)
                if (countStr.charAt(d) === '7') {
                    gBoard[i][j].isMine = true
                    gCurrGameLevel.MINES++
                    break
                }
        }
    }
    // Updates the neighbors count around every mine
    setMinesNegsCount(gBoard)
    gGame.isBoardFilled = true
}

// Consume hint
function useHint() {
    if (!gGame.hintMode && gGame.hints > 0 && gGame.isOn && !gManualMode) {
        HINT_AUDIO.play()
        gGame.hints--
        gGame.hintMode = true
        var elHint = document.querySelector('.hints')
        elHint.innerText = HINT.repeat(gGame.hints)
        // Show animation
        var elHintAnimation = document.getElementById('hint-mode-container')
        elHintAnimation.style.display = 'flex'
        elHintAnimation.style.animation = "show-hint 1.5s cubic-bezier(0, 0, 0.04, 0.99)";
        setTimeout(() => { elHintAnimation.style.display = 'none' }, 1500)

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

// Shows random cell that is safe to click for 2 seconds
function safeClick() {
    if (gGame.isOn && gGame.safeClicks > 0) {
        gGame.safeClicks--
        var elSafeClick = document.querySelector('.safe-click')
        elSafeClick.innerText = gGame.safeClicks

        var randomCellLocation = getRandEmptyCell()
        if (!randomCellLocation) return
        var elCell = document.querySelector(`.cell-${randomCellLocation.i}-${randomCellLocation.j}`)
        elCell.classList.add('show-safe-click')

        setTimeout(() => {
            elCell.classList.remove('show-safe-click')
        }, 2000)
    }
}

// Returns a location of an empty cell that not revealed
function getRandEmptyCell() {
    var emptyCells = [];
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[i].length; j++) {
            if (!gBoard[i][j].isMine && !gBoard[i][j].isShown) emptyCells.push({ i, j })
        }
    }
    var emptyCellIdx = getRandomIntInclusive(0, emptyCells.length - 1)
    return emptyCells[emptyCellIdx]
}