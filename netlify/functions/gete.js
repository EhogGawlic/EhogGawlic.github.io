const { MongoClient, ObjectId } = require("mongodb");

let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}

exports.handler = async (event) => {
  try {
    const db = await getDb();
    const doc = await db
      .collection("posts").find({})
    if (!doc)
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

    return { statusCode: 200, body: JSON.stringify({ data: doc.content }) };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid id" }) };
  }
};
