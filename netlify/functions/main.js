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

function splitBuffer(buf, sep) {
  const parts = [];
  let start = 0;
  let index = 0;
  while ((index = buf.indexOf(sep, start)) !== -1) {
    parts.push(buf.slice(start, index));
    start = index + sep.length;
  }
  parts.push(buf.slice(start));
  return parts;
}

function parseMultipart(event) {
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  const match = contentType.match(/boundary=([^;]+)/i);
  if (!match) return null;
  const boundary = match[1];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(rawBody, boundaryBuf);
  const fields = {};
  const files = {};

  for (const part of parts) {
    if (!part || part.length === 0) continue;
    if (part.equals(Buffer.from("--\r\n")) || part.equals(Buffer.from("--"))) continue;
    let cleaned = part;
    if (cleaned.slice(0, 2).toString() === "\r\n") cleaned = cleaned.slice(2);
    if (cleaned.slice(-2).toString() === "\r\n") cleaned = cleaned.slice(0, -2);
    if (cleaned.length === 0) continue;

    const headerEnd = cleaned.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = cleaned.slice(0, headerEnd).toString("utf8");
    let body = cleaned.slice(headerEnd + 4);
    if (body.slice(-2).toString() === "\r\n") body = body.slice(0, -2);

    const nameMatch = headerText.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const fileMatch = headerText.match(/filename="([^"]+)"/i);
    if (fileMatch) {
      files[fieldName] = {
        filename: fileMatch[1],
        data: body,
      };
    } else {
      fields[fieldName] = body.toString("utf8");
    }
  }

  return { fields, files };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  try {
    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
    let body = {};
    let fileBuffer = null;
    if (contentType.startsWith("multipart/form-data")) {
      const parsed = parseMultipart(event);
      if (!parsed) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid multipart data" }) };
      }
      body = parsed.fields;
      fileBuffer = parsed.files?.file?.data || null;
    } else {
      body = JSON.parse(event.body || "{}");
    }
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
      file: fileBuffer ? fileBuffer.toString("base64") : body.file,
      type: body.type,
    };

    const result = await db.collection("posts").insertOne(doc);
    return { statusCode: 200, body: JSON.stringify({ shareId: result.insertedId.toString() }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
