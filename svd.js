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

function setSVD(){
	var query = "select * from qindex order by word , faq_id";
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
  	var count = 2 ;
  	var test = 0 ;
	for(let x = 0 ; x < doc.length ; x++){
		if(check == doc[x].word || x == 0){		
			if(count == doc[x].faq_id){
				tmp.push(doc[x].tf*doc[x].idf) ;
			} else { 
				for(let c=count ; c < doc[x].faq_id ; c++){
					tmp.push(0) ;
					if(c == doc[x].faq_id - 1){
						tmp.push(doc[x].tf*doc[x].idf) ;
					}
				}
			}
			if(x == doc.length - 1){
				count = doc[x].faq_id+1;
				if(count < 4436){
					for(let c=count ; c < 4436 ; c++){
						tmp.push(0) ;
					}
				}
				A.push(tmp) ;	
			}
		} else {
			if(count < 4436){
				for(let c=count ; c < 4436 ; c++){
					tmp.push(0) ;
				}
			}
			
			A.push(tmp) ;	
			tmp = [] ;
			count = 2 ;
			if(count == doc[x].faq_id){
				tmp.push(doc[x].tf*doc[x].idf) ;
			} else {
				for(let c=count ; c < doc[x].faq_id ; c++){
					tmp.push(0) ;
					if(c == doc[x].faq_id - 1){
						tmp.push(doc[x].tf*doc[x].idf) ;
					}
				}
			}
			if(x == doc.length - 1){
				count = doc[x].faq_id+1;
				if(count < 4436){
					for(let c=count ; c < 4436 ; c++){
						tmp.push(0) ;
					}
				}
				A.push(tmp) ;	
			}
		}
		
		count = doc[x].faq_id+1;
	   	check = doc[x].word;
	}

	console.log(A);
	matrix = new Matrix(A);
	res = new SingularValueDecomposition(matrix);

    var U = [] ;
    //var S = [] ;
    var V = [] ;
    var count = 0 ;
    var arr = [] ;

    /*console.log('u');
    res.U.forEach(function(entrys) {
		count = 0 ;
		arr = [] ;
		entrys.forEach(function(entry) {
			if(count == 2){
				U.push(arr);
			} else if(count < 2) {
				arr.push(entry);
			}
			count++;
		});
	});*/

    console.log('s');
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

	/*console.log('v');
	res.V.forEach(function(entrys) {
		count = 0 ;
		arr = [] ;
		entrys.forEach(function(entry) {
			if(count == 2){
				V.push(arr);
			} else if(count < 2) {
				arr.push(entry);
			}
			count++;
		});
	});*/

    /*query = 'insert into svdindex(s_index,v_index,u_index) values (ARRAY'+s+', ARRAY'+v+', ARRAY'+u+')';
    db.tx(t => {
        return t.none(query);
    })
    .then(data => {

    })
    .catch(error => {
        console.log(error); 
    });

    require('deasync').sleep(100);*/

    pgp.end();
}

function matrixQuery(query){
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
	query = "select u_index,s_index from svdindex where svdindex_id = 3";
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

	pgp.end();
	return mtrQ ;
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
    return result ;
}


var mtrQ = matrixQuery("เก๊กฮวยรักษาร้อนใน") ;
var cossim = getPercentage(mtrQ);
sortAtK(show);

var count = 0 ;
var k = 10 ;
var result = [] ;
var tmp = [] ;
for(key in show) {
	for(keys in cossim) {
		if(count < k){
			if(show[key] == cossim[keys]){
				console.log(searchByKey(keys));
			}	
		}	
	}
	count++;
}

