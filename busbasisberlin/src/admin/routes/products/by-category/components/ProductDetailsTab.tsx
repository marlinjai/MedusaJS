// busbasisberlin/src/admin/routes/products/by-category/components/ProductDetailsTab.tsx
// Product details tab for basic product information

import { Button, Checkbox, Input, Label, Switch, Text, Textarea } from '@medusajs/ui';
import { CloudUpload, X } from 'lucide-react';
import { useRef, useState } from 'react';

type ProductFormData = {
	title?: string;
	subtitle?: string;
	handle?: string;
	description?: string;
	status?: 'published' | 'draft';
	has_variants?: boolean;
	images?: Array<{ url: string }>;
};

interface ProductDetailsTabProps {
	formData: Partial<ProductFormData>;
	onChange: (data: Partial<ProductFormData>) => void;
}

const ProductDetailsTab = ({
	formData,
	onChange,
}: ProductDetailsTabProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleFileSelect = (files: FileList | null) => {
		if (!files || files.length === 0) return;

		const fileArray = Array.from(files);
		const imagePromises = fileArray.map(file => {
			return new Promise<{ url: string }>(resolve => {
				const reader = new FileReader();
				reader.onload = e => {
					const result = e.target?.result;
					if (typeof result === 'string') {
						resolve({ url: result });
					}
				};
				reader.readAsDataURL(file);
			});
		});

		Promise.all(imagePromises).then(images => {
			onChange({
				...formData,
				images: [...(formData.images || []), ...images],
			});
		});
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		handleFileSelect(e.dataTransfer.files);
	};

	const removeImage = (index: number) => {
		const newImages = (formData.images || []).filter((_, i) => i !== index);
		onChange({
			...formData,
			images: newImages,
		});
	};

	return (
		<div className="space-y-6">
			{/* Allgemein Section */}
			<div className="space-y-4">
				<div>
					<Label htmlFor="title" className="mb-2">
						Titel *
					</Label>
					<Input
						id="title"
						value={formData.title || ''}
						onChange={e =>
							onChange({
								...formData,
								title: e.target.value,
							})
						}
						placeholder="Produkttitel"
						required
					/>
				</div>

				<div>
					<Label htmlFor="subtitle" className="mb-2">
						Untertitel (Optional)
					</Label>
					<Input
						id="subtitle"
						value={formData.subtitle || ''}
						onChange={e =>
							onChange({
								...formData,
								subtitle: e.target.value,
							})
						}
						placeholder="Untertitel"
					/>
				</div>

				<div>
					<Label htmlFor="handle" className="mb-2">
						Handle (Optional)
					</Label>
					<Input
						id="handle"
						value={formData.handle || ''}
						onChange={e =>
							onChange({
								...formData,
								handle: e.target.value,
							})
						}
						placeholder="/ produkt-handle"
					/>
					<Text size="small" className="text-ui-fg-subtle mt-1">
						Wird automatisch aus dem Titel generiert, wenn leer gelassen
					</Text>
				</div>

				<div>
					<Label htmlFor="description" className="mb-2">
						Beschreibung (Optional)
					</Label>
					<Textarea
						id="description"
						value={formData.description || ''}
						onChange={e =>
							onChange({
								...formData,
								description: e.target.value,
							})
						}
						placeholder="Produktbeschreibung"
						rows={6}
					/>
				</div>
			</div>

			{/* Medien Section */}
			<div>
				<Label className="mb-2">Medien (Optional)</Label>
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
						isDragging
							? 'border-ui-fg-interactive bg-ui-bg-interactive'
							: 'border-ui-border-base'
					}`}
				>
					<CloudUpload className="w-12 h-12 mx-auto mb-4 text-ui-fg-subtle" />
					<Text size="small" className="text-ui-fg-subtle mb-2">
						Bilder hochladen
					</Text>
					<Text size="small" className="text-ui-fg-muted mb-4">
						Ziehen Sie Bilder per Drag-and-Drop hierher oder klicken Sie zum
						Hochladen.
					</Text>
					<Button
						variant="secondary"
						size="small"
						onClick={() => fileInputRef.current?.click()}
					>
						Dateien auswählen
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept="image/*"
						className="hidden"
						onChange={e => handleFileSelect(e.target.files)}
					/>
				</div>
				{formData.images && formData.images.length > 0 && (
					<div className="grid grid-cols-4 gap-4 mt-4">
						{formData.images.map((image, index) => (
							<div key={index} className="relative group">
								<img
									src={image.url}
									alt={`Upload ${index + 1}`}
									className="w-full h-32 object-cover rounded border border-ui-border-base"
								/>
								<Button
									variant="transparent"
									size="small"
									onClick={() => removeImage(index)}
									className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white"
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Varianten Toggle */}
			<div className="flex items-center gap-3 pt-4 border-t border-ui-border-base">
				<Switch
					checked={formData.has_variants || false}
					onCheckedChange={checked =>
						onChange({
							...formData,
							has_variants: checked,
						})
					}
				/>
				<div>
					<Label>Ja, es handelt sich um ein Produkt mit Varianten</Label>
					<Text size="small" className="text-ui-fg-subtle block mt-1">
						Wenn diese Option deaktiviert ist, erstellen wir eine Standardvariante
						für Sie
					</Text>
				</div>
			</div>
		</div>
	);
};

export default ProductDetailsTab;

