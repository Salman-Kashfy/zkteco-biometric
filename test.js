const crypto = require("crypto");

function hash(data, callback) {
    let counter = 0;
    let result = [];

    let func = () => {
        if(counter === data.length) {
            callback(result);
            return;
        }



        for (const md5Element of data) {
            let md5 = crypto.createHash("md5");
            md5.update(md5Element);
            result.push(md5.digest('hex'));
        }



        counter++;
        process.nextTick(func);
    };

    func();
}

hash(["test", "another test", ""], console.log);
setTimeout(() => {
    setTimeout(() => console.log("This should be printed before the hashes"));
});
/* should print
['098f6bcd4621d373cade4e832627b4f6',
 '5e8862cd73694287ff341e75c95e3c6a',
 'd41d8cd98f00b204e9800998ecf8427e'] */

module.exports.hash = hash;