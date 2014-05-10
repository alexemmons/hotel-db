'use strict';

var mysql = require('mysql'),
    http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('socket.io').listen(8000);

var credentials={
    host: '',
    port: ,
    user: '',
    password: '',
    database: ''
};
var pageContent=fs.readFileSync('frontdesk.html',"utf8");
var cssContent=fs.readFileSync('css/bootstrap.min.css',"utf8");
var jsContent=fs.readFileSync('js/bootstrap.min.js',"utf8");

http.createServer(handleRequest).listen(1337);

function handleRequest(request,response){
    if (request.url === '/favicon.ico') {
        response.writeHead(200, {'Content-Type': 'image/x-icon'} );
        response.end();
        return;
    }
    if (request.url === '/css/bootstrap.min.css') {
        response.writeHead(200,{'Content-Type':'text/css'});
        response.write(cssContent);
        response.end();
        return;
    }
    if (request.url === '/js/bootstrap.min.js') {
        response.writeHead(200,{'Content-Type':'text/javascript'});
        response.write(jsContent);
        response.end();
        return;
    }

    var pathname = url.parse(request.url).pathname;
    var filename = __dirname + pathname;
    if(pathname === '/')
        filename = __dirname + '/frontdesk.html';
    console.log(pathname + ' -> ' +filename);

    if(fs.statSync(filename).isFile())
        fs.createReadStream(filename).pipe(response);
    else{
        response.writeHead(404,'File Not Found');
        response.end();
    }


    io.sockets.on('connection', function (socket) {

        socket.on('myDelete', function (ids) {
            var i;
            for (i = ids.length - 1; i >=0; i--) {
                var q2 = 'delete from register where itemID = '+ids[i]+'+1 limit 1;';
                var connection = mysql.createConnection(credentials);
                connection.query(q2);
                connection.end();
            }
        });
        socket.on('myVoid', function () {
            var q3 = 'truncate register;';
            var connection = mysql.createConnection(credentials);
            connection.query(q3);
            connection.end();
        });
        socket.on('myUser', function (name) {
            var query;
            var connection = mysql.createConnection(credentials);


            query=connection.query('update register set employee = "'+name+'";');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('employeeAdded');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('myGuest', function (name) {
            var query;
            var connection = mysql.createConnection(credentials);


            query=connection.query('update register set guest = "'+name+'";');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('guestAdded');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('getCharges', function () {
            function getChargesFromDatabase(callback){
                var query;
                var connection = mysql.createConnection(credentials);

                var resultsArray = [];
                query=connection.query('SELECT name from extra_charges;');
                query.on('error',function(err){
                    console.log('A database error occurred:');
                    console.log(err);
                });
                query.on('result',function(result){
                    resultsArray.push(result.name);
                });
                query.on('end',function(result){
                    connection.end();
                    callback(resultsArray);
                });
            }

            getChargesFromDatabase(function(contents) {
                socket.emit('charges', contents);
            });
        });

        socket.on('getAvailable', function () {
            function getAvailableFromDatabase(callback){
                var query;
                var connection = mysql.createConnection(credentials);

                var resultsArray = [];
                query=connection.query('SELECT number from rooms where vacancy = 1;');
                query.on('error',function(err){
                    console.log('A database error occurred:');
                    console.log(err);
                });
                query.on('result',function(result){
                    resultsArray.push(result.number);
                });
                query.on('end',function(result){
                    connection.end();
                    callback(resultsArray);
                });
            }

            getAvailableFromDatabase(function(contents) {
                socket.emit('available', contents);
            });
        });

        socket.on('getOccupied', function () {
            function getAvailableFromDatabase(callback){
                var query;
                var connection = mysql.createConnection(credentials);

                var resultsArray = [];
                query=connection.query('SELECT number from rooms where vacancy = 0;');
                query.on('error',function(err){
                    console.log('A database error occurred:');
                    console.log(err);
                });
                query.on('result',function(result){
                    resultsArray.push(result.number);
                });
                query.on('end',function(result){
                    connection.end();
                    callback(resultsArray);
                });
            }

            getAvailableFromDatabase(function(contents) {
                socket.emit('occupied', contents);
            });
        });


        socket.on('getGuests', function () {
            function getAvailableFromDatabase(callback){
                var query;
                var connection = mysql.createConnection(credentials);

                var resultsArray = [];
                query=connection.query('SELECT name from guests;');
                query.on('error',function(err){
                    console.log('A database error occurred:');
                    console.log(err);
                });
                query.on('result',function(result){
                    resultsArray.push(result.name);
                });
                query.on('end',function(result){
                    connection.end();
                    callback(resultsArray);
                });
            }

            getAvailableFromDatabase(function(contents) {
                socket.emit('guests', contents);
            });
        });

        socket.on('name', function(guestName) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('insert into guests (name, member, points) values ("'+guestName+'", 0, 0);');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('guestAdded');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('addRoomToRegister', function(num) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('select price from rooms where number = '+num+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('roomAdded', result.price);
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('addChargeToRegister', function(charge) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('select price from extra_charges where name = "'+charge+'";');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('chargeAdded', result.price);
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('checkIn', function(num, total, guestName, date, employee) {
            console.log('wtf');
            var query;
            var q2 = 'insert into bills (guest, room, total, employee) values ("'+guestName+'", '+num+', '+total+', "'+employee+'");';
            var connection = mysql.createConnection(credentials);
            connection.query(q2);
            query=connection.query('update rooms set vacancy = 0, checkout_date = "'+date+'" where number = '+num+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('checkedIn');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('myPayment', function (paymentType) {
            var query2;
            var addPaymentToRegister = "update register set paymentType='"+paymentType+"' where id > 0;";
            var q6 = "insert into transactions (employee, payment_type, time, total) select r.user, r.paymentType, r.time_stamp, sum(r.price) from register r;";
            var connection = mysql.createConnection(credentials);
            connection.query(addPaymentToRegister);
            query2=connection.query(q6);
            query2.on('result', function(){
                socket.emit('addPayment');
            });
            query2.on('end',function(result){
                connection.end();
            });
        });

        socket.on('addKeycard', function(occNum) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('insert into key_cards (room_num, guest) select bills.room, bills.guest from bills where bills.room = '+occNum+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){

                socket.emit('keycardAdded');
            });
            query.on('end',function(result){
                connection.end();
            });
        });
        socket.on('showKeycardList', function (occNum) {
            function getKeycardList(callback){
                var query;
                var connection = mysql.createConnection(credentials);

                var resultsArray = [];
                query=connection.query('SELECT id from key_cards where key_cards.room_num = ' + occNum +';');
                query.on('error',function(err){
                    console.log('A database error occurred:');
                    console.log(err);
                });
                query.on('result',function(result){
                    resultsArray.push(result.id);
                });
                query.on('end',function(result){
                    connection.end();
                    callback(resultsArray);
                });
            }

            getKeycardList(function(contents) {
                socket.emit('getKeycardList', contents);
            });
        });

        socket.on('checkout', function(roomNum, payment) {
            var query;
            //var q2 = '';
            var connection = mysql.createConnection(credentials);
            //console.log(connection.query(q2));
            query=connection.query('insert into transactions (employee, guest, room_num, checkout_date, payment_type, total, time_stamp) select bills.employee, bills.guest, '+roomNum+', rooms.checkout_date, "'+payment+'", bills.total, now() from bills,rooms where bills.room = '+roomNum+' and rooms.number = '+roomNum+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('checkedOut');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('cleanUp', function (roomNum) {
            var query;
            var q2 = 'update rooms set vacancy = 1, checkout_date = null where number = '+roomNum+';';
            var q3 = 'delete from key_cards where key_cards.room_num = '+roomNum+';';
            var connection = mysql.createConnection(credentials);
            connection.query(q2);
            connection.query(q3);
            query=connection.query('delete from bills where bills.room = '+roomNum+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('cleanedUp');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('updateBill', function(occNum, total) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('update bills set total = (total+ '+total+') where room = '+occNum+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('billUpdated');
            });
            query.on('end',function(result){
                connection.end();
            });
        });

        socket.on('getBill', function(occNum) {
            var query;
            var connection = mysql.createConnection(credentials);
            query=connection.query('select total from bills where room = '+occNum+';');
            query.on('error',function(err){
                console.log('A database error occurred:');
                console.log(err);
            });
            query.on('result',function(result){
                socket.emit('bill', result.total);
            });
            query.on('end',function(result){
                connection.end();
            });
        });

    });
}

