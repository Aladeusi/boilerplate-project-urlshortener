require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require("body-parser");
var dns = require('dns');
var sha1 = require('sha1');
// Basic Configuration
const port = process.env.PORT || 3000;
//enable cors
app.use(cors());
//body parser
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
//configure req timeout
const TIMEOUT = 1000000;
//media scanning on poublic folder
app.use('/public', express.static(`${process.cwd()}/public`));
//connect to database - mongodb
const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//define database Schema/migration
  const recordSchema = new Schema({
  originalUrl:String,
  shortUrl:String,
  hash:String
  });
//database model
let Record= mongoose.model("Record", recordSchema);
//ORM repositories
const createNewRecord = async (originalUrl, shortUrl, hash)=>{
  try{
  const created=await Record.create({originalUrl, shortUrl, hash})
  return created;
  }catch(e){
    return e
  }
}
const findOneRecordByHash = async (hash)=>{
  const record= await Record.findOne({hash:hash});
  return record;
}
//ORM repositories

//endpoints
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

//shorten long url
app.post("/api/shorturl/new", async(req, res)=>{
  try{
  let url = req.query.url;
  url =(url)?url:req.body.url;
  console.log(url);
  //validate url
        if (url.includes('http://')|| url.includes('https://'))
        {
  const hostname= new URL(url).hostname;
  //console.log(hostname)
  dns.lookup(hostname, async(err, addresses, family)=>{
    
      if(!err){
    //hash the url
    console.log(addresses)
    const hash = sha1(url);
    console.log(hash);
    const shorturl= `${process.env.BASE_URL}/api/shorturl/${hash}`;
    //save record
    const record=await createNewRecord(url, shorturl, hash);
    res.json({original_url:url, short_url:hash});
    }else{
      console.log(addresses)
    res.json({ error: 'Invalid URL' })
   }
  });

  }else{
    console.log(".....")
      res.json({ error: 'Invalid URL' })
    }

  }catch(e){
    res.json({error:"Some error ocurred. Please try again later."})
  }
})


//redirector endpoint
app.get("/api/shorturl/:hash", async(req, res)=>{
  try{
  let hash = req.params.hash;
  //console.log(hash);
  //find record in the database
  const record= await findOneRecordByHash(hash);
  //console.log(record);
  if(record){
   // console.log(record);
    res.redirect(record.originalUrl);
  }else{
    res.json({error:"url does not exist in our database"})
  }
  }catch(e){
    res.json({error:"Some error ocurred. Please try again later."})
  }
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

