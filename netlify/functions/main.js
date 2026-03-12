const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken")
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
export default async (event,context) => {
  if (event.httpMethod !== 'POST') return new Response("Invalid input", { 
    status: 405,
    statusText: "Method Not Allowed" // Optional: custom status message
  })
  try {
    const body = JSON.parse(event.body || "{}");
    const db = await getDb();
    //check credentials
    const token = context.cookies.get("token")
    if (!token)
      return new Response({ status: 401, statusText: "Invalid credentials" })
    const usern = jwt.verify(token, process.env.SECRET)
    if (!usern)
      return new Response({ status: 401, statusText: "Invalid credentials" })
    const doc = {
      content: body.content,
      author: usern,
      file: body.file,
      type: body.type
    };

    const result = await db.collection("posts").insertOne(doc);
    return Response.json({ shareId: result.insertedId.toString() })
    
  } catch (e) {
        return new Response({ status: 500, statusText: "Server error: "+e });
  }
};
