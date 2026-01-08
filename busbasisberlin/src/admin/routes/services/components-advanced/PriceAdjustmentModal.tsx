/**
 * PriceAdjustmentModal.tsx
 * Modal for bulk price adjustments with percentage change and rounding options
 */
import { Button, Input, Select, Text } from '@medusajs/ui';
import { X } from 'lucide-react';
import { useState } from 'react';

type Service = {
	id: string;
	title: string;
	base_price: number | null;
	currency_code: string;
};

type PriceAdjustmentModalProps = {
	isOpen: boolean;
	onClose: () => void;
	selectedServices: Service[];
	onApply: (adjustedServices: Array<{ id: string; newPrice: number }>) => void;
};

// Pricing strategy types
type PricingStrategyType =
	| 'traditional_1'
	| 'traditional_5'
	| 'traditional_10'
	| 'psychological_99'
	| 'psychological_95'
	| 'psychological_90'
	| 'fixed_ending_50'
	| 'fixed_ending_95'
	| 'price_band_10'
	| 'price_band_50'
	| 'price_band_100'
	| 'custom';

// Apply pricing strategy to a price
function applyPricingStrategy(
	originalPrice: number,
	percentage: number,
	strategy: PricingStrategyType,
	customDenominator: number,
	direction: 'up' | 'down',
): number {
	// Apply percentage change first
	const adjusted = originalPrice * (1 + percentage / 100);
	const inEuros = adjusted / 100;

	let rounded: number;

	switch (strategy) {
		// Traditional rounding (existing behavior)
		case 'traditional_1':
		case 'traditional_5':
		case 'traditional_10': {
			const step = parseInt(strategy.split('_')[1]);
			if (direction === 'up') {
				rounded = Math.ceil(inEuros / step) * step;
			} else {
				rounded = Math.floor(inEuros / step) * step;
			}
			break;
		}

		// Psychological pricing (x.99, x.95, x.90)
		case 'psychological_99':
		case 'psychological_95':
		case 'psychological_90': {
			const cents = parseInt(strategy.split('_')[1]);
			const euros = Math.floor(inEuros);
			if (direction === 'up') {
				// Round up to next x.99/x.95/x.90
				rounded = euros + cents / 100;
				if (rounded < inEuros) {
					rounded = euros + 1 + cents / 100;
				}
			} else {
				// Round down to previous x.99/x.95/x.90
				rounded = euros + cents / 100;
				if (rounded > inEuros) {
					rounded = euros - 1 + cents / 100;
				}
			}
			break;
		}

		// Fixed endings (always end with .50 or .95)
		case 'fixed_ending_50':
		case 'fixed_ending_95': {
			const cents = parseInt(strategy.split('_')[2]);
			const euros = Math.floor(inEuros);
			const target = euros + cents / 100;

			if (direction === 'up') {
				// If current price is below target, use target, otherwise next target
				rounded = inEuros <= target ? target : euros + 1 + cents / 100;
			} else {
				// If current price is above target, use target, otherwise previous target
				rounded = inEuros >= target ? target : euros - 1 + cents / 100;
			}
			break;
		}

		// Price bands (smart psychological pricing based on price range)
		case 'price_band_10': {
			// Under 10€ → x.99
			if (inEuros < 10) {
				rounded = 9.99;
			} else {
				const step =
					direction === 'up' ? Math.ceil(inEuros) : Math.floor(inEuros);
				rounded = step + 0.99;
			}
			break;
		}

		case 'price_band_50': {
			// Under 50€ → x9.99
			if (inEuros < 50) {
				const tens = Math.floor(inEuros / 10);
				rounded = tens * 10 + 9.99;
				if (rounded < inEuros && direction === 'up') {
					rounded += 10;
				}
			} else {
				const step =
					direction === 'up' ? Math.ceil(inEuros) : Math.floor(inEuros);
				rounded = step + 0.99;
			}
			break;
		}

		case 'price_band_100': {
			// Under 100€ → x9.99
			if (inEuros < 100) {
				const tens = Math.floor(inEuros / 10);
				rounded = tens * 10 + 9.99;
				if (rounded < inEuros && direction === 'up') {
					rounded += 10;
				}
			} else {
				const step =
					direction === 'up' ? Math.ceil(inEuros) : Math.floor(inEuros);
				rounded = step + 0.99;
			}
			break;
		}

		// Custom denominator (original custom behavior)
		case 'custom': {
			const step = customDenominator > 0 ? customDenominator : 1;
			if (direction === 'up') {
				rounded = Math.ceil(inEuros / step) * step;
			} else {
				rounded = Math.floor(inEuros / step) * step;
			}
			break;
		}

		default:
			rounded = inEuros;
	}

	// Ensure we don't get negative prices
	if (rounded < 0) rounded = 0;

	return Math.round(rounded * 100); // Back to cents
}

// Get human-readable strategy description with examples
function getStrategyDescription(strategy: PricingStrategyType): string {
	const descriptions: Record<PricingStrategyType, string> = {
		traditional_1: 'Volle Euro (z.B. 12,37€ → 12€)',
		traditional_5: '5 Euro Schritte (z.B. 12,37€ → 15€)',
		traditional_10: '10 Euro Schritte (z.B. 12,37€ → 20€)',
		psychological_99: 'Psychologisch x,99 (z.B. 12,37€ → 12,99€)',
		psychological_95: 'Psychologisch x,95 (z.B. 12,37€ → 12,95€)',
		psychological_90: 'Psychologisch x,90 (z.B. 12,37€ → 12,90€)',
		fixed_ending_50: 'Feste Endung x,50 (z.B. 12,37€ → 12,50€)',
		fixed_ending_95: 'Feste Endung x,95 (z.B. 12,37€ → 12,95€)',
		price_band_10: 'Preisband unter 10€ (z.B. 8,37€ → 9,99€)',
		price_band_50: 'Preisband unter 50€ (z.B. 32,37€ → 39,99€)',
		price_band_100: 'Preisband unter 100€ (z.B. 82,37€ → 89,99€)',
		custom: 'Benutzerdefinierte Schrittgröße',
	};
	return descriptions[strategy];
}

export default function PriceAdjustmentModal({
	isOpen,
	onClose,
	selectedServices,
	onApply,
}: PriceAdjustmentModalProps) {
	const [percentage, setPercentage] = useState<string>('0');
	const [strategy, setStrategy] =
		useState<PricingStrategyType>('traditional_1');
	const [customDenominator, setCustomDenominator] = useState<string>('1');
	const [direction, setDirection] = useState<'up' | 'down'>('up');

	if (!isOpen) return null;

	// Calculate preview
	const servicesWithPrices = selectedServices.filter(
		s => s.base_price !== null,
	);
	const previews = servicesWithPrices.map(service => {
		const oldPrice = service.base_price!;
		const newPrice = applyPricingStrategy(
			oldPrice,
			parseFloat(percentage) || 0,
			strategy,
			parseFloat(customDenominator) || 1,
			direction,
		);
		return {
			id: service.id,
			title: service.title,
			oldPrice,
			newPrice,
			currency: service.currency_code,
		};
	});

	const handleApply = () => {
		const adjustments = previews.map(p => ({
			id: p.id,
			newPrice: p.newPrice,
		}));
		onApply(adjustments);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-ui-bg-base rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-ui-border-base">
					<div>
						<Text size="large" weight="plus">
							Preise anpassen
						</Text>
						<Text size="small" className="text-ui-fg-subtle mt-1">
							{servicesWithPrices.length} Service(s) mit Preisen ausgewählt -
							Prozent anpassen und Strategie wählen
						</Text>
					</div>
					<Button variant="transparent" onClick={onClose}>
						<X className="w-5 h-5" />
					</Button>
				</div>

				{/* Settings */}
				<div className="p-6 border-b border-ui-border-base">
					<div className="grid grid-cols-3 gap-4">
						{/* Percentage */}
						<div>
							<Text size="small" weight="plus" className="mb-2">
								Prozentuale Änderung
							</Text>
							<Input
								type="number"
								value={percentage}
								onChange={e => setPercentage(e.target.value)}
								placeholder="z.B. 15 oder -10"
								step="0.1"
							/>
							<Text size="xsmall" className="text-ui-fg-subtle mt-1">
								Positiv = Erhöhung, Negativ = Reduzierung
							</Text>
						</div>

						{/* Pricing Strategy */}
						<div>
							<Text size="small" weight="plus" className="mb-2">
								Preisstrategie
							</Text>
							<Select
								value={strategy}
								onValueChange={v => setStrategy(v as PricingStrategyType)}
							>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content className="z-[60]">
									{/* Traditional Rounding */}
									<Select.Item value="traditional_1">
										Auf volle Euro
									</Select.Item>
									<Select.Item value="traditional_5">
										Auf 5 Euro Schritte
									</Select.Item>
									<Select.Item value="traditional_10">
										Auf 10 Euro Schritte
									</Select.Item>

									<Select.Separator />

									{/* Psychological Pricing */}
									<Select.Item value="psychological_99">
										Psychologisch (x,99)
									</Select.Item>
									<Select.Item value="psychological_95">
										Psychologisch (x,95)
									</Select.Item>
									<Select.Item value="psychological_90">
										Psychologisch (x,90)
									</Select.Item>

									<Select.Separator />

									{/* Fixed Endings */}
									<Select.Item value="fixed_ending_50">
										Feste Endung (x,50)
									</Select.Item>
									<Select.Item value="fixed_ending_95">
										Feste Endung (x,95)
									</Select.Item>

									<Select.Separator />

									{/* Price Bands */}
									<Select.Item value="price_band_10">
										Preisband (unter 10€ → 9,99)
									</Select.Item>
									<Select.Item value="price_band_50">
										Preisband (unter 50€ → x9,99)
									</Select.Item>
									<Select.Item value="price_band_100">
										Preisband (unter 100€ → x9,99)
									</Select.Item>

									<Select.Separator />

									{/* Custom */}
									<Select.Item value="custom">Benutzerdefiniert</Select.Item>
								</Select.Content>
							</Select>
							{strategy === 'custom' && (
								<div className="mt-2">
									<Input
										type="number"
										value={customDenominator}
										onChange={e => setCustomDenominator(e.target.value)}
										placeholder="z.B. 0.05, 0.10, 0.25"
										step="0.01"
										min="0.01"
									/>
									<Text size="xsmall" className="text-ui-fg-subtle mt-1">
										Schrittgröße für Rundung
									</Text>
								</div>
							)}
						</div>

						{/* Direction */}
						<div>
							<Text size="small" weight="plus" className="mb-2">
								Richtung
							</Text>
							<Select
								value={direction}
								onValueChange={v => setDirection(v as 'up' | 'down')}
							>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content className="z-[60]">
									<Select.Item value="up">Aufrunden</Select.Item>
									<Select.Item value="down">Abrunden</Select.Item>
								</Select.Content>
							</Select>
						</div>
					</div>
				</div>

				{/* Preview */}
				<div className="flex-1 overflow-auto p-6">
					<div className="flex items-center justify-between mb-3">
						<Text size="small" weight="plus">
							Vorschau der Änderungen
						</Text>
						<Text size="xsmall" className="text-ui-fg-subtle">
							{getStrategyDescription(strategy)}
						</Text>
					</div>
					<div className="border border-ui-border-base rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-ui-bg-subtle border-b border-ui-border-base">
								<tr>
									<th className="text-left p-3">
										<Text size="xsmall" weight="plus">
											Service
										</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">
											Alter Preis
										</Text>
									</th>
									<th className="text-center p-3">
										<Text size="xsmall" weight="plus">
											→
										</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">
											Neuer Preis
										</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">
											Differenz
										</Text>
									</th>
								</tr>
							</thead>
							<tbody>
								{previews.slice(0, 10).map(preview => {
									const diff = preview.newPrice - preview.oldPrice;
									const diffPercent = (diff / preview.oldPrice) * 100;
									return (
										<tr
											key={preview.id}
											className="border-b border-ui-border-base"
										>
											<td className="p-3">
												<Text size="small" className="line-clamp-1">
													{preview.title}
												</Text>
											</td>
											<td className="p-3 text-right">
												<Text size="small" className="text-ui-fg-subtle">
													{(preview.oldPrice / 100).toFixed(2)}{' '}
													{preview.currency}
												</Text>
											</td>
											<td className="p-3 text-center">
												<Text size="small">→</Text>
											</td>
											<td className="p-3 text-right">
												<Text size="small" weight="plus">
													{(preview.newPrice / 100).toFixed(2)}{' '}
													{preview.currency}
												</Text>
											</td>
											<td className="p-3 text-right">
												<Text
													size="small"
													className={
														diff > 0
															? 'text-green-600'
															: diff < 0
																? 'text-red-600'
																: ''
													}
												>
													{diff > 0 ? '+' : ''}
													{(diff / 100).toFixed(2)} € (
													{diffPercent > 0 ? '+' : ''}
													{diffPercent.toFixed(1)}%)
												</Text>
											</td>
										</tr>
									);
								})}
								{previews.length > 10 && (
									<tr>
										<td colSpan={5} className="p-3 text-center">
											<Text size="small" className="text-ui-fg-muted">
												... und {previews.length - 10} weitere
											</Text>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-ui-border-base">
					<Button variant="secondary" onClick={onClose}>
						Abbrechen
					</Button>
					<Button variant="primary" onClick={handleApply}>
						Änderungen anwenden
					</Button>
				</div>
			</div>
		</div>
	);
}
