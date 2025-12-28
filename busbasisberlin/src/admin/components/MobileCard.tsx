// busbasisberlin/src/admin/components/MobileCard.tsx
// High-density card layout for mobile data representation

import { Checkbox, Text, Button } from "@medusajs/ui"
import { ReactNode } from "react"

type MobileCardField = {
  label: string | ReactNode
  value: ReactNode
  icon?: ReactNode
}

type MobileCardProps = {
  id: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  actions?: ReactNode
  fields: MobileCardField[]
  headerTitle?: string
}

export function MobileCard({
  id,
  checked,
  onCheckedChange,
  actions,
  fields,
  headerTitle,
}: MobileCardProps) {
  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-xl overflow-hidden shadow-sm mb-3">
      {/* Card Header */}
      <div className="flex items-center justify-between p-3 border-b border-ui-border-base bg-ui-bg-subtle/50">
        <div className="flex items-center gap-2">
          {onCheckedChange && (
            <Checkbox
              checked={checked}
              onCheckedChange={onCheckedChange}
              id={`check-${id}`}
            />
          )}
          <Text weight="plus" className="text-sm font-bold text-ui-fg-base">
            {headerTitle || id}
          </Text>
        </div>
        <div className="flex items-center gap-1">
          {actions}
        </div>
      </div>

      {/* Card Body */}
      <div className="divide-y divide-ui-border-base">
        {fields.map((field, index) => (
          <div key={index} className="flex items-center justify-between p-3 min-h-[44px]">
            <div className="flex items-center gap-1.5 text-ui-fg-subtle">
              {field.icon}
              <Text size="small" className="font-medium whitespace-nowrap">
                {field.label}
              </Text>
            </div>
            <div className="text-right pl-4">
              {typeof field.value === "string" ? (
                <Text size="small" weight="plus" className="text-ui-fg-base truncate max-w-[200px]">
                  {field.value}
                </Text>
              ) : (
                field.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

