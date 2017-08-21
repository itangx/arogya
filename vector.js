sw = require('stopword');
const isset = require('isset');
var sprintf = require("sprintf-js").sprintf;
var math = require('mathjs');
var cutStopword = require('./cutStopword.js');
var db,pgp ;

exports.setDatabase = function (dbconnection, pgpConnection){
  db = dbconnection ;
  pgp = pgpConnection ;
}

function getQueryTf(qa){
  var word = cutStopword.cutStopwords(qa) ;
  var dictionary = [];

  for(let y = 0 ; y < word.length ; y++){
    if(!isset(dictionary[word[y]])){
      var newArray = [] ;
      newArray['tf'] = 0 ;
      dictionary[word[y]] = newArray;
    }
    dictionary[word[y]]['tf']++;
  }
  
  return dictionary ;
}

function getQuestionRank(qa){
  
  var max = 0 ;
  var temp = 0 ;
  var queryCount = getQueryTf(qa) ;
  for(key in queryCount){
    temp = queryCount[key]['tf'] ;
    max = math.max(max,temp);
  }

  var queryTfidf = [] ;
  var queryLength = [] ;
  var docTfidf = [] ;
  var docLength = [] ;
  var cosime = [] ;
  var query ;
  var data ;
  for(key in queryCount){
    
    data = searchQuestionByWord(key);

      //query
      queryTfidf[key] = (queryCount[key]['tf']/max) * data[0].idf ; 
      if(!isset(queryLength['doc1'])){
        queryLength['doc1'] = queryTfidf[key] * queryTfidf[key] ;
      }else{
        queryLength['doc1'] += queryTfidf[key] * queryTfidf[key] ;
      }

      //document
      for(let x=0 ; x<data.length ; x++){
        if(!isset(docLength[data[x].faq_id])){
          if(!isset(docTfidf[key])){
            docTfidf[key] = [] ;
          }
          docTfidf[key][data[x].faq_id] = data[x].tf * data[x].idf ;
          docLength[data[x].faq_id] = data[x].tf * data[x].tf * data[x].idf * data[x].idf ;
        }else{
          if(!isset(docTfidf[key])){
            docTfidf[key] = [] ;
          }
          docTfidf[key][data[x].faq_id] = data[x].tf * data[x].idf ;
          docLength[data[x].faq_id] += data[x].tf * data[x].tf * data[x].idf * data[x].idf ;
        } 
      }

  }

  for(key in docLength){
    docLength[key] = math.sqrt(docLength[key]) ;
  }

  queryLength['doc1'] = math.sqrt(queryLength['doc1']);

  //cosime
  for(key in docTfidf){
    for(k in docTfidf[key]){
      if(!isset(cosime[k])){
        cosime[k] = docTfidf[key][k] * queryTfidf[key];
      }else{
        cosime[k] += docTfidf[key][k] * queryTfidf[key];
      }  
    }
  }
  var show = [] ;
  var temp = [] ;
  for(key in cosime){
    if(cosime[key] / (docLength[key] * queryLength['doc1']) > 0.2){
      show[key] = cosime[key] / (docLength[key] * queryLength['doc1']) ;
    }
  }

  pgp.end();
  return show ;
}

function getAnswerRank(qa){
  
  var max = 0 ;
  var temp = 0 ;
  var queryCount = getQueryTf(qa) ;
  for(key in queryCount){
    temp = queryCount[key]['tf'] ;
    max = math.max(max,temp);
  }

  var queryTfidf = [] ;
  var queryLength = [] ;
  var docTfidf = [] ;
  var docLength = [] ;
  var cosime = [] ;
  var query ;
  var data ;
  for(key in queryCount){

    data = searchAnswerByWord(key);
    
      //query
      queryTfidf[key] = (queryCount[key]['tf']/max) * data[0].idf ; 
      if(!isset(queryLength['doc1'])){
        queryLength['doc1'] = queryTfidf[key] * queryTfidf[key] ;
      }else{
        queryLength['doc1'] += queryTfidf[key] * queryTfidf[key] ;
      }

      //document
      for(let x=0 ; x<data.length ; x++){
        if(!isset(docLength[data[x].faq_id])){
          if(!isset(docTfidf[key])){
            docTfidf[key] = [] ;
          }
          docTfidf[key][data[x].faq_id] = data[x].tf * data[x].idf ;
          docLength[data[x].faq_id] = data[x].tf * data[x].tf * data[x].idf * data[x].idf ;
        }else{
          if(!isset(docTfidf[key])){
            docTfidf[key] = [] ;
          }
          docTfidf[key][data[x].faq_id] = data[x].tf * data[x].idf ;
          docLength[data[x].faq_id] += data[x].tf * data[x].tf * data[x].idf * data[x].idf ;
        } 
      }

  }

  for(key in docLength){
    docLength[key] = math.sqrt(docLength[key]) ;
  }

  queryLength['doc1'] = math.sqrt(queryLength['doc1']);

  //cosime
  for(key in docTfidf){
    for(k in docTfidf[key]){
      if(!isset(cosime[k])){
        cosime[k] = docTfidf[key][k] * queryTfidf[key];
      }else{
        cosime[k] += docTfidf[key][k] * queryTfidf[key];
      }  
    }
  }
  var show = [] ;
  var temp = [] ;
  for(key in cosime){
    if(cosime[key] / (docLength[key] * queryLength['doc1']) > 0.2){
      show[key] = cosime[key] / (docLength[key] * queryLength['doc1']) ;
    }
  }

  pgp.end();
  return show ;
}

exports.getQARank = function (qa){
  var _Q = getQuestionRank(qa);
  var _A = getAnswerRank(qa);
  var result = [];
  var temp = [];
  for(key in _Q){
    for(k in _A){
      if(key == k){
        result[key] = (_Q[key] + _A[k]) / 2 ;
      }
    }
  }

  for(key in _Q){
    if(!(key in result)){
      result[key] = _Q[key] / 2;
    }
  }

  for(key in _A){
    if(!(key in result)){
      result[key] = _A[key] / 2;
    }
  }

  pgp.end();
  return result ;
}

exports.showResult = function (result){

  function compareNumbers(a, b) {
    return b - a;
  }

  var temp = result.slice(0) ;

  result.sort(compareNumbers);
  var visited = [] ;
  for(let n=0 ; n<10 ; n++){
    for(key in temp){
      if(temp[key]==result[n]){
        if(!visited[key]){
          data = searchByKey(key);
          console.log('');
          console.log('-----------QA------------');
          console.log(data[0].question);
          console.log('---------Anwser----------');
          console.log(data[0].answer);
          console.log('');
          visited[key] = true ;
        }
      }
    }
  }

  pgp.end();
}

function searchQuestionByWord(word){
    var result ;
    query = "select faq_id,tf,idf from qindex where " ;
    query += "word = '"+word+"'" ;
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      result = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    while(result === undefined) {
      require('deasync').sleep(100);
    }
    return result ;
}

function searchAnswerByWord(word){
    var result ;
    query = "select faq_id,tf,idf from aindex where " ;
    query += "word = '"+word+"'" ;
    db.tx(t => {
      return t.any(query);
    })
    .then(data => {
      result = data ;
    })
    .catch(error => {
      console.log(error); 
    });

    while(result === undefined) {
      require('deasync').sleep(100);
    }
    return result ;
}

function searchByKey(word){
    var result ;
    query = "select * from faqcrawling where " ;
    query += "faq_id = "+word ;
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
    return result ;
}
