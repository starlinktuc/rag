### CuitGPT RAG 
## Retrieval-Augmented-Generation over Cloudflare
[CuitGPT](https://cuitgpt.nicar.workers.dev)
![CuitGPT Logo](https://github.com/starlinktuc/rag/blob/main/CuitGPT_Logo.png)

## Este consultador y checkeador de nombres Argentinos mediante el ingreso de CUIT/CUIL y DNI
Dando la posibilidad de conectar el endpoint a cualquier webhook que se tenga para la interaccion entre ellos y la Retroalimentación.

![CuitGPT Diagrama](https://github.com/starlinktuc/rag/blob/main/CuitGPT.png)

<br>
Bajar Wrangler CLI: 


CuitGPT leverages several key components of Cloudflare's platform to power his application. CuitGPT RAG (Retrieval-Augmented Generation) app utilizes the @cf/baai/bge-base-en-v1.5 embeddings model and showcases Cloudflare’s capabilities in enhancing AI-driven services.
With Cloudflare Workers AI, CuitGPT handles the retrieval of information from APIs for CuitGPT, including fetching data and embedding it into his application. The application possesses data based on two main types of information— Person by DNI or Juridic Person by CUIT. Cloudflare facilitates this by pulling data from APIs and outputting it into JSON format, allowing real-time JSON responses that deliver relevant information based on user queries—critical for CuitGPT’s functionality.

para luego en consola ejecutar:

```
wrangler dev

## Ejemplo de búsqueda del Endpoint para usar como webhook con cualquier otro servicio:
###https://1.nicar.workers.dev/?dni=31765650
{"PERSONA":"title=\"Ver detalles de AVILA ROMAN JAVIER\"","DNI":"="}
31765650
```


---
title: "Generación aumentada de recuperación (RAG)"
pcx_content_type: reference-architecture-diagram
tags:
- AI
products:
- Workers AI
- Workers
- Queues
- Vectorize
- D1
sidebar:
order: 1
label: Generación aumentada de recuperación (RAG)
updated: 2024-03-18
---

## Introducción

La generación aumentada de recuperación (RAG) es un enfoque innovador en el procesamiento del lenguaje natural que integra mecanismos de recuperación con modelos generativos para mejorar la generación de texto.

Al incorporar conocimiento externo de fuentes preexistentes, la RAG aborda el desafío de generar texto contextualmente relevante e informativo. Esta integración permite a la RAG superar las limitaciones de los modelos generativos tradicionales al garantizar que el texto generado se base en información fáctica y contexto. La RAG tiene como objetivo resolver el problema de la sobrecarga de información recuperando e incorporando de manera eficiente solo la información más relevante en el texto generado, lo que conduce a una mayor coherencia y precisión. En general, la RAG representa un avance significativo en el procesamiento del lenguaje natural, ya que ofrece un enfoque más sólido y contextualizado para la generación de texto.

Entre los ejemplos de aplicación de estas técnicas se incluyen, por ejemplo, los chatbots de atención al cliente que utilizan una base de conocimientos para responder a las solicitudes de asistencia.

En el contexto de la generación aumentada por recuperación (RAG), la siembra de conocimientos implica la incorporación de información externa de fuentes preexistentes en el proceso generativo, mientras que la consulta se refiere al mecanismo de recuperación de conocimientos relevantes de estas fuentes para informar la generación de texto coherente y contextualizado. Ambos se muestran a continuación.

## Difusión de conocimiento en Semillas

![Figura 1: Difusión de conocimiento](https://developers.cloudflare.com/_astro/rag-architecture-seeding.IGy0Ht3t_10QUdB.svg)

1. **Carga de cliente**: envía una solicitud POST con documentos al punto final de la API.
2. **Procesamiento de entrada**: procesa la solicitud entrante utilizando [Trabajadores](/trabajadores/) y envía mensajes a [Colas](/queues/) para agregar un registro de procesamiento.
3. **Procesamiento por lotes**: utiliza [Colas](/queues/) para activar un [consumidor](/queues/reference/how-queues-works/#consumers) que procesa los documentos de entrada en lotes para evitar la sobrecarga posterior.
4. **Generación de incrustaciones**: genere vectores de incrustación llamando a [Workers AI](/workers-ai/) [modelos de incrustación de texto](/workers-ai/models/#text-embeddings) para los documentos.
5. **Almacenamiento de vectores**: inserte los vectores de incrustación en [Vectorize](/vectorize/).
6. **Almacenamiento de documentos**: inserte documentos en [D1](/d1/) para almacenamiento persistente.
7. **Mecanismo de confirmación/reintención**: indique el éxito/error mediante la [API de tiempo de ejecución de colas](/queues/configuration/javascript-apis/#message) en el consumidor para cada documento. [Queues](/queues/) programará reintentos, si es necesario.

## Consultas de conocimiento

![Figura 2: Consultas de conocimiento](https://developers.cloudflare.com/_astro/rag-architecture-query.Bs-0_T0y_Z157MNu.svg)

1. **Consulta de cliente**: envía una solicitud GET con la consulta al punto final de la API.
2. **Generación de incrustaciones**: genera vectores de incrustación llamando a [Workers AI](/workers-ai/) [modelos de incrustación de texto](/workers-ai/models/#text-embeddings) para la consulta entrante.
3. **Búsqueda de vectores**: consulta [Vectorize](/vectorize/) usando la representación vectorial de la consulta para recuperar vectores relacionados.
4. **Búsqueda de documentos**: recupera documentos relacionados de [D1](/d1/) en función de los resultados de búsqueda de [Vectorize](/vectorize/).
5. **Generación de texto**: Pase la consulta original y los documentos recuperados como contexto a [Workers AI](/workers-ai/) [modelos de generación de texto](/workers-ai/models/#text-generation) para generar una respuesta.

## Recursos relacionados

- [Tutorial: Construir una IA RAG](/workers-ai/tutorials/build-a-retrieval-augmented-generation-ai/)
- [Workers AI: Modelos de incrustación de texto](/workers-ai/models/#text-embeddings)
- [Workers AI: Modelos de generación de texto](/workers-ai/models/#text-generation)
