async function getPosts() {
  const res = await fetch("/.netlify/functions/gete", { method: "GET" });
  if (!res.ok) throw new Error(res.statusText);
  return await res.json(); // { data: [...] }
}

function postsToHtml(posts){
  //{"data":[{"_id":"69a2767e9333dbcf707380a3","author":"ehogin","content":"hi","file":"","type":"post"}]}
  const postsd = posts.data
  let out = ``
  Array.from(postsd).forEach(data=>{
    
    const author = data.author;
    const content = data.content;
    const file = data.file;
    const type = data.type;
    out += `
      <div class="post">
        <h3>By ${author}</h3>
        <p>${content}</p><br>
      </div>
    `
  })
  return out
}