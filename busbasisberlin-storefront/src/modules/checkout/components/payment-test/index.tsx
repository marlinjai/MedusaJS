import { Badge } from "@medusajs/ui"
import { useTranslations } from "next-intl"

const PaymentTest = ({ className }: { className?: string }) => {
  const t = useTranslations("checkout.payment")

  return (
    <Badge color="orange" className={className}>
      {t("testingOnly")}
    </Badge>
  )
}

export default PaymentTest
