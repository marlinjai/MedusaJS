import { InferTypeOf } from "@medusajs/framework/types"
import { model } from "@medusajs/framework/utils"

const Post = model.define("post", {
  id: model.id().primaryKey(),
  title: model.text(),
})

export type Post = InferTypeOf<typeof Post>

export default Post

