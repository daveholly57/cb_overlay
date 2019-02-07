const request = require("request");
const logger = require("logger");
const SockJS = require("sockjs-client");
var http = require('http');
var fs = require('fs');
var dateformat = require('dateformat');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var nStatic = require('node-static');
var path = require('path');

let chatHost = null;
let sock = null;
let room = null;
const url = 'https://chaturbate.com/api/chatvideocontext/sexxylaurab/';

var serve = serveStatic('media', {'index': ['index.html', 'index.htm']})

var fileServer =  new nStatic.Server('.', { cache: 7200, headers: {'X-Hello':'World!'} });

var server = http.createServer(function onRequest (request, response) {
    // request.setSocketKeepAlive(true)
    request.addListener('end', function () {
        fileServer.serve(request, response, function (err, res) {
            if (err) { // An error as occured
                console.error("> Error serving " + request.url + " - " + err.message);
                response.writeHead(err.status, err.headers);
                response.end();
            } else { // The file was served successfully
                serve(request, response, finalhandler(request, response));
                console.log("> " + request.url + " - " + res.message);
            }
        });
    }).resume();   
});

server.listen(8080);

let tips = [];
var canI = 1;
var total_tips = 0;

function pollCb() {
    var io = require('socket.io').listen(server);

    var countdown = 1000;  
    var ntime = new Date();
    var chktime = new Date().getTime();
    
    io.sockets.on('connection', function (socket) {  
        console.log('connected');
        socket.setMaxListeners(20);
        // -----------------------------------------------------------------------------------
        io.sockets.emit('connected');
        socket.on('reset', function (data) {
            countdown = 1000;
        });
    });
    
    console.log("Start pollCb");
    request.get(url, async function (error, response, body) {
        if (error) {
            console.log("Unable to parse cb response");
            return
    }
    let info = {};
    try {
            info = JSON.parse(body);
        } catch (e) {
            console.log("Unable to parse cb response");
            return;
        }
    if ((info['wschat_host'] && info['wschat_host'] !== chatHost) || (sock && sock.readyState == 3)) {
        chatHost = info['wschat_host'];
        if (!chatHost) {
            return
        }
        if (sock) {
            try {
            sock.close();
            } catch (e) {
                console.log("Error closing socket");
            }
        }

        console.log("Opening new socket to" + chatHost);
        room = info['broadcaster_username'];
        sock = new SockJS(chatHost);   
        sock.onopen = function () {
            console.log("Socket opened");
            const con = {
                method: 'connect',
                data: {
                    user: info['chat_username'],
                    password: info['chat_password'],
                    room: info['broadcaster_username'],
                    room_password: info['room_pass']
                }
        };
        console.log(con);
        sock.send(JSON.stringify(con));
        };

        sock.onmessage = function (e) {
            var tipmessage = {};
            var tipper = '';
            const data = JSON.parse(e.data);
            // console.log(data);              // This shows EVERYTHING!
            if (data.method && data.method === 'onAuthResponse') {
                sock.send(JSON.stringify({
                method: 'joinRoom',
                data: {
                    room: info['broadcaster_username']
                }
            }));
            } else if (data.method && data.method === "onNotify") {     // was onNotifyTipAlert, but this doesn't exist.
                // tip
                const args = JSON.parse(data.args[0]);
                var item;
                for (item in args) {
                    if (item == 'from_username') {
                        tipper = args['from_username'];
                    }
                    if (item == 'amount') {
                        tipmessage = {'tipper': tipper.toUpperCase(), 'amount': args['amount']};
                        console.log(tipmessage.tipper.toUpperCase() + ' TIPPED ' + tipmessage.amount + ' TOKENS!');
                        tips.push(tipmessage);
                        total_tips += tipmessage.amount;
                        io.sockets.emit('tipsingle', total_tips);
                    }
                }
            }

            // if (tips.length) {
        };
//
// This is where we test how MUCH was tipped!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
        function pollTipsArray() {
            if (tips.length) {
                if (canI == 1) {
                    var tipmsg = tips.shift();     // just one tipmsg.shift.
                    if(tipmsg.amount >= 10000) {
                        io.sockets.emit('tipmessage', '5' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    }
                    else if(tipmsg.amount >= 1000) {
                        io.sockets.emit('tipmessage', '4' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    }
                    else if(tipmsg.amount >= 500) {
                        io.sockets.emit('tipmessage', '3' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    }
                    else if (tipmsg.amount >= 100) {
                        io.sockets.emit('tipmessage', '2' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    } 
                    else if (tipmsg.amount >= 25) {
                        io.sockets.emit('tipmessage', '1' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    } 
                    // else {
                    //     io.sockets.emit('tipmessage', '1' + tipmsg.tipper + ' TIPPED ' + tipmsg.amount + ' TOKENS!');
                    // }
                    canI = 0;
                    setTimeout(function(){
                        io.sockets.emit('tipoff');
                        canI = 1;
                    },5000);  
                }
            }    
        } setInterval(pollTipsArray,1000);
        

        sock.onclose = function () {
            console.log('closed');
            };

    }
    
    console.log(body);
    });

}

pollCb();
