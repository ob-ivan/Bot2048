
var Bot2048 = (function () {

    const SIZE = 4;

    var Class = (function () {
        var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

        // The base Class implementation (does nothing)
        var Class = function () {};

        // Create a new Class that inherits from this class
        Class.extend = function extend(prop) {
            var _super = this.prototype;

            // Instantiate a base class (but only create the instance,
            // don't run the init constructor)
            initializing = true;
            var prototype = new this();
            initializing = false;

            // Copy the properties over onto the new prototype
            for (var name in prop) {
                // Check if we're overwriting an existing function
                prototype[name] = typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test(prop[name])
                    ? (function (name, fn) {
                        return function() {
                            var tmp = this._super;

                            // Add a new ._super() method that is the same method
                            // but on the super-class
                            this._super = _super[name];

                            // The method only need to be bound temporarily, so we
                            // remove it when we're done executing
                            var ret = fn.apply(this, arguments);
                            this._super = tmp;

                            return ret;
                        };
                    })(name, prop[name])
                    : prop[name];
            }

            // The dummy class constructor
            function Class() {
                if (initializing) {
                    return;
                }

                // Bind public properties to public object.
                var _public = {};
                for (var property in this) {
                    if (! /^_/.test(property) && typeof this[property] === 'function') {
                        _public[property] = this[property].bind(this);
                    }
                }
                this._public = _public;

                if (this.__construct) {
                    this.__construct.apply(this, arguments);
                }

                return _public;
            }
            Class.prototype = prototype;
            Class.prototype.constructor = Class;
            Class.extend = extend;

            return Class;
        };

        return Class;
    })();

    //////////////////////////////////////////// Model ////////////////////////////////////////////

    var CodeConverter = Class.extend({
        __construct : function () {
            this.logCache = {
                0 : 0,
                1 : 0
            };
            this.charCache = {
                0 : '0',
                1 : '0',
            };
        },
        log2 : function (value) {
            if (typeof this.logCache[value] === 'undefined') {
                this.logCache[value] = 1 + this.log2(Math.floor(value / 2));
            }
            return this.logCache[value];
        },
        valueToChar : function (value) {
            if (! this.charCache[value]) {
                this.charCache[value] = this.log2(value).toString(16);
            }
            return this.charCache[value];
        }
    });
    var codeConverter = new CodeConverter();

    var Field = Class.extend({
        SIZE : SIZE,
        __construct : function (values) {
            this.values = [];
            for (var i = 0; i < this.SIZE; ++i) {
                this.values[i] = [];
                for (var j = 0; j < this.SIZE; ++j) {
                    this.values[i][j] = values[i][j];
                }
            }
        },
        getValue : function (i, j) {
            return this.values[i][j];
        },
        getCode : function () {
            if (typeof this.code === 'undefined') {
                var chars = [];
                for (var i = 0; i < this.SIZE; ++i) {
                    for (var j = 0; j < this.SIZE; ++j) {
                        chars.push(codeConverter.valueToChar(this.values[i][j]));
                    }
                }
                this.code = chars.join('');
            }
            return this.code;
        },
        equals : function (field) {
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    if (this.values[i][j] !== field.getValue(i, j)) {
                        return false;
                    }
                }
            }
            return true;
        }
    });

    var FieldBuilder = Class.extend({
        SIZE : SIZE,
        __construct : function () {
            this.values = [];
            for (var i = 0; i < this.SIZE; ++i) {
                this.values[i] = [];
                for (var j = 0; j < this.SIZE; ++j) {
                    this.values[i][j] = 0;
                }
            }
        },
        setValue : function (i, j, value) {
            this.values[i][j] = value;
            return this._public;
        },
        produce : function () {
            return new Field(this.values);
        }
    });

    var Direction = {
        DOWN  : 0,
        LEFT  : 1,
        RIGHT : 2,
        UP    : 3,
        all   : function () {
            return [
                this.DOWN,
                this.LEFT,
                this.RIGHT,
                this.UP
            ];
        }
    };

    var Mutator = Class.extend({
        SIZE  : SIZE,
        moveLeft : function (field) {
            var builder = new FieldBuilder();
            for (var i = 0; i < this.SIZE; ++i) {
                var r = 0;
                var w = 0;
                for (var r = 0, w = 0; r < this.SIZE; ++r) {
                    // Skip empty cells.
                    var vir = field.getValue(i, r);
                    if (! vir) {
                        continue;
                    }
                    // Find next non-empty cell.
                    var vin = null;
                    for (var n = r + 1; n < this.SIZE; ++n) {
                        vin = field.getValue(i, n);
                        if (vin) {
                            break;
                        }
                    }
                    if (vin !== null && vir === vin) {
                        // Combine.
                        builder.setValue(i, w, vir * 2);
                        r = n;
                    } else {
                        // Keep.
                        builder.setValue(i, w, vir);
                    }
                    ++w;
                }
            }
            return builder.produce();
        },
        transpose : function (field) {
            var builder = new FieldBuilder();
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    builder.setValue(i, j, field.getValue(j, i));
                }
            }
            return builder.produce();
        },
        flipVertical : function (field) {
            var builder = new FieldBuilder();
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    builder.setValue(i, j, field.getValue(this.SIZE - 1 - i, j));
                }
            }
            return builder.produce();
        },
        flipHorizontal : function (field) {
            var builder = new FieldBuilder();
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    builder.setValue(i, j, field.getValue(i, this.SIZE - 1 - j));
                }
            }
            return builder.produce();
        },
        move : function (field, direction) {
            switch (direction) {
                case Direction.DOWN  : return this.transpose(this.flipHorizontal(this.moveLeft(this.flipHorizontal(this.transpose(field)))));
                case Direction.RIGHT : return this.flipHorizontal(this.moveLeft(this.flipHorizontal(field)));
                case Direction.LEFT  : return this.moveLeft(field);
                case Direction.UP    : return this.transpose(this.moveLeft(this.transpose(field)));
            }
        }
    });

    /////////////////////////////////////// DOM interaction ///////////////////////////////////////

    var FieldReader = Class.extend({
        makePositionSelector : function (i, j) {
            return ['.tile-container .tile-position', j + 1, i + 1].join('-');
        },
        getPosition : function (i, j) {
            var merged = document.querySelector(this.makePositionSelector(i, j) + '.tile-merged');
            if (merged) {
                return merged;
            }
            return document.querySelector(this.makePositionSelector(i, j));
        },
        read : function () {
            var builder = new FieldBuilder();
            for (var i = 0; i < 4; ++i) {
                for (var j = 0; j < 4; ++j) {
                    var position = this.getPosition(i, j);
                    if (position) {
                        builder.setValue(i, j, parseInt(position.textContent));
                    }
                }
            }
            return builder.produce();
        }
    });

    var Keyboard = Class.extend({
        keyCodes : {},
        getKeyCodeRaw : function (direction) {
            switch (direction) {
                case Direction.DOWN : return 40;
                case Direction.LEFT : return 37;
                case Direction.RIGHT: return 39;
                case Direction.UP   : return 38;
            }
        },
        getKeyCode : function (direction) {
            if (typeof this.keyCodes[direction] === 'undefined') {
                this.keyCodes[direction] = this.getKeyCodeRaw(direction);
            }
            return this.keyCodes[direction];
        },
        press : function (direction) {
            var keyCode = this.getKeyCode(direction);
            var event = document.createEvent("KeyboardEvent");
            event.initKeyEvent("keydown", true, true, window, false, false, false, false, keyCode, 0);
            document.body.dispatchEvent(event);
        }
    });

    ////////////////////////////////// Aritificial intelligence //////////////////////////////////

    var MaximumQualityStrategy = Class.extend({
        evaluate : function (field) {
            var max = 0;
            for (var i = 0; i < SIZE; ++i) {
                for (var j = 0; j < SIZE; ++j) {
                    var value = field.getValue(i, j);
                    if (value > max) {
                        max = value;
                    }
                }
            }
            return max;
        }
    });

    var QualityMove = Class.extend({
        __construct : function (direction, quality) {
            this.direction = direction;
            this.quality = quality;
        },
        getDirection : function () {
            return this.direction;
        },
        getQuality : function () {
            return this.quality;
        }
    });

    var QualityDecider = Class.extend({
        __construct : function (qualityStrategy) {
            this.qualityStrategy = qualityStrategy;
        },
        getMutator : function () {
            if (typeof this.mutator === 'undefined') {
                this.mutator = new Mutator();
            }
            return this.mutator;
        },
        qualitySort : function (m1, m2) {
            return m1.getQuality() - m2.getQuality();
        },
        decide : function (field) {
            var moves = [];
            var mutator = this.getMutator();
            for (var directions = Direction.all(), i = 0; i < directions.length; ++i) {
                var candidate = mutator.move(field, directions[i]);

                console.log('QualityDecider.decide: i = ' + i);
                console.log('QualityDecider.decide: directions[i] = ' + directions[i]);
                console.log('QualityDecider.decide: candidate.getCode() = ' + candidate.getCode());
                console.log('QualityDecider.decide: candidate.equals(field) = ' + candidate.equals(field));

                if (! candidate.equals(field)) {
                    var value = this.qualityStrategy.evaluate(candidate);

                    console.log('QualityDecider.decide: value', value);

                    moves.push(new QualityMove(directions[i], value));
                }
            }
            moves.sort(this.qualitySort);
            var bestMove = moves.pop();
            if (! bestMove) {
                return;
            }
            return bestMove.getDirection();
        }
    });

    var RandomDecider = Class.extend({
        getRandomItem : function (array) {
            return array[Math.floor(array.length * Math.random())];
        },
        decide : function (field) {
            if (! field instanceof Field) {
                throw new TypeError('Argument 1 must be instance of Field in RandomDecider.decide()');
            }
            return this.getRandomItem(Direction.all());
        }
    });

    var Bot2048 = Class.extend({
        INTERVAL : 100,
        __construct : function () {
            this.fieldReader = new FieldReader();
            this.keyboard = new Keyboard();
            // Setup AI.
            this.decider = new QualityDecider(new MaximumQualityStrategy());
        },
        turn : function () {
            var field = this.fieldReader.read();
            var direction = this.decider.decide(field);
            if (! direction) {
                return false;
            }
            this.keyboard.press(direction);
            return ! document.getElementsByClassName('game-over').length;
        },
        start : function () {
            var self = this;
            this.timeout = window.setTimeout(function recursion() {
                if (self.turn()) {
                    this.timeout = window.setTimeout(recursion, self.INTERVAL);
                }
            }, 0);
        },
        stop : function () {
            window.clearTimeout(this.timeout);
        },
        test : function () {
            this.turn();
        }
    });
    return Bot2048;
})();

var bot = new Bot2048();
bot.test();
