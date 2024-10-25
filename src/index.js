import { Hono } from 'hono'// Levantamos Hono para simplificar las peticiones
import { cors } from 'hono/cors'
import { methodOverride } from 'hono/method-override'// Importo UI
// Importo el que guarda en D1
// Importo como estatico ejemplo de chat
import notes from './notes.html'
import ui from './ui.html'
import write from './write.html'
import cuitgpt from './cuitgpt.html'

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
    .run() //Pedido de SQL luego el Vector
  const record = results.length ? results[0] : null
  if (!record) c.throw(500, "Fallo para crear el registro de CUIT")
  const { data } = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
  const values = data[0]
  if (!values) c.throw(500, "Fallo para generar el Vector Embebido")
  const { id } = record
  const inserted = await c.env.VECTOR_INDEX.upsert([{id: id,values,}]);
  return c.json({ id, text, inserted });
})//Routes de la app
app.get('/ui', async (c) => {
	return c.html(ui);
})
app.get('/write', async (c) => {
	return c.html(write);
})
app.get('/cuitgpt', async (c) => {
	return c.html(cuitgpt);
})
app.get('/', async (c) => {// Comienza el método Principal:
  if (!c.req.query('text')) return c.html(ui);
  const question = c.req.query('text') || "Invita a ingresar el CUIT de 11 numeros en la web: https://cuit.nicar.workers.dev"
  const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: question })
  const vectors = embeddings.data[0]
  const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 1 });
  const vecId = vectorQuery.matches[0]?.vectorId
  let notes = []
  if (vecId) {const query = `SELECT * FROM notes WHERE id = ?` //Pedido de SQL luego el Vector
    const { results } = await c.env.DATABASE.prepare(query).bind(vecId).all()
    if (results) notes = results.map(vec => vec.text)}
  const contextMessage = notes.length? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`: ""
  const systemPrompt = `usa toda la informacion de la AFIP para comprobar ese CUIT.`
  const { response: answer } = await c.env.AI.run(
    '@cf/meta/llama-2-7b-chat-int8',{
      messages: [...(notes.length ? [{ role: 'system', content: contextMessage }] : []),{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]}
  )
  //Extra desde otro JS
  const baseUrl = "https://www.tangofactura.com/Rest/GetContribuyenteWithImpuestosAndvencimientos?cuit=";
    // Extrae el CUIT de la consulta del request, si se proporciona como parámetro
   // const url = new URL(request.url);
    const cuit = question; // Usa un CUIT por defecto si no se proporciona
     // Construye la URL completa para la búsqueda
     const searchUrl = `${baseUrl}${cuit}`;
     try {
      // Realiza la solicitud de búsqueda al sitio
      const response = await fetch(searchUrl);
       // Obtiene el contenido HTML de la respuesta
      const html = await response.text();
      // Extrae los datos deseados del HTML
      const data = extractDataFromHtml(html);
      // Devuelve los datos extraídos como respuesta
      return c.text(answer) + html
    } catch (error) {
     // Maneja cualquier error que ocurra durante la solicitud
     //return new Response(`Error: ${error.message}`, { status: 500 });
   }
  return c.text(answer);
})
app.onError((err, c) => {
  return c.text(err)
})

export default app