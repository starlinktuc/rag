import { Ai } from "@cloudflare/ai";
import { Hono } from 'hono'
import ui from './ui.html' // Importo UI
import write from './write.html' // Importo el que guarda en D1
import cuitgpt from './cuitgpt.html' // Importo como estatico ejemplo de chat
const app = new Hono() // Levantamos Hono para simplificar las peticiones
app.post('/notes', async (c) => {
  const ai = new Ai(c.env.AI)
  const { text } = await c.req.json();
  if (!text) c.throw(400, "Missing text");
  //Pedido de SQL luego el Vector
  const { results } = await c.env.DATABASE.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *").bind(text).run()
  const record = results.length ? results[0] : null
  if (!record) c.throw(500, "Fallo para crear el registro")
  const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
  const values = data[0]
  if (!values) c.throw(500, "Fallo para generar el Vector Embebido")
  const { id } = record
  const inserted = await c.env.VECTOR_INDEX.upsert([{id: id.toString(),values,}]);
  return c.json({ id, text, inserted });
})
//Routes de la app
app.get('/ui', async (c) => {return c.html(ui);}) //Carga de UI
app.get('/', async (c) => {return c.html(write);}) // Raiz
app.get('/write', async (c) => {return c.html(write);}) // El que Guarda la variable en el almacenamiento D1 de Cloudflare
app.get('/cuitgpt', async (c) => {return c.html(write);}) // El que Guarda la variable en el almacenamiento D1 de Cloudflare
// Comienza el método Principal:
app.get('/', async (c) => { 
  const ai = new Ai(c.env.AI);
  const question = c.req.query('text') || "¿puedes hacer un cuadro / mapa con la información obtenida?"
  const embeddings = await ai.run('@cf/baai/bge-base-en-v1.5', { text: question })
  const vectors = embeddings.data[0]
  const SIMILARITY_CUTOFF = 0.75 // Temperatura
  const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 1 });
  const vecIds = vectorQuery.matches // Vectoriza
    .filter(vec => vec.score > SIMILARITY_CUTOFF)
    .map(vec => vec.vectorId) // Mapea
  let notes = []
  if (vecIds.length) { // Sentencia SQL Vectorial
    const query = `SELECT * FROM notes WHERE id IN (${vecIds.join(", ")})`
    const { results } = await c.env.DATABASE.prepare(query).bind().all() // Ejecuta el Query Asincrónico
    if (results) notes = results.map(vec => vec.text) //Mapea los Resultados
  }
  const contextMessage = notes.length 
    ? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
    : ""
  const systemPrompt = `Cuando respondas una pregunta o respondas, uusa el contexto provisto, si este resulta relevante, como la direccion anterior o nombre completo`
  const { response: answer } = await ai.run( // Ejecuta la Consulta al servidor!
    '@cf/meta/llama-2-7b-chat-int8', //Usamos ese modelo por coste conveniencia y gratuito.
    {messages: [...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }]})
  return c.text(answer);
})
app.onError((err, c) => {return c.text(err)}) // Manejo de Errores devuelve RAW crudo
export default app 
