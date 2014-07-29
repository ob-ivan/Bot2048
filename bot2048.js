var Bot2048 = (function () {

    const SIZE = 4;

    // Class

    var Class = function Class(properties) {
        var Class = function () {
            var local = Object.create(properties);
            for (var property in properties) {
                if (! property.match(/^_/)) {
                    if (typeof properties[property] === 'function') {
                        this[property] = local[property].bind(local);
                    }
                }
            }
            if (typeof local.__construct === 'function') {
                local.__construct.apply(local, arguments);
            }
        };
        for (var property in properties) {
            Class.prototype[property] = properties[property];
        }
        return Class;
    };

    // class CodeConverter

    var CodeConverter = Class({
        logCache : {
            0 : 0,
            1 : 0
        },
        charCache : {
            0 : '0',
            1 : '0',
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

    // class Field

    var Field = Class({
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
                var codeConverter = new CodeConverter();
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

    // class FieldBuilder

    var FieldBuilder = Class({
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
        },
        produce : function () {
            return new Field(this.values);
        }
    });

    // enum Direction

    var Direction = {
        DOWN  : 0,
        LEFT  : 1,
        RIGHT : 2,
        UP    : 3,
    };

    // class Mutator

    var Mutator = Class({
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

    // class RegistryEntry

    var RegistryEntry = Class({
        __construct : function (field) {
            this.field = field;
        },
    });

    // class FieldRegistry

    var FieldRegistry = Class({
        __construct : function () {
            /**
             *  Maps field codes to registry entries.
            **/
            this.entries = {};
        },
        register : function (field) {
            var code = field.getCode();
            if (typeof this.entries[code] === 'undefined') {
                this.entries[code] = new RegistryEntry(field);
            }
            return this.entries[code];
        },
    });

    // class Keyboard

    var Keyboard = Class({
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

    // class Bot2048

    var Bot2048 = Class({
        makePositionSelector : function (i, j) {
            return ['.tile-container .tile-position', j + 1, i + 1].join('-');
        },
        readField : function () {
            var builder = new FieldBuilder();
            for (var i = 0; i < 4; ++i) {
                for (var j = 0; j < 4; ++j) {
                    var position = document.querySelector(
                        this.makePositionSelector(i, j)
                    );
                    if (position) {
                        builder.setValue(i, j, parseInt(position.textContent));
                    }
                }
            }
            return builder.produce();
        }
    });
    return Bot2048;
})();

var bot = new Bot2048();
