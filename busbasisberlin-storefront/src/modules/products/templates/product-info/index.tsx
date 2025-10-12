import { HttpTypes } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

type ProductInfoProps = {
	product: HttpTypes.StoreProduct;
};

const ProductInfo = ({ product }: ProductInfoProps) => {
	return (
		<div id="product-info">
			<div className="flex flex-col gap-y-6">
				{/* Breadcrumb / Collection */}
				{product.collection && (
					<LocalizedClientLink
						href={`/collections/${product.collection.handle}`}
						className="text-sm text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-2"
					>
						<span>←</span>
						<span>{product.collection.title}</span>
					</LocalizedClientLink>
				)}

				{/* Product Title */}
				<h1
					className="text-3xl md:text-4xl font-bold text-white leading-tight"
					data-testid="product-title"
				>
					{product.title}
				</h1>

				{/* Product Description */}
				{product.description && (
					<p
						className="text-neutral-300 leading-relaxed whitespace-pre-line"
						data-testid="product-description"
					>
						{product.description}
					</p>
				)}

				{/* Product Metadata */}
				{(product.material || product.weight || product.length) && (
					<div className="grid grid-cols-2 gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
						{product.material && (
							<div>
								<p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
									Material
								</p>
								<p className="text-white font-medium">{product.material}</p>
							</div>
						)}
						{product.weight && (
							<div>
								<p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
									Gewicht
								</p>
								<p className="text-white font-medium">{product.weight}g</p>
							</div>
						)}
						{product.length && (
							<div>
								<p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
									Länge
								</p>
								<p className="text-white font-medium">{product.length}cm</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ProductInfo;
