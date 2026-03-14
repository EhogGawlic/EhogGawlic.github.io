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
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }
    if (!body.password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing password" }) };
    }
    if (!user.hashpass) {
      return { statusCode: 500, body: JSON.stringify({ error: "User record missing hashpass" }) };
    }
    const correct = await bcrypt.compare(body.password, user.hashpass);
    if (!correct) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }
    const token = jwt.sign({ username: user.username }, process.env.SECRET, { expiresIn: "1800s" });
    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `token=${token}; HttpOnly; Secure; Path=/; Max-Age=1800; SameSite=Lax`,
      },
      body: JSON.stringify({ data: user }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
