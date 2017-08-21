const {Matrix, SingularValueDecomposition} = require('ml-matrix');
var numeric = require('./numeric.min.js');
sw = require('stopword');
const isset = require('isset');
var sprintf = require("sprintf-js").sprintf;
var math = require('mathjs');
var cutStopword = require('./cutStopword.js');

var res,db,php ;
var faqId = [] ;
var query = "" ;

exports.setDatabase = function (dbconnection, pgpConnection){
  	db = dbconnection ;
  	pgp = pgpConnection ;
}

function getPercentage(mtrQ,resk){
	var lengthQ = 0;
	var tmpQ = [];
	mtrQ.forEach(function(entry) {
		tmpQ.push(entry);
		lengthQ += math.pow(entry,2);
	});
	lengthQ = math.sqrt(lengthQ) ;

	var arrDotproduct = [] ;
	var doc ;

    var k = 0 ;
    resk.V.forEach(function(entrys) {
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
		arrDotproduct[faqId[k]] = percentage ;
		k++;
	});

	pgp.end();
	return arrDotproduct ;
}

function sortAtK(arr) {
    arr.sort(function(a, b) {
    	return b - a;
	});
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
    return 'Q : ' +result[0].question + ', A : ' + result[0].answer ;
}

function sumPercentage(arr1 , arr2){
	var final = [] ;
	for(keys in arr1){
		for(key in arr2){
			if(key == keys){
				final[key] = ( arr1[keys] + arr2[key] ) / 2 ;
			}
		}
	}

	for(key in arr1){
    	if(!(key in final)){
      		final[key] = arr1[key] / 2;
		}
	}

	for(key in arr2){
	    if(!(key in final)){
	      final[key] = arr2[key] / 2;
	    }
	}

	return final ;
}

exports.getQARank = function (qa){
	var word = cutStopword.cutStopwords(qa) ;
	word.forEach(function(entry){
		var doc ;
		query = "select faq_id from qindex where word = '"+entry+"' order by faq_id" ;
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

	    for (var x = 0; x < doc.length ; x++) {
	    	if(!faqId.includes(doc[x].faq_id)){
				faqId.push(doc[x].faq_id) ;
			}
	    }
	});

	var tmpCheck ;
	query = "select word,idf from qindex where faq_id in ("+faqId.toString()+") group by word,idf order by word" ;
	db.tx(t => {
	    return t.any(query);
	})
	.then(data => {
	    tmpCheck = data ;
	})
	.catch(error => {
	    console.log(error); 
	});

	while(tmpCheck === undefined) {
	    require('deasync').sleep(100);
	}

	var tmp = [] ;
	var matrixD = [] ;
	faqId.forEach(function(entry){
		tmp = [] ;
		var doc ;
		query = "select word,tf,idf from qindex where faq_id = "+entry+" order by word" ;
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

		tmpCheck.forEach(function(entrys) {
			var zero = true ;

			for (var x = 0 ; x < doc.length ; x++) {
				if(entrys.word == doc[x].word){
					tmp.push(doc[x].tf*doc[x].idf) ;
					zero = false ;
				} 
			}

			if(zero){
				tmp.push(0) ;
			}
		});

		matrixD.push(tmp);
	});

	var matrixQ = [] ;
	tmpCheck.forEach(function(entrys) {
		matrixQ.push(0);
		word.forEach(function(entry) {
			if(entrys.word == entry){
				matrixQ.pop();
				matrixQ.push(entrys.idf) ;
			} 
		});
	});

	pgp.end();

	matrixD = numeric.transpose(matrixD);
	matrixD = new Matrix(matrixD);
	res = new SingularValueDecomposition(matrixD);
	var S = [] ;

	count = 0 ;
	res.s.forEach(function(entry) {
		arr = [] ;
		for(var i=0; i<res.s.length ;i++){	
			if(count==i){
				arr.push(1/entry);
			} else {
				arr.push(0);
			}
		}
		if(count < res.s.length){
			S.push(arr);
		}
		count++; 
	});

	var sum = numeric.dot(matrixQ,res.U) ;
	var mtrQ = numeric.dot(sum,S) ;
	var cossim = getPercentage(mtrQ,res);

	////////////////////////////////////////////////////////////////////////////////

	var faqId2 = [] ;
	word.forEach(function(entry){
		var doc ;
		query = "select faq_id from aindex where word = '"+entry+"' order by faq_id" ;
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

	    for (var x = 0; x < doc.length ; x++) {
	    	if(!faqId2.includes(doc[x].faq_id)){
				faqId2.push(doc[x].faq_id) ;
			}
	    }
	});

	var tmpCheck2 ;
	query = "select word,idf from aindex where faq_id in ("+faqId2.toString()+") group by word,idf order by word" ;
	db.tx(t => {
	    return t.any(query);
	})
	.then(data => {
	    tmpCheck2 = data ;
	})
	.catch(error => {
	    console.log(error); 
	});

	while(tmpCheck2 === undefined) {
	    require('deasync').sleep(100);
	}

	var matrixD2 = [] ;
	faqId2.forEach(function(entry){
		tmp = [] ;
		var doc ;
		query = "select word,tf,idf from aindex where faq_id = "+entry+" order by word" ;
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

		tmpCheck2.forEach(function(entrys) {
			var zero = true ;

			for (var x = 0 ; x < doc.length ; x++) {
				if(entrys.word == doc[x].word){
					tmp.push(doc[x].tf*doc[x].idf) ;
					zero = false ;
				} 
			}

			if(zero){
				tmp.push(0) ;
			}
		});

		matrixD2.push(tmp);
	});

	var matrixQ2 = [] ;
	tmpCheck2.forEach(function(entrys) {
		matrixQ2.push(0);
		word.forEach(function(entry) {
			if(entrys.word == entry){
				matrixQ2.pop();
				matrixQ2.push(entrys.idf) ;
			} 
		});
	});

	pgp.end();

	matrixD2 = numeric.transpose(matrixD2);
	matrixD2 = new Matrix(matrixD2);
	res2 = new SingularValueDecomposition(matrixD2);
	var S2 = [] ;

	count = 0 ;
	res2.s.forEach(function(entry) {
		arr = [] ;
		for(var i=0; i<res2.s.length ;i++){	
			if(count==i){
				arr.push(1/entry);
			} else {
				arr.push(0);
			}
		}
		if(count < res2.s.length){
			S2.push(arr);
		}
		count++; 
	});

	var sum2 = numeric.dot(matrixQ2,res2.U) ;
	var mtrQ2 = numeric.dot(sum2,S2) ;
	var cossim2 = getPercentage(mtrQ2,res2);

	return sumPercentage(cossim,cossim2);
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



