import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { methodOverride } from 'hono/method-override'

import notes from './notes.html'
import ui from './ui.html'
import write from './write.html'
import cuitgpt from './cuitgpt.html'
import shop from './shop.html'

const app = new Hono()
app.use(cors())

app.get('/notes.json', async (c) => {
  const query = `SELECT * FROM notes`
  const { results } = await c.env.DATABASE.prepare(query).all()
  return c.json(results);
})

app.get('/notes', async (c) => {
	return c.html(notes);
})

app.use('/notes/:id', methodOverride({ app }))
app.delete('/notes/:id', async (c) => {
  const { id } = c.req.param();
  const query = `DELETE FROM notes WHERE id = ?`
  await c.env.DATABASE.prepare(query).bind(id).run()
	await c.env.VECTOR_INDEX.deleteByIds([id])
	return c.redirect('/notes')
})

app.post('/notes', async (c) => {
  const { text } = await c.req.json();
  if (!text) c.throw(400, "Missing text");

  const { results } = await c.env.DATABASE.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *")
    .bind(text)
    .run()

  const record = results.length ? results[0] : null

  if (!record) c.throw(500, "Failed to create note")

  const { data } = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
  const values = data[0]

  if (!values) c.throw(500, "Failed to generate vector embedding")

  const { id } = record
  const inserted = await c.env.VECTOR_INDEX.upsert([
    {
      id: id.toString(),
      values,
    }
  ]);

  return c.json({ id, text, inserted });
})

app.get('/ui', async (c) => {
	return c.html(ui);
})

app.get('/write', async (c) => {
	return c.html(write);
})
app.get('/shop', async (c) => {
	return c.html(shop);
})
app.get('/cuitgpt', async (c) => {
	return c.html(cuitgpt);
})

app.get('/', async (c) => {
  if (!c.req.query('text')) return c.html(ui);
  const question = c.req.query('text') || "Invita a ingresar el CUIT de 11 numeros en la web: https://cuit.nicar.workers.dev"

  const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: question })
  const vectors = embeddings.data[0]

  const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 1 });
  const vecId = vectorQuery.matches[0]?.vectorId

  let notes = []
  if (vecId) {
    const query = `SELECT * FROM notes WHERE id = ?`
    const { results } = await c.env.DATABASE.prepare(query).bind(vecId).all()
    if (results) notes = results.map(vec => vec.text)
  }

  const contextMessage = notes.length
    ? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
    : ""

  const systemPrompt = `Cuando respondas busca en internet la informacion disponible de ese numero de CUIT con varios metodos de busqueda.`

  const { response: answer } = await c.env.AI.run(
    '@cf/meta/llama-2-7b-chat-int8',
    {
      messages: [
        ...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ]
    }
  )

  return c.text(answer);
})

app.onError((err, c) => {
  return c.text(err)
})

export default app
// Importo UI
// Importo el que guarda en D1
// Importo como estatico ejemplo de chat
// Levantamos Hono para simplificar las peticiones
//Pedido de SQL luego el Vector
// "Fallo para crear el registro")
//"Fallo para generar el Vector Embebido
//Routes de la app
// Comienza el método Principal:
 
