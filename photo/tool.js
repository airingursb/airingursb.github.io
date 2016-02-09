    "use strict";
    var fs = require("fs");
    var path = "../../photos";

    fs.readdir(path, function (err, files) {
        if (err) {
            return;
        }
        var arr = [];
        (function iterator(index) {
            if (index == files.length) {
                fs.writeFile("output.json", JSON.stringify(arr, null, "\t"));
                return;
            }

            fs.stat(path + "/" + files[index], function (err, stats) {
                if (err) {
                    return;
                }
                if (stats.isFile()) {
                    arr.push(files[index]);
                }
                iterator(index + 1);
            })
        }(0));
    });