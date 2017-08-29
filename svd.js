const {Matrix, SingularValueDecomposition} = require('ml-matrix');
var numeric = require('./numeric.min.js');
sw = require('stopword');
var fs = require('fs');
es = require('event-stream');
var JSONStream = require( "JSONStream" );
var readline = require('readline');
var stream = require('stream');
const isset = require('isset');
var sprintf = require("sprintf-js").sprintf;
var math = require('mathjs');
var cutStopword = require('./cutStopword.js');
var pgp = require('pg-promise')();
var connectionString = 'postgres://postgres:password@localhost/Chatbot';
var db = pgp(connectionString);

var matrix ;
var res ;
var S = [] ;

exports.getQARank = function(query) {
	var word = cutStopword.cutStopwords(query) ;
	var query = "select word,idf from qindex group by word,idf order by word ";
	var doc ;
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      doc = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    while(doc === undefined) {
      require('deasync').sleep(100);
    }

    var A = [] ;
    var tmp = [] ;
    var check = '' ;
	for(let x = 0 ; x < doc.length ; x++){
		var setWordCount = 0 ;
		tmp = [] ;
		if(word.includes(doc[x].word)) {
			var idx = word.indexOf(doc[x].word);
			while (idx != -1) {
				idx = word.indexOf(doc[x].word, idx + 1);
				setWordCount++;
			}
			tmp.push(setWordCount*doc[x].idf);
		} else {
			tmp.push(0);
		}
		A.push(tmp);
	}

	var doc2 ;
	query = "select u_index,s_index from svdindex";
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      doc2 = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    while(doc2 === undefined) {
      require('deasync').sleep(100);
    }

	var Atrans = numeric.transpose(A);
	var U = new Matrix(doc2[0].u_index);
	var S = new Matrix(doc2[0].s_index);
	var sum = numeric.dot(Atrans,U) ;
	var mtrQ = numeric.dot(sum,S) ;

	getPercentage(mtrQ);
}

var show = [] ;
function getPercentage(mtrQ){
	show = [] ;
	var lengthQ = 0;
	var tmpQ = [];
	mtrQ.forEach(function(entrys) {
		entrys.forEach(function(entry) {
			tmpQ.push(entry);
			lengthQ += math.pow(entry,2);
		});
	});
	lengthQ = math.sqrt(lengthQ) ;

	var arrDotproduct = [] ;
	var doc ;
	var query = "select v_index from svdindex";
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      doc = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    while(doc === undefined) {
      require('deasync').sleep(100);
    }

    var key = 2 ;
    doc[0].v_index.forEach(function(entrys) {
		count = 0 ;
		var simsum = 0 ;
		var lengthD = 0 ;
		entrys.forEach(function(entry) {
			if(count == 0){
				simsum = entry*tmpQ[count];
				lengthD = math.pow(entry,2);
			} else {
				simsum += entry*tmpQ[count];
				lengthD += math.pow(entry,2);
			}
			count++;
		});	
		lengthD = math.sqrt(lengthD) ;
		percentage = simsum / (lengthD*lengthQ) ;
		arrDotproduct[key] = percentage ;
		show.push(percentage);
		key++;
	});

	pgp.end();
	return arrDotproduct ;
}

function searchByKey(id){
    var result ;
    query = "select * from faqcrawling where " ;
    query += "faq_id = "+id ;
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      result = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    require('deasync').sleep(100);

    pgp.end();
    return result ;
}

exports.showResult = function (result){

	function compareNumbers(a, b) {
	  return b - a;
	}

	var count = 0 ;
	var k = 10 ;
	var temp = result.slice(0) ;

	result.sort(compareNumbers);

  	for(key in result) {
		for(keys in temp) {
			if(count < k){
				if(temp[keys] == result[key]){
					console.log(searchByKey(keys));
				}	
			}	
		}
		count++;
	}
}



