/* 필요한 라이브러리 추가, 서버 동작을 위한 설정 */
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var detect = require('usb-detection');
var oled = require('oled-spi');
var font = require('oled-font-5x7');

// 라우팅 설정
app.get ('/', function(req, res){
	res.sendFile(__dirname + '/audio.html');
});

// 서버 , http://IP주소:8080
server.listen(8080, function(){
	console.log('server is running');
});

var opts = {
  width: 128,
  height: 64,
  dcPin: 23,
  rstPin : 24
};

var volume = 100;
var usb_list = [];
var oled_string ='';

var i = 0;
var width = 8;
var STATUS = 'stop';

/* 
USB 음악 재생 부분
1. 기존에 실행되고 있던 음악을 종료
2. 원하는 음악 재생
*/
var playUSB = function(item){
	exec('pkill mplayer', function(){
		var play = "\"" + item + "\"";
		console.log(play);
		exec('mplayer ' + play);
	});
};

/* 
USB 음악 전체 자동 재생 부분
1. 기존에 실행되고 있던 음악을 종료
2. usb에 있는 모든 음악 재생
*/
var playUSBAuto = function(){
	exec('pkill mplayer', function(){
		exec('mplayer /media/pi/AUDIO/*.mp3 -loop 0');	
	});
};

/* 음악 종료 부분 */
var stopMusic = function(){
	exec('pkill mplayer');
};

/* 재생되고 있는 음악, 라디오의 음량 조절 */
var setVolume = function(vol){
	if(vol == 'up')
	{
		if(volume<100)
			volume += 5;
	}
	else
	{
		if(volume > 0)
			volume -= 5;
	}

	console.log(volume);
	exec('amixer sset PCM ' + volume + '%');
	
};

/* 
라디오 재생 설정 
mbc, kbs, sbs 각 방송국에서 제공하는 mms 주소를 이용하여 재생
음악과 동일하게 mplayer 명령어로 재생 가능
*/
var setRadio = function(radio){
	exec('pkill mplayer', function(){

		console.log('play radio');
		if(radio == 'mbc')
			exec('mplayer mms://210.105.237.100/mbcam');
		if(radio == 'kbs')
			exec('mplayer mms://live.kbs.gscdn.com/world_rki3');
		if(radio == 'sbs')
			exec('mplayer mms://114.108.140.39/magicfm_live');
	});
};

/* usb 삽입 인식 */
detect.on('add', function(device){
	console.log('USB detected');
});

/* usb 제거 인식 */
detect.on('remove', function(device){
	console.log('USB removed');
	usb_list = [];
});

/* 
OLED 관련 설정
1. 처음 실행할 때 보여줄 글씨 설정
2. 동작 상태에 따라 oled에 보여줄 글씨 저장
*/
var oled = new oled(opts);
oled.begin(function(){

  	oled.clearDisplay();
  	oled.setCursor(1,15);
  	oled.writeString(font, 2, "Yeonah's", 0, true);    
  	oled.setCursor(1, 35);
  	oled.writeString(font, 2, "     Audio", 0, true);    

	/* 클라이언트 연결 확인 */
  	io.on('connection', function(socket){
		console.log('connection is start!!!');

		/* 클라이언트로부터 재생 명령이 왔을 때 */
		socket.on('play', function(item){
			playUSB(item.file);
			oled_string = item.title;
			STATUS = 'play';
		});
	
		/* 클라이언트로부터 자동 재생 명령이 왔을 때 */
		socket.on('auto', function(){
			playUSBAuto();
			oled_string = 'USB All Music';
			STATUS = 'play';
		});

		/* 클라이언트로부터 정지 명령이 왔을 때 */
		socket.on('stop', function(){
			stopMusic();
			STATUS = 'stop';
			i = 0;
		});

		/* 클라이언트로부터 음량 키우기 명령이 왔을 때 */
		socket.on('vol_up', function(){
			setVolume('up');
		});

		/* 클라이언트로부터 음량 줄이기 명령이 왔을 때 */
		socket.on('vol_down', function(){
			setVolume('down');
		});

		/* 클라이언트로부터 mbc 라디오 재생 명령이 왔을 때 */
		socket.on('mbc_radio', function(){
			setRadio('mbc');
			oled_string = 'MBC Radio';
			STATUS = 'radio';
		});

		/* 클라이언트로부터 kbw 라디오 재생 명령이 왔을 때 */
		socket.on('kbs_radio', function(){
			setRadio('kbs');
			oled_string = 'KBS Radio';
			STATUS = 'radio';
		});

		/* 클라이언트로부터 mbc 라디오 재생 명령이 왔을 때 */
		socket.on('sbs_radio', function(){
			setRadio('sbs');
			oled_string = 'SBS Radio';
			STATUS = 'radio';
		});
  	});

  	/* 재생/정지 명령에 따른  OLED 글씨 변경 */
	setInterval(function(){     
  		oled.clearDisplay();
    	if(STATUS == 'stop'){
      		oled.setCursor(1,15);
      		oled.writeString(font, 2, "Yeonah's", 0, true);    
      		oled.setCursor(1, 35);
      		oled.writeString(font, 2, "     Audio", 0, true);    
    	}
    	else{
				if(STATUS == 'play'){
      		oled.setCursor(1, 1);
      		oled.writeString(font, 2, "My Audio", 0, true);    
      		oled.fillRect(0, 18, 127, 5, 255);
    		}
				else if (STATUS = 'radio'){
      		oled.setCursor(1, 1);
      		oled.writeString(font, 2, "My Radio", 0, true);    
      		oled.fillRect(0, 18, 127, 5, 255);
				}
      	
				oled.setCursor(1, 40);
      	oled.writeString(font, 2, oled_string.slice(i, i+width), 0, true);
       	i = (++i > oled_string.length)?0:i;
			}
	}, 500);
});

/* 주기적으로 USB 안에 있는 mp3 파일 갱신 */
setInterval(function(){
	exec('find /media/pi/AUDIO -name "*.mp3"', function(err, stdout){
		usb_list = [];
		var list = stdout.split('\n');  // crop string, by line break
		usb_list = usb_list.concat(list.splice(0, list.length-1));
		console.log(usb_list);
		io.sockets.emit('usb_list', usb_list);
	});
}, 3000);
