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

// Price adjustment calculation with rounding
function adjustPrice(
	originalPrice: number,
	percentage: number,
	rounding: '1' | '5' | '10',
	direction: 'up' | 'down',
): number {
	// Apply percentage change
	const adjusted = originalPrice * (1 + percentage / 100);
	const inEuros = adjusted / 100;

	let rounded: number;
	const step = parseInt(rounding);

	if (direction === 'up') {
		rounded = Math.ceil(inEuros / step) * step;
	} else {
		rounded = Math.floor(inEuros / step) * step;
	}

	return Math.round(rounded * 100); // Back to cents
}

export default function PriceAdjustmentModal({
	isOpen,
	onClose,
	selectedServices,
	onApply,
}: PriceAdjustmentModalProps) {
	const [percentage, setPercentage] = useState<string>('0');
	const [rounding, setRounding] = useState<'1' | '5' | '10'>('1');
	const [direction, setDirection] = useState<'up' | 'down'>('up');

	if (!isOpen) return null;

	// Calculate preview
	const servicesWithPrices = selectedServices.filter(s => s.base_price !== null);
	const previews = servicesWithPrices.map(service => {
		const oldPrice = service.base_price!;
		const newPrice = adjustPrice(
			oldPrice,
			parseFloat(percentage) || 0,
			rounding,
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
							{servicesWithPrices.length} Service(s) mit Preisen ausgewählt
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

						{/* Rounding */}
						<div>
							<Text size="small" weight="plus" className="mb-2">
								Rundung
							</Text>
							<Select value={rounding} onValueChange={(v) => setRounding(v as '1' | '5' | '10')}>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="1">Auf volle Euro</Select.Item>
									<Select.Item value="5">Auf 5 Euro Schritte</Select.Item>
									<Select.Item value="10">Auf 10 Euro Schritte</Select.Item>
								</Select.Content>
							</Select>
						</div>

						{/* Direction */}
						<div>
							<Text size="small" weight="plus" className="mb-2">
								Richtung
							</Text>
							<Select value={direction} onValueChange={(v) => setDirection(v as 'up' | 'down')}>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="up">Aufrunden</Select.Item>
									<Select.Item value="down">Abrunden</Select.Item>
								</Select.Content>
							</Select>
						</div>
					</div>
				</div>

				{/* Preview */}
				<div className="flex-1 overflow-auto p-6">
					<Text size="small" weight="plus" className="mb-3">
						Vorschau der Änderungen
					</Text>
					<div className="border border-ui-border-base rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-ui-bg-subtle border-b border-ui-border-base">
								<tr>
									<th className="text-left p-3">
										<Text size="xsmall" weight="plus">Service</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">Alter Preis</Text>
									</th>
									<th className="text-center p-3">
										<Text size="xsmall" weight="plus">→</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">Neuer Preis</Text>
									</th>
									<th className="text-right p-3">
										<Text size="xsmall" weight="plus">Differenz</Text>
									</th>
								</tr>
							</thead>
							<tbody>
								{previews.slice(0, 10).map(preview => {
									const diff = preview.newPrice - preview.oldPrice;
									const diffPercent = (diff / preview.oldPrice) * 100;
									return (
										<tr key={preview.id} className="border-b border-ui-border-base">
											<td className="p-3">
												<Text size="small" className="line-clamp-1">
													{preview.title}
												</Text>
											</td>
											<td className="p-3 text-right">
												<Text size="small" className="text-ui-fg-subtle">
													{(preview.oldPrice / 100).toFixed(2)} {preview.currency}
												</Text>
											</td>
											<td className="p-3 text-center">
												<Text size="small">→</Text>
											</td>
											<td className="p-3 text-right">
												<Text size="small" weight="plus">
													{(preview.newPrice / 100).toFixed(2)} {preview.currency}
												</Text>
											</td>
											<td className="p-3 text-right">
												<Text
													size="small"
													className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}
												>
													{diff > 0 ? '+' : ''}
													{(diff / 100).toFixed(2)} € ({diffPercent > 0 ? '+' : ''}
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

