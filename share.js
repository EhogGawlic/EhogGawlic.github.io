async function getPosts() {
  const res = await fetch("/.netlify/functions/gete", { method: "GET" });
  if (!res.ok) throw new Error(res.statusText);
  return await res.json(); // { data: [...] }
}
async function signin(username, password){
  const res = await fetch("/.netlify/functions/signin", {
    method: "POST",
    body:JSON.stringify({username,password}),
    credentials:"include",
    mode: "cors"
  });
  if (!res.ok) logOut(res.statusText)
  return await res.json();
}
/**
 * 
 * @param {String} content 
 * @param {ArrayBuffer} file 
 */
async function post(content,file){
  const hasFile = !!file
  const type = hasFile ? "postf" : "post"
  const form = new FormData()
  form.append("content", content)
  form.append("type", type)
  if (hasFile){
    const blob = new Blob([file], { type: "application/octet-stream" })
    form.append("file", blob, "save.psv")
  }
  const res = await fetch("/.netlify/functions/main", {
    method: "POST",
    body: form,
    credentials:"include",
    mode:'cors'
  })
  if (!res.ok) logOut(res.statusText)
  return await res.json()
}
async function testsignin(){
  const res = await fetch("/.netlify/functions/testsi", {
    method: "POST",
    credentials:"include",
    mode:'cors'
  })
  return await res.json()

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
