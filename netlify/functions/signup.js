const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const db = await getDb();
    const user = await db.collection("users").findOne({ username: body.username });
    if (user) {
      return { statusCode: 409, body: JSON.stringify({ error: "Username taken" }) };
    }
    if (!body.password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing password" }) };
    }
    const hash = await bcrypt.hash(body.password,12)
    const created = await db.collection("users").insertOne({
      username:body.username,
      hashpass:hash,
      dispn:body.username
    })
    const token = jwt.sign({ username:body.username }, process.env.SECRET, { expiresIn: "1800s" });
    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `token=${token}; HttpOnly; Secure; Path=/; Max-Age=1800; SameSite=Lax`,
      },
      body: JSON.stringify({ data: created }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
