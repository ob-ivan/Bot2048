var Bot2048 = (function () {

    const SIZE = 4;

    // class Field

    var Field = function () {
        this.values = [];
        for (var i = 0; i < SIZE; ++i) {
            this.values[i] = [];
            for (var j = 0; j < SIZE; ++j) {
                this.values[i][j] = 0;
            }
        }
    };
    Field.prototype.value = function (i, j, value) {
        // setter
        if (typeof value !== 'undefined') {
            this.values[i][j] = value;
            return this;
        }
        // getter
        return this.values[i][j];
    };
    Field.prototype.equals = function (field) {
        for (var i = 0; i < SIZE; ++i) {
            for (var j = 0; j < SIZE; ++j) {
                if (this.values[i][j] !== field.values[i][j]) {
                    return false;
                }
            }
        }
        return true;
    };

    // class Mutator

    var Mutator = function () {};
    Mutator.prototype.DOWN  = 0;
    Mutator.prototype.LEFT  = 1;
    Mutator.prototype.RIGHT = 2;
    Mutator.prototype.UP    = 3;
    Mutator.prototype.moveLeft = function (field) {
        var moved = new Field();
        for (var i = 0; i < SIZE; ++i) {
            var r = 0;
            var w = 0;
            for (var r = 0, w = 0; r < SIZE; ++r) {
                // Skip empty cells.
                if (! field.value(i, r)) {
                    continue;
                }
                // Find next non-empty cell.
                var found = false;
                for (var n = r + 1; n < SIZE; ++n) {
                    if (field.value(i, n)) {
                        found = true;
                        break;
                    }
                }
                if (found && field.value(i, r) === field.value(i, n)) {
                    // Combine.
                    moved.value(i, w, field.value(i, r) * 2);
                    r = n;
                } else {
                    // Keep.
                    moved.value(i, w, field.value(i, r));
                }
                ++w;
            }
        }
        return moved;
    };
    Mutator.prototype.transpose = function (field) {
        var transposed = new Field();
        for (var i = 0; i < SIZE; ++i) {
            for (var j = 0; j < SIZE; ++j) {
                transposed.value(i, j, field.value(j, i));
            }
        }
        return transposed;
    };
    Mutator.prototype.flipVertical = function (field) {
        var flipped = new Field();
        for (var i = 0; i < SIZE; ++i) {
            for (var j = 0; j < SIZE; ++j) {
                flipped.value(i, j, field.value(SIZE - 1 - i, j));
            }
        }
        return flipped;
    };
    Mutator.prototype.flipHorizontal = function (field) {
        var flipped = new Field();
        for (var i = 0; i < SIZE; ++i) {
            for (var j = 0; j < SIZE; ++j) {
                flipped.value(i, j, field.value(i, SIZE - 1 - j));
            }
        }
        return flipped;
    };
    Mutator.prototype.move  = function (field, direction) {
        switch (direction) {
            case this.DOWN  : return this.transpose(this.flipHorizontal(this.moveLeft(this.flipHorizontal(this.transpose(field)))));
            case this.RIGHT : return this.flipHorizontal(this.moveLeft(this.flipHorizontal(field)));
            case this.LEFT  : return this.moveLeft(field);
            case this.UP    : return this.transpose(this.moveLeft(this.transpose(field)));
        }
    };

    // class Bot2048

    var Bot2048 = function () {};

    Bot2048.Field = Field;

    Bot2048.Mutator = Mutator;

    Bot2048.prototype.makePositionSelector = function (i, j) {
        return ['.tile-container .tile-position', j + 1, i + 1].join('-');
    };

    // Read field from DOM.
    Bot2048.prototype.readField = function () {
        var field = new Field();
        for (var i = 0; i < 4; ++i) {
            for (var j = 0; j < 4; ++j) {
                var position = document.querySelector(
                    this.makePositionSelector(i, j)
                );
                if (position) {
                    field.value(i, j, parseInt(position.textContent));
                }
            }
        }
        return field;
    };

    return Bot2048;
})();

var bot = new Bot2048();
var field = bot.readField();
var mutator = new Bot2048.Mutator();
console.log(field);
console.log('move left',  mutator.move(field, mutator.LEFT));
console.log('move down',  mutator.move(field, mutator.DOWN));
console.log('move right', mutator.move(field, mutator.RIGHT));
console.log('move up',    mutator.move(field, mutator.UP));
