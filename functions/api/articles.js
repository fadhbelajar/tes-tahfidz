// CRUD: List & Create Artikel
export async function onRequestGet(c) {
  const db = c.env.db_tahfidzku;
  const { results } = await db.prepare("SELECT id, json FROM articles ORDER BY id DESC").all();
  const articles = results.map(r => JSON.parse(r.json));
  return Response.json(articles);
}

export async function onRequestPost(c) {
  const db = c.env.db_tahfidzku;
  const body = await c.request.json();
  const id = crypto.randomUUID();
  const article = {
    id,
    title: body.title || "",
    content: body.content || "",
    excerpt: body.excerpt || "",
    category: body.category || "umum",
    status: body.status || "draft",
    author: body.author || "admin",
    photo: body.photo || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.prepare("INSERT INTO articles (id, json) VALUES (?, ?)")
    .bind(id, JSON.stringify(article)).run();
  return Response.json(article, { status: 201 });
}
