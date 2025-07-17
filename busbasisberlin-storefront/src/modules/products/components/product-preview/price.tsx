import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center gap-x-2">
        {price.price_type === "sale" && (
          <Text
            className="line-through text-ui-fg-muted"
            data-testid="original-price"
          >
            {price.original_price}
          </Text>
        )}
        <Text
          className={clx("text-ui-fg-muted", {
            "text-ui-fg-interactive": price.price_type === "sale",
          })}
          data-testid="price"
        >
          {price.calculated_price}
        </Text>
      </div>
      {/* USt. 19% info text for product previews */}
      <div className="flex items-center gap-x-1">
        <span className="text-xs text-ui-fg-subtle">inkl. USt. 19%</span>
      </div>
    </div>
  )
}
