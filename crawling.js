var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var iconv  = require('iconv-lite');
var os = require("os");
var cutStopword = require('./cutStopword.js');
var isset = require('isset');

var pgp = require('pg-promise')();
var connectionString = 'postgres://postgres:password@localhost/Chatbot';
var db = pgp(connectionString);
var queryResult = "" ;

var question = "" ;
var answer = "" ;

var pagesVisited = {};
var pagesToVisit = [];
var numPagesVisited = 0;
var url = "";
var baseUrl = "";

exports.pushSeed = function (seed) {
  url = new URL(seed);
  if(seed.indexOf('mahidol')>0){
    baseUrl = url.protocol + "//" + url.hostname + "/user/";
  }else if(seed.indexOf('abhaiherb')>0){
    baseUrl = url.protocol + "//" + url.hostname ;
  }else{
    baseUrl = url.protocol + "//" + url.hostname + "/ifc_herbal/";
  }
  pagesToVisit.push(seed);
  crawl();
}


function crawl() {
	var nextPage = pagesToVisit.shift();

	/*if(numPagesVisited >= 50) {
    
    		return;
  	}*/
  if(isset(nextPage)){
    if (nextPage in pagesVisited) {
      crawl();
    } else {
      visitPage(nextPage, crawl);
    }
  }
	

}

function visitPage(url, callback) {
	pagesVisited[url] = true;
//	numPagesVisited++;
  console.log(url);
	var requestOptions  = { encoding: null, method: "GET", uri: url };
	request(requestOptions, function(error, response, body) {
    var utf8String = iconv.decode(new Buffer(body), url.indexOf('mahidol')>0 ? "tis-620" : url.indexOf('abhaiherb')>0 ? "utf8" : "windows-874");

   	if(error || response.statusCode !== 200) {
   	  console.log("Error: " + error);
   	  callback();
      return;
   	}

   	var $ = cheerio.load(utf8String);

    if(url.indexOf('mahidol')>0){
      if($('div.col-md-9').children().last().length != 0){
        question = $('div.col-md-9 > ul').children().first().text() ;
        answer = $('div.col-md-9').children().last().text() ;

     //     question = cutStopword.cutStopwords(question) ;
          var query = 'insert into faqcrawling(question,answer) values (\''+question+'\',\''+answer+'\')' ;

          db.tx(t => {
          return t.none(query);
          })
          .then(data => {

          })
          .catch(error => {
            console.log(error); 
          });

      }  
    }else if(url.indexOf('abhaiherb')>0){
      if($('div.odd > p').length != 0){
        question = $('h1.title').text() ;
        answer = $('div.odd > p').text() ;

        var query = 'insert into faqcrawling(question,answer) values (\''+question+'\',\''+answer+'\')' ;

          db.tx(t => {
          return t.none(query);
          })
          .then(data => {

          })
          .catch(error => {
            console.log(error); 
          });

      }
    }else{
      $ = cheerio.load(utf8String, {xmlMode: true});
      var x = $('table:nth-child(2) > tr > td:nth-child(3)').children().next().html() ;

      var $$ = cheerio.load(x,{normalizeWhitespace: true,xmlMode: true});
      if(isset($$('table:nth-child(2) > tr:nth-child(2) > td > table > tr:nth-child(1)').text())){
        question = $$('table:nth-child(1) > tr:nth-child(2) > td > table > tr:nth-child(2)').text();
        answer = $$('table:nth-child(2) > tr:nth-child(2) > td > table > tr:nth-child(1)').text();
   
        var query = 'insert into faqcrawling(question,answer) values (\''+question+'\',\''+answer+'\')' ;
          db.tx(t => {
          return t.none(query);
          })
          .then(data => {

          })
          .catch(error => {
            console.log(error); 
          });

      }
    }

   	collectInternalLinks($);
   	callback();
   	
	});
}

function collectInternalLinks($) {
  if(url.hostname.indexOf('mahidol')>0){
    var FAQ = $("a[href^='reply']");
    FAQ.each(function() {
      pagesToVisit.push(baseUrl + $(this).attr('href'));
    });

    var page = $("a[href^='qa']");
    page.each(function() {
      pagesToVisit.push(baseUrl + $(this).attr('href'));
    });

  }else if(url.hostname.indexOf('abhaiherb')>0){
    var FAQ = $("a[href^='/faq']");
    FAQ.each(function() {
      pagesToVisit.push(baseUrl + $(this).attr('href'));
    });
  }else{
    var FAQ = $("a[href^='view_faq']");
    FAQ.each(function() {
      pagesToVisit.push(baseUrl + $(this).attr('href'));
    });

    var page = $("a[href^='faq']");
    page.each(function() {
      pagesToVisit.push(baseUrl + $(this).attr('href'));
    });
  }
}