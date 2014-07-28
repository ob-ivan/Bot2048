var Bot2048 = (function () {
    
    var Bot2048 = function () {};
    
    Bot2048.prototype.makePositionSelector = function (i, j) {
        return ['.tile-container .tile-position', i + 1, j + 1].join('-');
    };
    
    // Read field from DOM.
    Bot2048.prototype.readField = function () {
        var field = [];
        for (var i = 0; i < 4; ++i) {
            field[i] = [];
            for (var j = 0; j < 4; ++j) {
                var position = document.querySelector(
                    this.makePositionSelector(i, j)
                );
                if (position) {
                    field[i][j] = parseInt(position.textContent);
                } else {
                    field[i][j] = 0;
                }
            }
        }
        return field;
    };

    // Output debug info.
    Bot2048.prototype.debug = function () {
        console.log(this.readField());
    }
    
    return Bot2048;
})();

