const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken")
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
export default async(event)=>{
  if (event.httpMethod !== 'POST') return new Response({status: 405, statusText: 'Method Not Allowed' });
    try{
        
        const body = JSON.parse(event.body || "{}");
        const token = context.cookies.get("token")
        if (!token)
            return Response.json({data:false})
        const usern = jwt.verify(token, process.env.SECRET)
        if (!usern)
            return Response.json({data:false})
            return Response.json({data:true})
    } catch (e) {
        return new Response({ status: 500, statusText:"Server error"});
    }
}