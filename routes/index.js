var express = require('express');
var router=express.Router();
var sqlite3 = require('sqlite3').verbose();
var db= new sqlite3.Database('/Users/Massimiliano/nodemcu.db');
var moment= require('moment');
var data=moment().format('LLLL');
//var s=require('underscore.string');
var arrToCsv= require("array-to-csv");
var fs=require("fs");
var nodemailer= require("nodemailer");


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nodemculogger@gmail.com',
    pass: 'nodemcu2017'
  }
 });




const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com');

//var lastid=0;
var temperature=0;
var humidity=0;
var id= 0;

var labelsArray= [];
var tempArray = [];
var humArray = [];

var tempDB=[]; 
var humiDB=[];
var timeDB=[];
   

String.prototype.insertAt=function(index, string) { 
  return this.substr(0, index) + string + this.substr(index);
 }
String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
 };

function sendCsv(receiver,filename){
  var mailOptions = {
    from: 'nodemculogger@gmail.com',
    to: receiver,
    subject: 'Nodemcu Data',
    attachments: [{filename : filename + ".csv", path: "nodemcuCsv.csv"}],
   };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent to '+receiver);
    }
   });

 }
function Date(){
   var hour = moment().hours();
   var day = moment().day();
   var year= moment().year();
   var month= moment().month();
   //console.log(moment().format('LLLL'));
 }

client.on('connect', () => {  

   console.log("connesso al broker");
   client.subscribe("nodemcu/dht");
   
 });
 Date();

function generateCsv(receiver, filename){
    x=0
    array_for_csv=[]
    for(x=0; x <= tempDB.length-1; x++){
        //console.log([tempDB[x],humiDB[x],timeDB[x]]);
        array_for_csv.push([tempDB[x],humiDB[x],timeDB[x]+= "\r\n"]); //array creation for csv file
   
    }
    csvfile=arrToCsv([
           ["temp","humi","time"],
           [array_for_csv]
    ]);
   
    csvfile=csvfile.slice(0,14)+csvfile.slice(16,-1);
    csvfile=csvfile.insert(14,"\n,");
    csvfile= csvfile.insert(0,",");
    
    var Stream = fs.createWriteStream("nodemcuCsv.csv");
    Stream.write(csvfile);

    sendCsv(receiver,filename);
    //console.log(csvfile);
    //console.log("cvs generated");

 } 
 
client.on('message', (topic, buffer) => {  
   id++;
   console.log("dati ricevuti");
   var message= buffer.toString();

   var day= moment().format("l");
   var time= day+" "+moment().format('LT');
   var values=message.split(";");
   

   temperature=values[0];
   humidity=values[1];
   
   var timeString = time.substr(3, 0) + "'" + time.substr(0);
   timeString +="'";

   
   labelsArray.push(timeString);
   console.log("labels: "+ labelsArray);
   //console.log(labelsArray);
  
   tempArray.push(temperature);
   humArray.push(humidity);
   db.run("INSERT INTO misurazioni2 VALUES(?,?,?,?)",id,temperature,humidity,timeString);
 });




router.get('/', function(req, res, next) {
  
   db.each("SELECT temp, humi, time FROM misurazioni2", function(err, row) {  
      console.log("data: "+row.temp+"|"+row.humi+"|"+row.time);
      tempDB.push(row.temp);
      humiDB.push(row.humi);
      timeDB.push(row.time); 
    
  }, function(){
       data=moment().format('LLLL'); 
       res.render('./index.ejs',{
         temperature: temperature, 
         humidity: humidity,
         labels: labelsArray,

         humArray: humArray,
         tempArray: tempArray,
         humidity: humidity,

         labels_history: timeDB,
         humArray_history: humiDB,
         tempArray_history: tempDB,
         
         data: data
   });


  });  
  
  

 });

router.post("/generateCsv", function(req,res){
       console.log("requested");
       generateCsv(req.body.username, req.body.filename)
});





module.exports = router;
