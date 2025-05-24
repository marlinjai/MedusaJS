import type { 
    MedusaRequest, 
    MedusaResponse,
  } from "@medusajs/framework/http"
  import { 
    createPostWorkflow,
  } from "../../../workflows/create-post"
  
  export async function POST(
    req: MedusaRequest, 
    res: MedusaResponse
  ) {
    const { result: post } = await createPostWorkflow(req.scope)
      .run({
        input: {
          title: "My Post",
        },
      })
  
    res.json({
      post,
    })
  }