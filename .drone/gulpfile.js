var gulp = require('gulp');
var gutil = require('gulp-util')
var run = require('gulp-run');

var fs = require('fs');
var path = require('path');
var pkg = require('./package.json');
var Docker = require('dockerode');
var request = require('request');

var argv = require('yargs').argv;
var runSequence = require('run-sequence');
JSONStream = require('JSONStream');

var dockerOptions;
try {
  var _dockerOptions = require("./docker.json")
  var certPath = _dockerOptions.certPath;
  dockerOptions = {
    protocol: _dockerOptions.protocol,
    host: _dockerOptions.host,
    port: _dockerOptions.port,
    ca: fs.readFileSync(path.join(certPath, 'ca.pem')),
    cert: fs.readFileSync(path.join(certPath, 'cert.pem')),
    key: fs.readFileSync(path.join(certPath, 'key.pem'))
  }
} catch (e) {
  console.log(e);
}
console.log(dockerOptions)

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

// dockerOptions = {
//   protocol: 'https',
//   host: host,
//   port: 2376,
//   ca: fs.readFileSync('D:/Users/Richard/.docker/machines/.client/ca.pem'),
//   cert: fs.readFileSync('D:/Users/Richard/.docker/machines/.client/cert.pem'),
//   key: fs.readFileSync('D:/Users/Richard/.docker/machines/.client/key.pem')
// }

var docker = new Docker(dockerOptions);

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


function pullImage(tag, cb, onProgress)
{
  docker.pull(tag, function(err, cmdOutStream)
  {
    if (err)
      return cb(err, []);

    var parser = JSONStream.parse(),
        output = [];

    parser.on('root', onStreamEvent);
    parser.on('error', onStreamError);
    parser.on('end', onStreamEnd);

    cmdOutStream.pipe(parser);

    function onStreamEvent(evt)
    {
      output.push(evt);

      if (evt.error)
        return onStreamError(evt.error);

      onProgress && onProgress(evt);
    }

    function onStreamError(err)
    {
      parser.removeListener('root', onStreamEvent);
      parser.removeListener('error', onStreamError);
      parser.removeListener('end', onStreamEnd);
      cb(err, output);
    }

    function onStreamEnd() {
      cb(null, output);
    }
  });
}

function checkImage(image)
{
  docker.getImage(image).inspect(function(err, data)
  { 
    if (err)
      return console.error('failed to inspect image: ' + err);

    console.log('kafka:latest: ' + data.Id);
  });
}

// set NODE_TLS_REJECT_UNAUTHORIZED=0
gulp.task('docker:machine-start', function(cb) {
  // var docker = new Docker({
  // });
  var createOptions = {
    'Image': image,
    'AttachStdin': false,
    'AttachStdout': false,
    'AttachStderr': false
  };
  var startOptions = {
    "PortBindings": {
      "8000/tcp": [{"HostPort": "8000"}],
      "8001/tcp": [{"HostPort": "8001"}],
      "8002/tcp": [{"HostPort": "8002"}],
      "9305/tcp": [{"HostPort": "9305"}],
      "9306/tcp": [{"HostPort": "9306"}]
    }
  };

  pullImage(image,
    function onCompleted(err, output)
    {
      if (err)
        return console.error('failed to pull image:', err);

      docker.createContainer(createOptions,
        function(err, container) {
          console.log('error: %j', err);
          console.log('container: %j', container);
          container.start(startOptions, 
            function(err, data) {
              console.log('data: %j', data);
              console.log('error: %j', err);
              cb();
            }
          );
      });

      // useful when you don't pass the second, onProgress callback
      // console.log('full output:', output.map(JSON.stringify).join('\n'));

      checkImage();
    },
    function onProgress(evt)
    {
      console.log('pulling progress:', evt);
    }
  );
  // docker.pull(image, function(err, stream) {
  //   docker.createContainer(createOptions,
  //     function(err, container) {
  //       console.log('error: %j', err);
  //       console.log('container: %j', container);
  //       container.start(startOptions, 
  //         function(err, data) {
  //           console.log('data: %j', data);
  //           console.log('error: %j', err);
  //           cb();
  //         }
  //       );
  //   });
  // });
});

gulp.task('docker:pull', function(cb) {
  pullImage(image,
    function onCompleted(err, output)
    {
      if (err)
        return console.error('failed to pull image:', err);

      console.log('done!');

      // useful when you don't pass the second, onProgress callback
      // console.log('full output:', output.map(JSON.stringify).join('\n'));

      checkImage();
    },
    function onProgress(evt)
    {
      console.log('pulling progress:', evt);
    }
  );
});

gulp.task('docker:build', function (cb) {
  runSequence('docker:machine-start', function() {
    console.log('Docker build');
    cb();
  });
});

// gulp.task('test', ['coverage', 'lint', 'mocha', 'xray']);
// gulp.task('default', ['test', 'clean', 'build']);
gulp.task('default', function() {
    runSequence('test', 'clean', 'build', function() {
        console.log('Build completed.');
    });
});
