const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
let client;
async function getDb() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("game");
}
function parseCookies(headerValue) {
  if (!headerValue) return {};
  return headerValue.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const db = await getDb();
    const cookies = parseCookies(event.headers?.cookie);
    const token = cookies.token;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }
    const usern = jwt.verify(token, process.env.SECRET);
    if (!usern) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }
    const doc = {
      content: body.content,
      author: usern.username || usern,
      file: body.file,
      type: body.type,
    };

    const result = await db.collection("posts").insertOne(doc);
    return { statusCode: 200, body: JSON.stringify({ shareId: result.insertedId.toString() }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
