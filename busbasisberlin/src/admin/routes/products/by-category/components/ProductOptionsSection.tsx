// busbasisberlin/src/admin/routes/products/by-category/components/ProductOptionsSection.tsx
// Component for managing product options (e.g., Color, Size)

import { Button, Input, Label, Text } from '@medusajs/ui';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductOption } from './ProductEditorModal';

interface ProductOptionsSectionProps {
	options: ProductOption[];
	onChange: (options: ProductOption[]) => void;
}

const ProductOptionsSection = ({
	options,
	onChange,
}: ProductOptionsSectionProps) => {
	const [localOptions, setLocalOptions] = useState<ProductOption[]>(options);
	// Track input values separately to avoid overwriting while typing
	const [inputValues, setInputValues] = useState<Record<number, string>>({});

	// Sync localOptions when options prop changes
	useEffect(() => {
		setLocalOptions(options);
	}, [options]);

	const updateOptions = (newOptions: ProductOption[]) => {
		setLocalOptions(newOptions);
		onChange(newOptions);
	};

	const addOption = () => {
		const newOption: ProductOption = {
			title: '',
			values: [],
		};
		updateOptions([...localOptions, newOption]);
	};

	const removeOption = (index: number) => {
		updateOptions(localOptions.filter((_, i) => i !== index));
	};

	const updateOptionTitle = (index: number, title: string) => {
		const newOptions = [...localOptions];
		newOptions[index] = {
			...newOptions[index],
			title,
		};
		updateOptions(newOptions);
	};

	const updateInputValue = (index: number, value: string) => {
		// Just update the input state, don't parse yet
		setInputValues(prev => ({ ...prev, [index]: value }));
	};

	const addValueToOption = (optionIndex: number, value?: string) => {
		// Use provided value or get from input state
		const valueToAdd = value || inputValues[optionIndex] || '';
		if (!valueToAdd.trim()) return;

		const trimmedValue = valueToAdd.trim();
		const newOptions = [...localOptions];
		const option = newOptions[optionIndex];

		// Check if value already exists
		if (!option.values.includes(trimmedValue)) {
			option.values = [...option.values, trimmedValue];
			updateOptions(newOptions);
		}

		// Clear the input for this option
		setInputValues(prev => {
			const newInputValues = { ...prev };
			delete newInputValues[optionIndex];
			return newInputValues;
		});
	};

	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addValueToOption(index);
		} else if (e.key === ',') {
			// When comma is pressed, add the value before the comma
			e.preventDefault();
			const input = e.target as HTMLInputElement;
			const value = input.value;
			const beforeComma = value.substring(0, value.length - 1).trim();
			if (beforeComma) {
				addValueToOption(index, beforeComma);
			}
		}
	};

	const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
		const newOptions = [...localOptions];
		const option = newOptions[optionIndex];
		option.values = option.values.filter((_, i) => i !== valueIndex);
		updateOptions(newOptions);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<Label className="text-base font-medium">Produktoptionen</Label>
					<Text size="small" className="text-ui-fg-subtle block mt-1">
						Definieren Sie die Optionen für das Produkt, z.B. Farbe, Größe usw.
					</Text>
				</div>
				<Button variant="secondary" size="small" onClick={addOption}>
					<Plus className="w-4 h-4 mr-2" />
					Hinzufügen
				</Button>
			</div>

			{localOptions.length === 0 ? (
				<div className="border border-ui-border-base rounded-lg p-6 text-center">
					<Text size="small" className="text-ui-fg-subtle">
						Fügen Sie Optionen hinzu, um Varianten zu erstellen.
					</Text>
				</div>
			) : (
				<div className="space-y-4">
					{localOptions.map((option, index) => (
						<div
							key={index}
							className="border border-ui-border-base rounded-lg p-4 space-y-3"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 space-y-3">
									<div>
										<Label htmlFor={`option-title-${index}`} className="mb-2">
											Titel
										</Label>
										<Input
											id={`option-title-${index}`}
											value={option.title}
											onChange={e =>
												updateOptionTitle(index, e.target.value)
											}
											placeholder="option(z.B.Farbe)"
											size="small"
										/>
									</div>
									<div>
										<Label htmlFor={`option-values-${index}`} className="mb-2">
											Werte
										</Label>
										<div className="space-y-2">
											<Input
												id={`option-values-${index}`}
												value={inputValues[index] ?? ''}
												onChange={e => updateInputValue(index, e.target.value)}
												onKeyDown={e => handleInputKeyDown(e, index)}
												placeholder="Rot, Blau, Grün (Enter oder Komma zum Hinzufügen)"
												size="small"
											/>
											{option.values.length > 0 && (
												<div className="flex flex-wrap gap-2">
													{option.values.map((value, valueIndex) => (
														<div
															key={valueIndex}
															className="flex items-center gap-1 px-2 py-1 bg-ui-bg-subtle rounded text-sm"
														>
															<Text size="small">{value}</Text>
															<Button
																variant="transparent"
																size="small"
																onClick={() =>
																	removeValueFromOption(
																		index,
																		valueIndex,
																	)
																}
																className="h-4 w-4 p-0"
															>
																<X className="w-3 h-3" />
															</Button>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								</div>
								<Button
									variant="transparent"
									size="small"
									onClick={() => removeOption(index)}
									className="text-red-500 hover:text-red-700 mt-6"
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ProductOptionsSection;

