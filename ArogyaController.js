var vector = require('./vector.js');
var latent = require('./latent.js');
var os = require("os");
var fs = require('fs');
var pgp = require('pg-promise')();
var connectionString = 'postgres://postgres:password@localhost/Chatbot';
var db = pgp(connectionString);
vector.setDatabase(db,pgp);
latent.setDatabase(db,pgp);

var qa = "กินยาร่วมกับยาแผนปัจจุบันได้หรือไม่" ;
var vectorRank = vector.getQARank(qa);
var latentRank = latent.getQARank(qa);
var result = parameterWeighted(vectorRank, latentRank, 0.2) ;
var result2 = parameterWeighted(vectorRank, latentRank, 0.4) ;
var result3 = parameterWeighted(vectorRank, latentRank, 0.6) ;
var result4 = parameterWeighted(vectorRank, latentRank, 0.8) ;
showResult(result,1) ;
showResult(result2,2) ;
showResult(result3,3) ;
showResult(result4,4) ;

function parameterWeighted(vector, latent, weight) {
	var weight1 = weight ;
	var weight2 = 1-weight ;
	var result = [] ;

	for(key in vector){
		vector[key] = vector[key] * weight1 ;
	}

	for(key in latent){
		latent[key] = latent[key] * weight2 ;
	}

	for(keys in vector){
		for(key in latent){
			if(key == keys){
				result[key] = vector[keys] + latent[key] ;
			}
		}
	}

	for(key in vector){
    	if(!(key in result)){
      		result[key] = vector[key] ;
		}
	}

	for(key in latent){
	    if(!(key in result)){
	      result[key] = latent[key] ;
	    }
	}

	return result ;
}

function showResult(result,num){

  function compareNumbers(a, b) {
    return b - a;
  }

  var temp = result.slice(0) ;
  var k = '' ;
  result.sort(compareNumbers);
  var visited = [] ;
  for(let n=0 ; n<10 ; n++){
    for(key in temp){
      if(temp[key]==result[n]){
        if(!visited[key]){
        	data = searchByKey(key);
        	k += '-----------QA------------'+os.EOL+data[0].question+os.EOL+'---------Anwser----------'+os.EOL+data[0].answer+os.EOL ;
        	/*console.log('');
        	console.log('-----------QA------------');
        	console.log(data[0].question);
        	console.log('---------Anwser----------');
        	console.log(data[0].answer);
        	console.log('');*/
        	visited[key] = true ;
        }
      }
    }
  }
  fs.writeFileSync("C:/Users/TanGX/Desktop/arogya/result"+num+".txt", k, "UTF-8");
  pgp.end();
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

    while(result === undefined) {
	    require('deasync').sleep(100);
	}

    return result ;
}