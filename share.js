async function getPosts(){
  const res = await fetch("/.netlify/functions/gete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok){
    throw new Error(res.statusText)
  }
  const { shareId } = await res.json();
  const link = `${location.origin}/?share=${shareId}`;
}