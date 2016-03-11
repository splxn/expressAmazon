"use strict";
var express = require('express');
var router = express.Router();
var http = require('http');
var fs = require('fs');
var path = require('path');
var parser = require('./parser');

var app = express();

app.set('port', 3000);

app.use('/', router);

app.use(function(req, res, next) {
  var err = new Error('Your page not found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.end('error ' + err);
  });
}

router.get('/api/search/:product', function(req, res, next) {
  parser('http://www.amazon.com/s?field-keywords=' + req.params.product)
    .then(
      arrItems => res.end(JSON.stringify(arrItems, null, 2))
    );
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

