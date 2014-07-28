(function () {
    var makePositionSelector = function (i, j) {
        return ['.tile-container .tile-position', i + 1, j + 1].join('-');
    };

    // Read field from DOM.

    var field = [];
    for (var i = 0; i < 4; ++i) {
        field[i] = [];
        for (var j = 0; j < 4; ++j) {
            var position = document.querySelector(
                makePositionSelector(i, j)
            );
            if (position) {
                field[i][j] = parseInt(position.textContent);
            } else {
                field[i][j] = 0;
            }
        }
    }

    // Output debug info.
    console.log(field);
})();

