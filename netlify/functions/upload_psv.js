import { getStore } from "@netlify/blobs"; // Native lightweight caching
import { randomUUID } from "crypto";

export default async (req, context) => {
  const method = req.method;

  // 1. C++ Launcher is uploading binary data
  if (method === "POST") {
    const fileBuffer = await req.arrayBuffer();
    const fileId = randomUUID(); // Generate unique reference code

    const store = getStore("temporary-psv-files");
    // Cache the binary payload into Netlify Blobs
    await store.set(fileId, fileBuffer);

    return new Response(fileId, { status: 200 });
  }

  // 2. The Browser Website is retrieving the binary data
  if (method === "GET") {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

    if (!fileId) return new Response("Missing ID", { status: 400 });

    const store = getStore("temporary-psv-files");
    const fileData = await store.get(fileId, { type: "arrayBuffer" });

    if (!fileData)
      return new Response("File Expired or Not Found", { status: 404 });

    // Stream the binary cleanly back to your frontend physics engine
    return new Response(fileData, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
