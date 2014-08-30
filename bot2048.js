var Bot2048 = (function () {

    //////////////////////////////////////////// Toolbox ////////////////////////////////////////////

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

                // Initialize public object to bear the prototype chain.
                initializing = true;
                var _public = new Class();
                initializing = false;

                // Bind public properties to public object.
                for (var property in this) {
                    if (/^_/.test(property)) {
                        _public[property] = null;
                    } else if (typeof this[property] === 'function') {
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

    var CountLogger = Class.extend({
        __construct : function (enabled) {
            this.map = {};
            this.enabled = enabled;
        },
        log : function (label) {
            if (typeof this.map[label] === 'undefined') {
                this.map[label] = 0;
            }
            this.map[label]++;
            if (this.enabled) {
                console.log(label, this.map[label]);
            }
        }
    });
    var countLogger = new CountLogger(false);
    
    var Registry = Class.extend({
        __construct : function () {
            this.data = {};
        },
        set : function (key, value) {
            this.data[key] = value;
        },
        get : function (key, fallback) {
            if (typeof this.data[key] === 'undefined') {
                if (typeof fallback === 'function') {
                    this.data[key] = fallback(key);
                } else {
                    return null;
                }
            }
            return this.data[key];
        }
    });
    
    /**
     *  interface Extractor {
     *      index extract(Object object);
     *  }
    **/
    
    var ExtractorRegistry = Class.extend({
        __construct : function (keyExtractor) {
            this.registry = new Registry();
            this.keyExtractor = keyExtractor;
        },
        getKey : function (object) {
            return this.keyExtractor.extract(object);
        },
        set : function (object, value) {
            this.registry.set(this.getKey(object), value);
        },
        get : function (object, fallback) {
            return this.registry.get(this.getKey(object), fallback);
        }
    });
    
    var ExtractorRegistryFactory = Class.extend({
        produceExtractor : function () {
            throw new Error('ExtractorRegistryFactory.produceExtractor is abstract and must be overloaded');
        },
        getExtractor : function () {
            if (typeof this.extractor === 'undefined') {
                this.extractor = this.produceExtractor();
            }
            return this.extractor;
        },
        produce : function () {
            return new ExtractorRegistry(this.getExtractor());
        }
    });
    
    //////////////////////////////////////////// Model ////////////////////////////////////////////

    const SIZE = 4;

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

    var Direction = Class.extend({
        __construct : function (value) {
            this.value = value;
        },
        getValue : function () {
            return this.value;
        },
        toString : function () {
            switch (this.value) {
                case Direction.DOWN  : return 'down';
                case Direction.LEFT  : return 'left';
                case Direction.RIGHT : return 'right';
                case Direction.UP    : return 'up';
            }
        }
    });
    Direction.DOWN  = 0;
    Direction.LEFT  = 1;
    Direction.RIGHT = 2;
    Direction.UP    = 3;
    Direction.all = function () {
        return [
            new Direction(this.DOWN),
            new Direction(this.LEFT),
            new Direction(this.RIGHT),
            new Direction(this.UP)
        ];
    };

    var DirectionCodeExtractor = Class.extend({
        extract : function (direction) {
            return direction.getValue();
        }
    });
    
    var DirectionRegistryFactory = ExtractorRegistryFactory.extend({
        produceExtractor : function () {
            return new DirectionCodeExtractor();
        }
    });
    
    var Point = Class.extend({
        __construct : function (i, j) {
            this.i = i;
            this.j = j;
        },
        i : function () {
            return this.i;
        },
        j : function () {
            return this.j;
        }
    });

    var PointCodeExtractor = Class.extend({
        extract : function (point) {
            return [point.i(), point.j()].join('-');
        }
    });
    
    var PointRegistryFactory = ExtractorRegistryFactory.extend({
        produceExtractor : function () {
            return new PointCodeExtractor();
        }
    });
    
    var ValuePoint = Point.extend({
        __construct : function (i, j, v) {
            this._super(i, j);
            this.v = v;
        },
        v : function () {
            return this.v;
        }
    });

    var ValuePointCodeExtractor = Class.extend({
        extract : function (point) {
            return [point.i(), point.j(), point.v()].join('-');
        }
    });
    
    var ValuePointRegistryFactory = ExtractorRegistryFactory.extend({
        produceExtractor : function () {
            return new ValuePointCodeExtractor();
        }
    });
    
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
            if (i instanceof Point) {
                return this.values[i.i()][i.j()];
            }
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
        },
        forEach : function (step, init) {
            var result = init;
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    result = step(i, j, this.values[i][j], result);
                }
            }
            return result;
        },
      inspect : function () {
        return this.values;
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

    var FieldCodeExtractor = Class.extend({
        extract : function (field) {
            return field.getCode();
        }
    });
    
    var FieldRegistryFactory = ExtractorRegistryFactory.extend({
        produceExtractor : function () {
            return new FieldCodeExtractor();
        }
    });
    
    var Locus = {
        CORNER : 0,
        SIDE   : 1,
        MIDDLE : 2
    };

    var Traverser = Class.extend({
        __construct : function () {
            this.adjacentRegistry = new Registry();
            this.adjacentPointsRegistry = new PointRegistryFactory().produce();
        },
        getLocus : function (point) {
            var i = point.i(),
                j = point.j();
            if (i > 0) {
                i = SIZE - 1 - i;
            }
            if (j > 0) {
                j = SIZE - 1 - j;
            }
            if (! (i + j)) {
                return Locus.CORNER;
            }
            if (! (i * j)) {
                return Locus.SIDE;
            }
            return Locus.MIDDLE;
        },
        _getAdjacentFallback : function (point, direction) {
            var i = point.i();
            var j = point.j();
            switch (direction.getValue) {
                case Direction.DOWN : ++i; break;
                case Direction.LEFT : --j; break;
                case Direction.RIGHT: ++j; break;
                case Direction.UP   : --i; break;
            }
            if (i < 0 || i >= SIZE || j < 0 || j >= SIZE) {
                return null;
            }
            return new Point(i, j);
        },
        getAdjacent : function (point, direction) {
            return this.adjacentRegistry.get(
                [point.i(), point.j(), direction.getValue()].join('-'),
                this._getAdjacentFallback.bind(this, point, direction)
            );
        },
        _getAdjacentPointsFallback : function (point) {
            var adjacentPoints = [];
            for (var directions = Direction.all(), d = 0; d < directions.length; ++d) {
                var adjacent = this.getAdjacent(point, directions[d]);
                if (! adjacent) {
                    continue;
                }
                adjacentPoints.push(adjacent);
            }
            return adjacentPoints;
        },
        getAdjacentPoints : function (point) {
            return this.adjacentPointsRegistry.get(
                point,
                this._getAdjacentPointsFallback.bind(this, point)
            );
        }
    });

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
            switch (direction.getValue()) {
                case Direction.DOWN  : return this.transpose(this.flipHorizontal(this.moveLeft(this.flipHorizontal(this.transpose(field)))));
                case Direction.RIGHT : return this.flipHorizontal(this.moveLeft(this.flipHorizontal(field)));
                case Direction.LEFT  : return this.moveLeft(field);
                case Direction.UP    : return this.transpose(this.moveLeft(this.transpose(field)));
            }
        },
        applyOpponentMove : function (field, opponentMove) {
            var builder = new FieldBuilder();
            for (var i = 0; i < this.SIZE; ++i) {
                for (var j = 0; j < this.SIZE; ++j) {
                    var v = i === opponentMove.i() && j === opponentMove.j()
                        ? opponentMove.v()
                        : field.getValue(i, j)
                    ;
                    builder.setValue(i, j, v);
                }
            }
            return builder.produce();
        }
    });
    
    var CachingMutator = Class.extend({
        __construct : function () {
            this.mutator = new Mutator();
            var factory = new FieldRegistryFactory();
            this.moveLeftRegistry = factory.produce();
            this.transposeRegistry = factory.produce();
            this.flipVerticalRegistry = factory.produce();
            this.flipHorizontalRegistry = factory.produce();
            this.moveRegistry = new Registry();
            this.opponentRegistry = new Registry();
        },
        moveLeft : function (field) {
            return this.moveLeftRegistry.get(field, this.mutator.moveLeft.bind(this.mutator, field));
        },
        transpose : function (field) {
            return this.transposeRegistry.get(field, this.mutator.transpose.bind(this.mutator, field));
        },
        flipVertical : function (field) {
            return this.flipVerticalRegistry.get(field, this.mutator.flipVertical.bind(this.mutator, field));
        },
        flipHorizontal : function (field) {
            return this.flipHorizontalRegistry.get(field, this.mutator.flipHorizontal.bind(this.mutator, field));
        },
        move : function (field, direction) {
            return this.moveRegistry.get(
                field.getCode() + direction.getValue(),
                this.mutator.move.bind(this.mutator, field, direction)
            );
        },
        getOpponentMoveCode : function (opponentMove) {
            return [opponentMove.i(), opponentMove.j(), opponentMove.v()].join('-');
        },
        applyOpponentMove : function (field, opponentMove) {
            return this.opponentRegistry.get(
                field.getCode() + this.getOpponentMoveCode(opponentMove),
                this.mutator.applyOpponentMove.bind(this.mutator, field, opponentMove)
            );
        }
    });

    var OpponentMoveIterator = Class.extend({
        iterate : function (field) {
            return field.forEach(function (i, j, v, a) {
                if (v === 0) {
                    a.push(new ValuePoint(i, j, 1));
                    a.push(new ValuePoint(i, j, 2));
                }
                return a;
            }, []);
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
            switch (direction.getValue()) {
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

    var ValuePointRegistry = Class.extend({
        __construct : function () {
            this.registry = new Registry();
        },
        factory : function (i, j, v) {
            return new ValuePoint(i, j, v);
        },
        get : function (i, j, v) {
            return this.registry.get(
                [i, j, v].join('-'),
                this.factory.bind(this, i, j, v)
            );
        }
    });
    
    var MaximumFinder = Class.extend({
        __construct : function (valuePointRegistry) {
            this.fieldRegistry = new FieldRegistryFactory().produce();
            this.valuePointRegistry = valuePointRegistry;
        },
        getPoint : function (i, j, v) {
            return this.valuePointRegistry.get(i, j, v);
        },
        fallbackStep : function (i, j, v, max) {
            if (v > max.v()) {
                max = this.getPoint(i, j, v);
            }
            return max;
        },
        fallback : function (field) {
            return field.forEach(this.fallbackStep.bind(this), this.getPoint(0, 0, 0));
        },
        find : function (field) {
            return this.fieldRegistry.get(field, this.fallback.bind(this, field));
        }
    });
    
    var MaximumCollection = Class.extend({
        __construct : function () {
            this.maximums = [];
            this.value = 0;
        },
        add : function (i, j, v) {
            var diff = v - this.value;
            var point = this.getPoint(i, j, v);
            if (diff > 0) {
                this.maximums = [point];
                this.value = v;
            } else if (! diff) {
                this.maximums.push(point);
            }
            return this;
        },
        getMaximums : function () {
            return this.maximums;
        }
    });
    
    var MaximumCollectionFinder = MaximumFinder.extend({
        fallbackStep : function (i, j, v, max) {
            return max.add(i, j, v);
        },
        fallback : function (field) {
            return field.forEach(fallbackStep.bind(this), new MaximumCollection());
        },
    });

    var BurnMap = Class.extend({
        __construct : function (mask) {
            this.mask = mask || 0;
        },
        single : function (i, j) {
            return 1 << (i * SIZE + j);
        },
        normalize : function (args) {
            if (args[0] instanceof ValuePoint) {
                args[1] = args[0].j();
                args[0] = args[0].i();
            }
            return args;
        },
        add : function (i, j) {
            this.normalize(arguments);
            this.mask |= this.single(i, j);
        },
        has : function (i, j) {
            this.normalize(arguments);
            return this.mask & this.single(i, j);
        },
        clone : function () {
            return new BurnMap(this.mask);
        }
    });
    
    var Chain = Class.extend({
        __construct : function (points) {
            this.points = points ? [].concat(points) : [];
        },
        add : function (point) {
            this.points.push(point);
        },
        getPoints : function () {
            return this.points;
        },
        clone : function () {
            return new Chain(this.points);
        }
    });
    
    var ChainsFindingProcess = Class.extend({
        __construct : function (traverser, field, start) {
            this.traverser = traverser;
            this.field = field;
            this.start = start;
        },
        recursion : function (chain, burn, point) {
            var value = this.field.getValue(point);
            var adjacents = this.traverser.getAdjacentPoints(point).filter(function (v) {
                return ! burn.has(point) && this.field.getValue(v) <= value;
            }.bind(this));
            if (! adjacents.length) {
                return [chain];
            }
            chain.add(point);
            burn.add(point);
            var chains = [];
            for (var a = 0; a < adjacents.length; ++a) {
                chains.push.apply(chains, this.recursion(chain.clone(), burn.clone(), adjacents[a]));
            }
            return chains;
        },
        getChains : function () {
            if (typeof this.chains === 'undefined') {
                this.chains = this.recursion(new Chain(), new BurnMap(), this.start);
            }
            return this.chains;
        }
    });
    
    var ChainsFinder = Class.extend({
        __construct : function (maximumCollectionFinder) {
            this.maximumCollectionFinder = maximumCollectionFinder;
        },
        produceProcess : function (field, maximum) {
            return new ChainsFindingProcess(this.traverser, field, maximum);
        },
        find : function (field) {
            var maximumCollection = this.maximumCollectionFinder.find(field);
            var chains = [];
            for (var m = 0; m < maximumCollection.length; ++m) {
                var process = this.produceProcess(field, maximumCollection[m]);
                chains.push.apply(chains, process.getChains());
            }
            return chains;
        }
    });
    
    /**
     *  interface QualityStrategy {
     *      integer evaluate(Field field);
     *  }
    **/
    
    var MaximumQualityStrategy = Class.extend({
        getFinder : function () {
            return this.finder;
        },
        evaluate : function (field) {
            return this.getFinder().find(field).v();
        }
    });

    var ChainQualityStrategy = Class.extend({
        __construct : function (finder) {
            this.finder = finder;
        },
        getFinder : function () {
            return this.finder;
        },
        getTraverser : function () {
            if (typeof this.traverser === 'undefined') {
                this.traverser = new Traverser();
            }
            return this.traverser;
        },
        evaluateRecursive : function (field, point, sum) {
            var max = 0;
            var pointValue = field.getValue(point);
            if (! pointValue) {
                return sum + 1;
            }
            for (var directions = Direction.all(), i = 0; i < directions.length; ++i) {
                var adjacent = this.getTraverser().getAdjacent(point, directions[i]);
                if (! adjacent) {
                    continue;
                }
                var adjacentValue = field.getValue(adjacent);
                if (adjacentValue > pointValue) {
                    continue;
                }
                var value = adjacentValue === pointValue
                    ? sum + pointValue * 2 - 1
                    : this.evaluateRecursive(field, adjacent, sum + pointValue);
                if (value > max) {
                    max = value;
                }
            }
            return max;
        },
        evaluate : function (field) {
            return this.evaluateRecursive(field, this.getFinder().find(field), 0);
        }
    });

    var EmptyChainQualityStrategy = ChainQualityStrategy.extend({
        evaluateRecursive : function (field, point, sum) {
            var max = this.getFinder().find(field).v();
            var empty = field.forEach(function (i, j, v, n) {
                if (! v) {
                    ++n;
                }
                return n;
            }, 0);
            return this._super(field, point, sum) + max * empty;
        }
    });

    var LocusChainQualityStrategy = ChainQualityStrategy.extend({
        getLocusPenalty : function (field) {
            var max = this.getFinder().find(field);
            switch (this.getTraverser().getLocus(max)) {
                case Locus.CORNER: return 0;
                case Locus.SIDE  : return max.v() / 2;
                case Locus.MIDDLE: return max.v();
            }
        },
        evaluateRecursive : function (field, point, sum) {
            return this._super(field, point, sum) - this.getLocusPenalty(field);
        }
    });

    var GravityQualityStrategy = LocusChainQualityStrategy.extend({
        getSnakeBonus : function (field) {
            return field.forEach(function (i, j, v, b) {
                return b + v * i;
            }, 0);
        },
        evaluate : function (field) {
            return this._super(field) + this.getSnakeBonus(field);
        }
    });

    var SnakeQualityStrategy = Class.extend({
        evaluate : function (field) {
            var quality = 0;
            var multiplier = 1;
            for (var i = SIZE - 1; i < SIZE; ++i) {
                var imod2 = i % 2;
                for (var j = 0; j < SIZE; ++j) {
                    quality += field.getValue(i, imod2 ? j : 3 - j) * multiplier;
                    multiplier /= 1.5;
                }
            }
            return quality;
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

    var QualitySorter = Class.extend({
        compare : function (m1, m2) {
            return m1.getQuality() - m2.getQuality();
        },
        sort : function (qualityMoves) {
            qualityMoves.sort(this.compare)
        }
    });
    
    var BestMoveFinderContext = Class.extend({
        __construct : function (qualityStrategy, mutator, qualitySorter) {
            this.qualityStrategy = qualityStrategy;
            this.mutator = mutator;
            this.qualitySorter = qualitySorter;
        },
        getQualityStrategy : function () {
            return this.qualityStrategy;
        },
        getMutator : function () {
            return this.mutator;
        },
        getQualitySorter : function () {
            return this.qualitySorter;
        }
    });
    
    /**
     *  interface MoveFinder {
     *      QualityMove find(Field field);
     *  }
    **/
    
    var BestMoveFinder = Class.extend({
        __construct : function (context) {
            this.context = context;
        },
        find : function (field) {
            var moves = [];
            for (var directions = Direction.all(), d = 0; d < directions.length; ++d) {
                var candidate = this.context.getMutator().move(field, directions[d]);
                if (! candidate.equals(field)) {
                    var value = this.context.getQualityStrategy().evaluate(candidate);
                    moves.push(new QualityMove(directions[d], value));
                }
            }
            this.context.getQualitySorter().sort(moves);
            return moves.pop();
        }
    });
    
    var DeepMoveFinder = Class.extend({
        __construct : function (context) {
            this.bestMoveFinder = new BestMoveFinder(context);
            this.mutator = context.getMutator();
            this.qualitySorter = context.getQualitySorter();
            this.opponentMoveIterator = new OpponentMoveIterator();
        },
        qualitySort : function (m1, m2) {
            return m1.getQuality() - m2.getQuality();
        },
        find : function (field) {
            var moves = [];
            for (var directions = Direction.all(), d = 0; d < directions.length; ++d) {
                var candidate = this.mutator.move(field, directions[d]);
                if (! candidate.equals(field)) {
                
                    // List opponent's moves and find a best move for each of them.
                    // The worst of them is the quality of the candidate.
                    var opponentMoves = this.opponentMoveIterator.iterate(field);
                    var worstQuality = Infinity;
                    for (var om = 0; om < opponentMoves.length; ++om) {
                        var appliedCandidate = this.mutator.applyOpponentMove(candidate, opponentMoves[om]);
                        var bestQuality = this.bestMoveFinder.find(appliedCandidate).getQuality();
                        if (bestQuality < worstQuality) {
                            worstQuality = bestQuality;
                        }
                    }
                
                    moves.push(new QualityMove(directions[d], worstQuality));
                }
            }
            this.qualitySorter.sort(moves);
            return moves.pop();
        }
    });
    
    /**
     *  interface FinderFactory {
     *      MoveFinder produce(BestMoveFinderContext context);
     *  }
    **/

    var BestMoveFinderFactory = Class.extend({
        produce : function (context) {
            return new BestMoveFinder(context);
        }
    });
    
    var DeepMoveFinderFactory = Class.extend({
        produce : function (context) {
            return new DeepMoveFinder(context);
        }
    });
    
    /**
     *  interface Decider {
     *      // Return null iff no turns can be made.
     *      Direction? decide(Field field);
     *  }
    **/

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

    var QualityDecider = Class.extend({
        __construct : function (qualityStrategy, finderFactory) {
            this.qualityStrategy = qualityStrategy;
            this.finder = finderFactory.produce(new BestMoveFinderContext(qualityStrategy, new CachingMutator(), new QualitySorter()));
        },
        decide : function (field) {
            var currentQuality = this.qualityStrategy.evaluate(field);
            var bestMove = this.finder.find(field);
            if (! bestMove) {
                return;
            }
            if (bestMove.getQuality() < currentQuality / 2) {
                return;
            }
            return bestMove.getDirection();
        }
    });

    /**
     *  interface Stopper {
     *      // Return true iff it's time to stop.
     *      boolean stop();
     *  }
    **/

    var GameOverStopper = Class.extend({
        stop : function () {
            return document.getElementsByClassName('game-over').length ||
                document.getElementsByClassName('game-won').length;
        }
    });

    var Bot2048 = Class.extend({
        INTERVAL : 100,
        __construct : function () {
            this.fieldReader = new FieldReader();
            this.keyboard = new Keyboard();
            this.decider = new QualityDecider(
                new GravityQualityStrategy(new MaximumFinder(new ValuePointRegistry())),
                new BestMoveFinderFactory()
            );
            this.stopper = new GameOverStopper();
        },
        turn : function () {
            var field = this.fieldReader.read();
            var direction = this.decider.decide(field);
            if (! direction) {
                return false;
            }
            this.keyboard.press(direction);
            return ! this.stopper.stop();
        },
        run : function (interval) {
            this.timeout = window.setTimeout(this.step.bind(this), interval);
        },
        step : function step() {
            if (this.stopped) {
                return;
            }
            if (this.turn()) {
                this.run(this.INTERVAL);
            }
        },
        start : function () {
            this.stopped = false;
            this.run(0);
        },
        stop : function () {
            window.clearTimeout(this.timeout);
            this.stopped = true;
        },
        test : function () {
            var process = new ChainsFindingProcess(
                new Traverser(),
                this.fieldReader.read(),
                new Point(3, 0)
            );
            console.log(process.getChains());
        }
    });
    return Bot2048;
})();

var bot = new Bot2048();
bot.test();
