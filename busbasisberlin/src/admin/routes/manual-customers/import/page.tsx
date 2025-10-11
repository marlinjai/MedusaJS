// busbasisberlin/src/admin/routes/manual-customers/import/page.tsx
// Simple CSV import page for one-time legacy data import
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Button, Container, Input, Select, Text, toast } from '@medusajs/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	FileText,
	Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const config = defineRouteConfig({
	label: 'CSV Import',
});

type ImportResults = {
	imported: number;
	updated: number;
	skipped: number;
	errors: string[];
};

const CSVImportPage = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [file, setFile] = useState<File | null>(null);
	const [csvData, setCsvData] = useState<any[]>([]);
	const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
	const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
	const [importing, setImporting] = useState(false);
	const [importProgress, setImportProgress] = useState({
		current: 0,
		total: 0,
	});
	const [results, setResults] = useState<ImportResults | null>(null);

	// Available fields for mapping - matching actual ManualCustomer model
	const availableFields = {
		// Basic identification
		customer_number: 'Kundennummer',
		internal_key: 'Interner Schlüssel',

		// Personal information
		salutation: 'Anrede',
		title: 'Titel',
		first_name: 'Vorname',
		last_name: 'Nachname',
		company: 'Firma',
		company_addition: 'Firmenzusatz',

		// Contact information
		email: 'E-Mail',
		phone: 'Telefon',
		fax: 'Fax',
		mobile: 'Mobil',
		website: 'Homepage (WWW)',

		// Address information
		street: 'Straße',
		address_addition: 'Adresszusatz',
		street_number: 'Hausnummer',
		postal_code: 'PLZ',
		city: 'Ort',
		country: 'Land',
		state: 'Bundesland',

		// Business information
		vat_id: 'USt-IdNr.',
		tax_number: 'Steuernummer',

		// Customer classification
		customer_type: 'Kundentyp',
		customer_group: 'Kundengruppe',
		status: 'Status',

		// Additional information
		notes: 'Notizen',
		birthday: 'Geburtstag',
		ebay_name: 'eBay-Name',
		language: 'Sprache',
		preferred_contact_method: 'Bevorzugte Kontaktmethode',

		// Legacy/Source tracking
		source: 'Quelle',
		import_reference: 'Import-Referenz',
		legacy_customer_id: 'Legacy Kunden-ID',
		legacy_system_reference: 'Legacy System-Referenz',
	};

	// Handle file upload
	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const uploadedFile = event.target.files?.[0];
		if (!uploadedFile) return;

		if (!uploadedFile.name.endsWith('.csv')) {
			toast.error('Bitte wählen Sie eine CSV-Datei aus');
			return;
		}

		setFile(uploadedFile);

		// Read and parse CSV
		const reader = new FileReader();
		reader.onload = e => {
			const text = e.target?.result as string;
			parseCSV(text);
		};
		reader.readAsText(uploadedFile);
	};

	// Improved CSV parser with delimiter detection
	const parseCSV = (text: string) => {
		const lines = text.trim().split('\n');
		if (lines.length === 0) return;

		// Detect delimiter (semicolon vs comma)
		const firstLine = lines[0];
		const semicolonCount = (firstLine.match(/;/g) || []).length;
		const commaCount = (firstLine.match(/,/g) || []).length;
		const delimiter = semicolonCount > commaCount ? ';' : ',';

		// Parse headers
		const headers = firstLine
			.split(delimiter)
			.map(h => h.trim().replace(/"/g, ''));

		// Parse data rows
		const data = lines.slice(1).map(line => {
			const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
			const row: any = {};
			headers.forEach((header, index) => {
				row[header] = values[index] || '';
			});
			return row;
		});

		setCsvHeaders(headers);
		setCsvData(data);

		// Auto-map common German/English fields
		const autoMapping: Record<string, string> = {};
		headers.forEach(header => {
			const lowerHeader = header.toLowerCase().trim();

			// Customer identification
			if (
				lowerHeader.includes('kundennummer') ||
				lowerHeader.includes('customer')
			) {
				autoMapping[header] = 'customer_number';
			} else if (
				lowerHeader.includes('interner') ||
				lowerHeader.includes('internal')
			) {
				autoMapping[header] = 'internal_key';
			}

			// Personal information
			else if (
				lowerHeader.includes('anrede') ||
				lowerHeader.includes('salutation')
			) {
				autoMapping[header] = 'salutation';
			} else if (
				lowerHeader.includes('titel') ||
				lowerHeader.includes('title')
			) {
				autoMapping[header] = 'title';
			} else if (
				lowerHeader.includes('vorname') ||
				lowerHeader.includes('first')
			) {
				autoMapping[header] = 'first_name';
			} else if (
				lowerHeader.includes('nachname') ||
				lowerHeader.includes('last')
			) {
				autoMapping[header] = 'last_name';
			} else if (
				lowerHeader.includes('firma') ||
				lowerHeader.includes('company') ||
				lowerHeader.includes('unternehmen')
			) {
				autoMapping[header] = 'company';
			} else if (
				lowerHeader.includes('firmenzusatz') ||
				lowerHeader.includes('company_addition')
			) {
				autoMapping[header] = 'company_addition';
			}

			// Contact information
			else if (
				lowerHeader.includes('e-mail') ||
				lowerHeader.includes('email') ||
				lowerHeader.includes('mail')
			) {
				autoMapping[header] = 'email';
			} else if (
				lowerHeader.includes('telefon') ||
				lowerHeader.includes('phone') ||
				lowerHeader.includes('tel')
			) {
				autoMapping[header] = 'phone';
			} else if (lowerHeader.includes('fax')) {
				autoMapping[header] = 'fax';
			} else if (
				lowerHeader.includes('mobil') ||
				lowerHeader.includes('mobile') ||
				lowerHeader.includes('handy')
			) {
				autoMapping[header] = 'mobile';
			} else if (
				lowerHeader.includes('homepage') ||
				lowerHeader.includes('website') ||
				lowerHeader.includes('www')
			) {
				autoMapping[header] = 'website';
			}

			// Address information
			else if (
				lowerHeader.includes('straße') ||
				lowerHeader.includes('strasse') ||
				lowerHeader.includes('street')
			) {
				autoMapping[header] = 'street';
			} else if (
				lowerHeader.includes('adresszusatz') ||
				lowerHeader.includes('address_addition')
			) {
				autoMapping[header] = 'address_addition';
			} else if (
				lowerHeader.includes('hausnummer') ||
				lowerHeader.includes('number')
			) {
				autoMapping[header] = 'street_number';
			} else if (
				lowerHeader.includes('plz') ||
				lowerHeader.includes('postcode') ||
				lowerHeader.includes('postal')
			) {
				autoMapping[header] = 'postal_code';
			} else if (
				lowerHeader.includes('ort') ||
				lowerHeader.includes('city') ||
				lowerHeader.includes('stadt')
			) {
				autoMapping[header] = 'city';
			} else if (
				lowerHeader.includes('land') ||
				lowerHeader.includes('country')
			) {
				autoMapping[header] = 'country';
			} else if (
				lowerHeader.includes('bundesland') ||
				lowerHeader.includes('state')
			) {
				autoMapping[header] = 'state';
			}

			// Business information
			else if (
				lowerHeader.includes('ust') ||
				lowerHeader.includes('vat') ||
				lowerHeader.includes('mwst')
			) {
				autoMapping[header] = 'vat_id';
			} else if (
				lowerHeader.includes('steuer') ||
				lowerHeader.includes('tax')
			) {
				autoMapping[header] = 'tax_number';
			}

			// Customer classification
			else if (
				lowerHeader.includes('kundentyp') ||
				lowerHeader.includes('customer_type')
			) {
				autoMapping[header] = 'customer_type';
			} else if (
				lowerHeader.includes('kundengruppe') ||
				lowerHeader.includes('customer_group')
			) {
				autoMapping[header] = 'customer_group';
			} else if (lowerHeader.includes('status')) {
				autoMapping[header] = 'status';
			}

			// Additional information
			else if (
				lowerHeader.includes('notiz') ||
				lowerHeader.includes('note') ||
				lowerHeader.includes('bemerkung')
			) {
				autoMapping[header] = 'notes';
			} else if (
				lowerHeader.includes('geburtstag') ||
				lowerHeader.includes('birthday') ||
				lowerHeader.includes('birth')
			) {
				autoMapping[header] = 'birthday';
			} else if (lowerHeader.includes('ebay')) {
				autoMapping[header] = 'ebay_name';
			} else if (
				lowerHeader.includes('sprache') ||
				lowerHeader.includes('language') ||
				lowerHeader.includes('lang')
			) {
				autoMapping[header] = 'language';
			} else if (
				lowerHeader.includes('kontakt') ||
				lowerHeader.includes('contact')
			) {
				autoMapping[header] = 'preferred_contact_method';
			}

			// Legacy/Source tracking
			else if (
				lowerHeader.includes('quelle') ||
				lowerHeader.includes('source')
			) {
				autoMapping[header] = 'source';
			} else if (
				lowerHeader.includes('import') ||
				lowerHeader.includes('referenz')
			) {
				autoMapping[header] = 'import_reference';
			} else if (lowerHeader.includes('legacy')) {
				autoMapping[header] = 'legacy_customer_id';
			}
		});

		setFieldMapping(autoMapping);

		// Show success message
		toast.success(
			`CSV erfolgreich geladen: ${data.length} Datensätze, ${headers.length} Spalten`,
		);
	};

	// Handle import
	const handleImport = async () => {
		if (!csvData.length || !fieldMapping) {
			toast.error(
				'Bitte laden Sie eine CSV-Datei und konfigurieren Sie die Feldmapping',
			);
			return;
		}

		// Quick validation on first 10 rows only (sample validation)
		toast.info('Validiere Beispieldaten...');
		try {
			const sampleData = csvData.slice(0, 10);
			const response = await fetch('/admin/manual-customers/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					csvData: sampleData,
					fieldMapping,
					options: { validate: true },
				}),
			});

			if (!response.ok) {
				toast.error('Validierung fehlgeschlagen');
				return;
			}

			const result = await response.json();
			toast.success('Beispieldaten validiert - Import wird gestartet...');
		} catch (error) {
			toast.error(
				'Validierung fehlgeschlagen - Import wird trotzdem gestartet',
			);
		}

		setImporting(true);
		setImportProgress({ current: 0, total: csvData.length }); // Show CUSTOMER progress, not batch progress

		// Configuration for batching - optimized for performance with bulk operations
		const BATCH_SIZE = 50; // Process 50 customers per batch (optimized with bulk operations)
		const PARALLEL_BATCHES = 3; // Process 3 batches in parallel for better throughput
		const totalBatches = Math.ceil(csvData.length / BATCH_SIZE);
		const cumulativeResults: ImportResults = {
			imported: 0,
			updated: 0,
			skipped: 0,
			errors: [],
		};

		setImportProgress({ current: 0, total: totalBatches });

		try {
			// Process batches in parallel groups for better performance
			for (let i = 0; i < totalBatches; i += PARALLEL_BATCHES) {
				const currentBatchGroup = Math.min(PARALLEL_BATCHES, totalBatches - i);
				const batchPromises = [];

				// Create promises for parallel batch processing
				for (let j = 0; j < currentBatchGroup; j++) {
					const batchIndex = i + j;
					const startIndex = batchIndex * BATCH_SIZE;
					const endIndex = Math.min(startIndex + BATCH_SIZE, csvData.length);
					const batchData = csvData.slice(startIndex, endIndex);

					const batchPromise = fetch('/admin/manual-customers/import', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							csvData: batchData,
							fieldMapping,
						}),
					}).then(async response => {
						if (!response.ok) {
							const errorText = await response.text();
							throw new Error(
								`Batch ${batchIndex + 1} fehlgeschlagen: ${errorText}`,
							);
						}
						return {
							batchIndex: batchIndex + 1,
							result: await response.json(),
						};
					});

					batchPromises.push(batchPromise);
				}

				// Process current group of batches in parallel
				const startCustomer = i * BATCH_SIZE + 1;
				const endCustomer = Math.min(
					(i + currentBatchGroup) * BATCH_SIZE,
					csvData.length,
				);

				toast.info(
					`Verarbeite Kunden ${startCustomer}-${endCustomer} von ${csvData.length}...`,
				);

				try {
					const batchResults = await Promise.all(batchPromises);

					// Accumulate results from all batches in this group
					batchResults.forEach(({ result }) => {
						const batchResults = result.results;
						cumulativeResults.imported += batchResults.imported;
						cumulativeResults.updated += batchResults.updated;
						cumulativeResults.skipped += batchResults.skipped;
						cumulativeResults.errors.push(...batchResults.errors);
					});

					// Update progress (count completed CUSTOMERS, not batches)
					const customersProcessed = (i + currentBatchGroup) * BATCH_SIZE;
					const actualCustomersProcessed = Math.min(
						customersProcessed,
						csvData.length,
					);
					setImportProgress({
						current: actualCustomersProcessed,
						total: csvData.length,
					});

					// Better user feedback
					toast.info(
						`${actualCustomersProcessed}/${csvData.length} Kunden verarbeitet • ${cumulativeResults.imported} neu, ${cumulativeResults.updated} aktualisiert`,
					);
				} catch (error) {
					// If any batch in the group fails, add to errors but continue
					const errorMessage =
						error instanceof Error ? error.message : 'Unbekannter Fehler';
					cumulativeResults.errors.push(
						`Kunden ${startCustomer}-${endCustomer}: ${errorMessage}`,
					);

					// Still update progress even on error
					const customersProcessed = (i + currentBatchGroup) * BATCH_SIZE;
					const actualCustomersProcessed = Math.min(
						customersProcessed,
						csvData.length,
					);
					setImportProgress({
						current: actualCustomersProcessed,
						total: csvData.length,
					});
				}

				// Small delay between batch groups to avoid overwhelming the server
				if (i + PARALLEL_BATCHES < totalBatches) {
					await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay due to bulk optimizations
				}
			}

			setResults(cumulativeResults);

			// Invalidate cache to refresh the main page
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });

			toast.success(
				`Import abgeschlossen: ${cumulativeResults.imported} Kunden importiert, ${cumulativeResults.updated} aktualisiert, ${cumulativeResults.skipped} übersprungen`,
			);

			if (cumulativeResults.errors.length > 0) {
				toast.warning(`${cumulativeResults.errors.length} Fehler aufgetreten`);
			}
		} catch (error) {
			console.error('Import error:', error);
			toast.error(
				`Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
			);
		} finally {
			setImporting(false);
			setImportProgress({ current: 0, total: 0 });
		}
	};

	return (
		<Container>
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button
					variant="secondary"
					size="small"
					onClick={() => navigate('/manual-customers')}
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Zurück
				</Button>
				<div>
					<Text size="xlarge" weight="plus" className="text-ui-fg-base">
						CSV Import
					</Text>
					<Text size="small" className="text-ui-fg-subtle">
						Importieren Sie Legacy-Kundendaten aus einer CSV-Datei
					</Text>
				</div>
			</div>

			{!results ? (
				<div className="space-y-6">
					{/* File Upload */}
					<div className="border-2 border-dashed border-ui-border-base rounded-lg p-8 text-center">
						<Upload className="mx-auto h-12 w-12 text-ui-fg-muted mb-4" />
						<Text size="large" weight="plus" className="text-ui-fg-base mb-2">
							CSV-Datei auswählen
						</Text>
						<Text size="small" className="text-ui-fg-subtle mb-4">
							Wählen Sie eine CSV-Datei mit Ihren Kundendaten aus
						</Text>
						<Input
							type="file"
							accept=".csv"
							onChange={handleFileUpload}
							className="max-w-sm mx-auto"
						/>
						{file && (
							<div className="mt-4 flex items-center justify-center gap-2">
								<FileText className="w-4 h-4" />
								<Text size="small" className="text-ui-fg-subtle">
									{file.name} ({csvData.length} Zeilen)
								</Text>
							</div>
						)}
					</div>

					{/* Field Mapping */}
					{csvHeaders.length > 0 && (
						<div className="border border-ui-border-base rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<Text size="large" weight="plus" className="text-ui-fg-base">
									Feldmapping
								</Text>
								<div className="flex items-center gap-2">
									<Text size="small" className="text-ui-fg-subtle">
										{Object.values(fieldMapping).filter(v => v !== '').length}{' '}
										von {csvHeaders.length} Spalten zugeordnet
									</Text>
								</div>
							</div>
							<Text size="small" className="text-ui-fg-subtle mb-6">
								Ordnen Sie die CSV-Spalten den Kundenfeldern zu
							</Text>

							<div className="space-y-4">
								{csvHeaders.map((header, index) => (
									<div
										key={index}
										className="flex items-center gap-4 p-4 bg-ui-bg-subtle rounded-lg"
									>
										<div className="w-64">
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-1"
											>
												{header}
											</Text>
											<Text size="xsmall" className="text-ui-fg-subtle">
												Beispiel: {csvData[0]?.[header] || 'Leer'}
											</Text>
										</div>
										<div className="flex-1">
											<Select
												value={fieldMapping[header] || 'none'}
												onValueChange={value => {
													setFieldMapping(prev => ({
														...prev,
														[header]: value === 'none' ? '' : value,
													}));
												}}
											>
												<Select.Trigger>
													<Select.Value placeholder="Feld auswählen..." />
												</Select.Trigger>
												<Select.Content>
													<Select.Item key="no-mapping" value="none">
														Nicht zuordnen
													</Select.Item>
													{Object.entries(availableFields).map(
														([key, label]) => (
															<Select.Item key={key} value={key}>
																{label}
															</Select.Item>
														),
													)}
												</Select.Content>
											</Select>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Import Button */}
					{csvData.length > 0 && (
						<div className="space-y-4">
							{/* Progress Bar */}
							{importing && importProgress.total > 0 && (
								<div className="border border-ui-border-base rounded-lg p-4">
									<div className="flex justify-between items-center mb-2">
										<Text size="small" weight="plus">
											Import Fortschritt
										</Text>
										<Text size="small" className="text-ui-fg-subtle">
											{importProgress.current} von {importProgress.total} Kunden
										</Text>
									</div>
									<div className="w-full bg-ui-bg-subtle rounded-full h-3">
										<div
											className="bg-blue-500 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
											style={{
												width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
											}}
										>
											<Text size="xsmall" className="text-white font-medium">
												{Math.round(
													(importProgress.current / importProgress.total) * 100,
												)}
												%
											</Text>
										</div>
									</div>
									<div className="flex justify-between items-center mt-2">
										<Text size="xsmall" className="text-ui-fg-subtle">
											Verarbeitet: {importProgress.current} • Verbleibend:{' '}
											{importProgress.total - importProgress.current}
										</Text>
										<Text size="xsmall" className="text-ui-fg-subtle">
											{Math.round(
												(importProgress.current / importProgress.total) * 100,
											)}
											% abgeschlossen
										</Text>
									</div>
								</div>
							)}

							{/* Import Button */}
							<div className="flex justify-end">
								<Button
									onClick={handleImport}
									disabled={importing || Object.keys(fieldMapping).length === 0}
									size="large"
								>
									{importing
										? `Verarbeite ${importProgress.current}/${importProgress.total} Kunden...`
										: `${csvData.length} Kunden importieren`}
								</Button>
							</div>
						</div>
					)}
				</div>
			) : (
				/* Results */
				<div className="space-y-6">
					{/* Results Display */}
					{results && (
						<div className="border border-ui-border-base rounded-lg p-6 space-y-4">
							<div className="flex items-center gap-2">
								<CheckCircle className="w-5 h-5 text-ui-tag-green-text" />
								<Text size="large" weight="plus" className="text-ui-fg-base">
									Import abgeschlossen
								</Text>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="text-center">
									<Text
										size="xlarge"
										weight="plus"
										className="text-ui-tag-green-text"
									>
										{results.imported}
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										Erfolgreich importiert
									</Text>
								</div>

								<div className="text-center">
									<Text
										size="xlarge"
										weight="plus"
										className="text-ui-tag-blue-text"
									>
										{results.updated}
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										Aktualisiert
									</Text>
								</div>

								<div className="text-center">
									<Text
										size="xlarge"
										weight="plus"
										className="text-ui-tag-orange-text"
									>
										{results.skipped}
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										Übersprungen
									</Text>
								</div>
							</div>

							{/* Error Details */}
							{results.errors.length > 0 && (
								<div className="border-t border-ui-border-base pt-4">
									<div className="flex items-center gap-2 mb-3">
										<AlertCircle className="w-4 h-4 text-ui-tag-red-text" />
										<Text
											size="small"
											weight="plus"
											className="text-ui-fg-base"
										>
											Fehler beim Import ({results.errors.length})
										</Text>
									</div>

									<div className="max-h-64 overflow-y-auto bg-ui-bg-subtle rounded-lg p-3">
										<div className="space-y-2">
											{results.errors.slice(0, 50).map((error, index) => (
												<div
													key={index}
													className="text-sm font-mono text-ui-fg-subtle border-b border-ui-border-base pb-1 last:border-b-0"
												>
													{error}
												</div>
											))}
											{results.errors.length > 50 && (
												<div className="text-sm text-ui-fg-muted text-center pt-2">
													... und {results.errors.length - 50} weitere Fehler
												</div>
											)}
										</div>
									</div>

									<div className="mt-3 p-3 bg-ui-tag-orange-bg rounded-lg">
										<Text size="small" className="text-ui-fg-base">
											<strong>Häufige Fehlerursachen:</strong>
											<br />• <strong>Invalid date</strong>: Datumswerte im
											falschen Format (erwartet: YYYY-MM-DD oder DD.MM.YYYY)
											<br />• <strong>Invalid number</strong>: Numerische Werte
											enthalten Buchstaben oder falsche Formatierung
											<br />• <strong>Field errors</strong>: Feldmapping stimmt
											nicht mit den Datentypen überein
										</Text>
									</div>
								</div>
							)}
						</div>
					)}

					<div className="flex justify-end gap-2">
						<Button
							variant="secondary"
							onClick={() => {
								setResults(null);
								setFile(null);
								setCsvData([]);
								setCsvHeaders([]);
								setFieldMapping({});
							}}
						>
							Weiteren Import starten
						</Button>
						<Button onClick={() => navigate('/manual-customers')}>
							Zu den Kunden
						</Button>
					</div>
				</div>
			)}
		</Container>
	);
};

export default CSVImportPage;
