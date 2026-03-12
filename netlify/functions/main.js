const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken")
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
exports.handler = async (event,context) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || "{}");
    const db = await getDb();
    //check credentials
    const token = context.cookies.get("token")
    if (!token)
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" })}
    const usern = jwt.verify(token, process.env.SECRET)
    if (!usern)
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" })}
    const doc = {
      content: body.content,
      author: usern,
      file: body.file,
      type: body.type
    };

    const result = await db.collection("posts").insertOne(doc);
    return {
      statusCode: 200,
      body: JSON.stringify({ shareId: result.insertedId.toString() }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
