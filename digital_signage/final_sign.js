var fs = require('fs');
var exec = require('child_process').exec;

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var rsj = require('rsj');
var dht = require('node-dht-sensor');
dht.initialize(11, 21);


server.listen(8080, function(){
	console.log('server is running');
	exec('sudo pkill chromium-browser', function(){
		exec('sudo chromium-browser --app=http://localhost:8080 --start-fullscreen -no-sandbox');
	});
});

app.get('/', function(req, res){
	res.sendFile(__dirname+'/sign.html');
});

io.on('connection', function(socket){
	console.log('connection');
	rsj.r2j('http://www.weather.go.kr/wid/queryDFSRSS.jsp?zone=2714055500', function(json){
		var data = JSON.parse(json);
		socket.emit('weather'
					, {temp: data[0]['rss:description'].body.data[0].temp['#']
					, wfen: data[0]['rss:description'].body.data[0].wfen['#']});
	});
});

setInterval(function(){
	var date = new Date();
	// update ad & sensor
	if((date.getSeconds() % 5) == 0){
		exec('find /home/pi/img -type f -name \'img*.jpg\' | wc -l', function(err, stdout, stderr){
			image_name = '/home/pi/img/img'+(Math.floor(Math.random()*stdout)+1)+'.jpg';
			fs.readFile(image_name, function(err, data){
				if(!err){
					var buffer = new Buffer(data).toString('base64');
					io.emit('image', buffer);
				} else{
					console.log('err : ' + err);
				}
			});
		});

		var value = dht.read();
		io.emit('temp', {temp:value.temperature, humi:value.humidity});
	}

	// update Weather
	if((date.getMinutes() % 10 == 0)&&(date.getSeconds() % 60) == 0){
			rsj.r2j('http://www.weather.go.kr/wid/queryDFSRSS.jsp?zone=2714055500', function(json){
				var data = JSON.parse(json);

				io.emit('weather'
					, {temp: data[0]['rss:description'].body.data[0].temp['#']
					, wfen: data[0]['rss:description'].body.data[0].wfen['#']});
			});
	}
}, 1000);
