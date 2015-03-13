var gulp = require('gulp');
var gutil = require('gulp-util')
var run = require('gulp-run');

var fs = require('fs');
var path = require('path');
var pkg = require('./package.json');
var request = require('request');

var argv = require('yargs').argv;
var runSequence = require('run-sequence');
JSONStream = require('JSONStream');

var username = 'admin';
var password = 'admin';
var realm = 'public';
var host = dockerOptions.host || 'localhost';
var image = 'rlouapre/centos6-ml:7.0-4.3';

// var port = 
var baseUri = 'http://'+host+':8001';
var initPath = '/admin/v1/init';
var timestampPath = '/admin/v1/timestamp';
var instanceAdminPath = '/admin/v1/instance-admin';

var waitForRestart = function(timestamp, cb) {
  setTimeout(function() {
    var options = {
      'method': 'GET',
      'url' : baseUri + timestampPath,
      'auth': {
        'username': username,
        'password': password,
        'sendImmediately': false
      }
    };
    request.get(options, function(error, response, body) {
      var previous = new Date(timestamp);
      var current = new Date(body);
      if (previous < current) {
        cb();
      } else {
        console.log('Retry to get new timestamp - previous: %s - current: %s\n', previous, current);
        waitForRestart(timestamp, cb);
      }
    });
  }, 1000);
};

gulp.task('ml:init', function (cb) {
  var options = {
    'method': 'POST',
    'url': baseUri + initPath,
    'json': true,
    'body': {}
  };

  request.post(options, function(error, response, body) {
    console.log('initPath: %j\n', body);
    var timestamp = body.restart['last-startup'][0].value;
    waitForRestart(timestamp, function() {
      var options = {
        method: 'POST',
        url: baseUri + instanceAdminPath,
        json: true,
        body: {
          "admin-username" : username,
          "admin-password" : password,
          "realm" : realm
        }
      };
      request(options, function(error, response, body) {
        var timestamp = body.restart['last-startup'][0].value;
        console.log('error: %j\n', error);
        console.log('body: %j\n', body);
        waitForRestart(timestamp, function() {
          cb();
        });
      });
    });
  });
});

gulp.task('default', function() {
    runSequence('test', 'clean', 'build', function() {
        console.log('Build completed.');
    });
});
