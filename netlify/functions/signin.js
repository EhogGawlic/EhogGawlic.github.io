const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cp = require("cookie-parser")
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
exports.handler = async(event)=>{
    try{
        
        const body = JSON.parse(event.body || "{}");
        const db = await getDb();
        const users = await db.collection("users").find({}).toArray()
        if (!users)
            return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
        
        return { statusCode: 200, body: JSON.stringify({ data: users }) };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
    }
}