<link rel="stylesheet" type="text/css" href="/assets/css/APlayer.min.css"><script src="/assets/js/APlayer.min.js"> </script>    "use strict";
    var fs = require("fs");
    var path = "../../Photos/ursb";

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