const { MongoClient } = require("mongodb");
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const db = await getDb();
    const doc = {
      content: body.content,
      author: body.author,
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