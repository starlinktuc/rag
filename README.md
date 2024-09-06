### CuitGPT RAG 
## retrieval-augmented-generation over Cloudflare

[CuitGPT](https://cuitgpt.nicar.workers.dev)

## Este consultador y checkeador de nombres Argentinos mediante el ingreso de CUIT/CUIL y DNI
Dando la posibilidad de conectar el endpoint a cualquier webhook que se tenga para la interaccion entre ellos y la Retroalimentación.
<span>![</span><span>LogoCuitGPT</span><span>]</span><span>(</span><span>[[CuitGPT_Logo_FINAL.png]] CuitGPT_Logo_FINAL.png</span><span>)</span>
Bajar Wrangler CLI: 
para luego en consola ejecutar:
CODE:

''' wrangler dev
```
'''
CuitGPT leverages several key components of Cloudflare's platform to power his application. CuitGPT RAG (Retrieval-Augmented Generation) app utilizes the @cf/baai/bge-base-en-v1.5 embeddings model and showcases Cloudflare’s capabilities in enhancing AI-driven services.
With Cloudflare Workers AI, CuitGPT handles the retrieval of information from APIs for CuitGPT, including fetching data and embedding it into his application. The application possesses data based on two main types of information— Person by DNI or Juridic Person by CUIT. Cloudflare facilitates this by pulling data from APIs and outputting it into JSON format, allowing real-time JSON responses that deliver relevant information based on user queries—critical for CuitGPT’s functionality.



