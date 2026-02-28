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
    const docs = await db
      .collection("posts").find({}).toArray()
    if (!docs)
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

    return { statusCode: 200, body: JSON.stringify({ data: docs }) };
  } catch (e){
    return { statusCode: 400, body: JSON.stringify({ error: e.message }) };
  }
};
