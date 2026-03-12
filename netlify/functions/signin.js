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
export default async(event,context)=>{
  if (event.httpMethod !== 'POST') return new Response({ status: 405, statusText: 'Method Not Allowed' });
    try{
        
        const body = JSON.parse(event.body || "{}");
        const db = await getDb();
        const user = await db.collection("users").findOne({ username: body.username })
        if (!user)
            return new Response({ status: 404, statusText: "Not found" });
        //test pass
        if (!body.password) {
            return new Response({ status: 400, statusText: "Missing password" }) ;
        }
        if (!user.hashpass) {
            return new Response({status: 500, statusText: "User record missing hashpass" }) ;
        }
        const pass = user.hashpass
        const correct = await bcrypt.compare(body.password, pass)
        if (!correct)
            return new Response({ status: 401, statusText: "Invalid credentials" })
        const token = jwt.sign({ username: user.username }, process.env.SECRET, {expiresIn: '1800s'})
        context.cookies.set({
            name: "token",
            value: token,
            httpOnly: true, // Recommended for security
            secure: true,   // Recommended for production
            path: '/',
            maxAge: 1800 // 1 week
        });
        return Response.json({data:user})
    } catch (e) {
        return new Response({ status: 500, statusText: "Server error: "+e });
    }
}
