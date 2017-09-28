var fs = require('fs');
var child = require('child_process');
var iconv  = require('iconv-lite');
var sw = require('stopword');
const stopwords = require('stopwords-th');

var data = "";
var splitData = "" ;
var cutString = "" ;

exports.cutStopwords = function (word) {
	fs.writeFileSync("./word.txt", word, "UTF-8");
    child.execSync('java -jar "./TestLexTo.jar"');
    data = fs.readFileSync("./cut.txt");
    splitData = data.toString().split(' ');
	cutString = sw.removeStopwords(splitData, stopwords);

	return cutString ;
}

