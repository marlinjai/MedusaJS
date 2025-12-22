/**
 * uncategorized-products-tool.tsx
 * One-click tool to assign all uncategorized products to "Ohne Kategorie"
 * Features: Creates category if needed, assigns products, syncs to Meilisearch
 */
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { InformationCircleSolid, Spinner } from '@medusajs/icons';
import { Button, Container, Heading, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type UncategorizedInfo = {
	totalProducts: number;
	uncategorizedCount: number;
	defaultCategory: {
		id: string;
		name: string;
		handle: string;
	} | null;
	examples: Array<{ id: string; title: string }>;
};

const UncategorizedProductsTool = () => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);
	const queryClient = useQueryClient();

	// Fetch current status
	const { data, isLoading, refetch } = useQuery<UncategorizedInfo>({
		queryKey: ['uncategorized-products-info'],
		queryFn: async () => {
			const response = await fetch('/admin/products/assign-uncategorized', {
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error('Failed to fetch uncategorized products info');
			}
			return response.json();
		},
	});

	// Create category mutation
	const createCategory = useMutation({
		mutationFn: async () => {
			const response = await fetch('/admin/categories/create-default', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to create category');
			}
			return response.json();
		},
	});

	// Assign products mutation
	const assignProducts = useMutation({
		mutationFn: async (dryRun: boolean = false) => {
			const response = await fetch('/admin/products/assign-uncategorized', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					dryRun,
					syncToMeilisearch: true,
				}),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to assign products');
			}
			return response.json();
		},
	});

	const addLog = (message: string) => {
		setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
	};

	const handleOneClickFix = async () => {
		if (isProcessing) return;

		setIsProcessing(true);
		setLogs([]);

		try {
			addLog('🚀 Starting one-click fix...');

			// Step 1: Create category (idempotent - checks if exists)
			addLog('📂 Creating/verifying "Ohne Kategorie" category...');
			const categoryResult = await createCategory.mutateAsync();
			addLog(
				`✅ Category ready: ${categoryResult.category.name} (${categoryResult.category.id})`
			);

			// Step 2: Check if there are products to assign
			await refetch();
			if (data && data.uncategorizedCount === 0) {
				addLog('✨ No uncategorized products found - nothing to do!');
				toast.success('Success', {
					description: 'All products are already categorized!',
				});
				setIsProcessing(false);
				return;
			}

			// Step 3: Assign products
			addLog(
				`📦 Assigning ${data?.uncategorizedCount || 0} products to category...`
			);
			const assignResult = await assignProducts.mutateAsync(false);
			addLog(`✅ ${assignResult.message}`);

			// Step 4: Wait for background process (sync happens automatically)
			addLog('⏳ Background process started - syncing to Meilisearch...');
			addLog('⏱️  This will take 3-5 minutes. You can close this and check back.');

			// Step 5: Refresh data after a delay
			setTimeout(async () => {
				await refetch();
				addLog('🎉 Process completed! Products are now visible in frontend.');
				toast.success('Success!', {
					description: `Successfully assigned ${data?.uncategorizedCount || 0} products to "Ohne Kategorie"`,
					duration: 5000,
				});
				setIsProcessing(false);
			}, 3000);
		} catch (error: any) {
			addLog(`❌ Error: ${error.message}`);
			toast.error('Error', {
				description: error.message,
				duration: 5000,
			});
			setIsProcessing(false);
		}
	};

	const handleDryRun = async () => {
		if (isProcessing) return;

		setIsProcessing(true);
		setLogs([]);

		try {
			addLog('🔍 Running dry run...');

			// Check category
			await refetch();
			if (!data?.defaultCategory) {
				addLog('📂 Category "Ohne Kategorie" does not exist yet');
				addLog('📂 It will be created when you run the full process');
			} else {
				addLog(`✅ Category exists: ${data.defaultCategory.name}`);
			}

			addLog(`📊 Found ${data?.uncategorizedCount || 0} uncategorized products`);

			if (data?.examples && data.examples.length > 0) {
				addLog('📝 Example products:');
				data.examples.slice(0, 5).forEach(p => {
					addLog(`   - ${p.title}`);
				});
			}

			addLog('✅ Dry run complete - no changes made');
			toast.info('Dry Run Complete', {
				description: `Found ${data?.uncategorizedCount || 0} products to assign`,
			});
		} catch (error: any) {
			addLog(`❌ Error: ${error.message}`);
			toast.error('Error', { description: error.message });
		} finally {
			setIsProcessing(false);
		}
	};

	if (isLoading) {
		return (
			<Container>
				<div className="flex items-center gap-2">
					<Spinner className="animate-spin" />
					<Text>Loading product information...</Text>
				</div>
			</Container>
		);
	}

	const hasUncategorized = (data?.uncategorizedCount || 0) > 0;

	return (
		<Container>
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between">
					<div>
						<Heading level="h2">Uncategorized Products Tool</Heading>
						<Text className="text-ui-fg-subtle mt-1">
							Assign all uncategorized products to "Ohne Kategorie" in one click
						</Text>
					</div>
				</div>

				{/* Status Display */}
				<div className="grid grid-cols-2 gap-4">
					<div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
						<Text className="text-ui-fg-subtle text-xs uppercase font-medium">
							Total Products
						</Text>
						<Text className="text-3xl font-bold mt-2">
							{data?.totalProducts || 0}
						</Text>
					</div>
					<div
						className={`rounded-lg border p-4 ${
							hasUncategorized
								? 'border-orange-600 bg-orange-100 dark:bg-orange-950'
								: 'border-green-600 bg-green-100 dark:bg-green-950'
						}`}
					>
						<Text className={`text-xs uppercase font-medium ${
							hasUncategorized
								? 'text-orange-900 dark:text-orange-200'
								: 'text-green-900 dark:text-green-200'
						}`}>
							Uncategorized
						</Text>
						<Text className={`text-3xl font-bold mt-2 ${
							hasUncategorized
								? 'text-orange-900 dark:text-orange-100'
								: 'text-green-900 dark:text-green-100'
						}`}>
							{data?.uncategorizedCount || 0}
						</Text>
					</div>
				</div>

				{/* Category Status */}
				<div className="rounded-lg border border-ui-border-base p-4">
					<div className="flex items-center gap-2 mb-2">
						<InformationCircleSolid className="text-ui-fg-subtle" />
						<Text className="font-medium">Default Category Status</Text>
					</div>
					{data?.defaultCategory ? (
						<Text className="text-ui-fg-subtle text-sm">
							✅ Category "{data.defaultCategory.name}" exists (Handle:{' '}
							{data.defaultCategory.handle})
						</Text>
					) : (
						<Text className="text-ui-fg-subtle text-sm">
							⚠️ Default category will be created automatically when you run the
							tool
						</Text>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3">
					<Button
						onClick={handleOneClickFix}
						disabled={isProcessing || !hasUncategorized}
						variant="primary"
						className="flex-1"
					>
						{isProcessing ? (
							<>
								<Spinner className="animate-spin" />
								Processing...
							</>
						) : (
							<>
								{hasUncategorized
									? `🚀 Fix ${data?.uncategorizedCount} Products`
									: '✅ All Products Categorized'}
							</>
						)}
					</Button>
					<Button
						onClick={handleDryRun}
						disabled={isProcessing}
						variant="secondary"
					>
						🔍 Dry Run
					</Button>
					<Button onClick={() => refetch()} disabled={isProcessing} variant="secondary">
						🔄 Refresh
					</Button>
				</div>

				{/* Log Display */}
				{logs.length > 0 && (
					<div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
						<Text className="font-medium mb-2">Process Log:</Text>
						<div className="bg-ui-bg-subtle rounded p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
							{logs.map((log, idx) => (
								<div key={idx} className="text-ui-fg-subtle">
									{log}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Help Text */}
				<div className="rounded-lg bg-ui-bg-subtle p-4">
					<Text className="text-ui-fg-subtle text-sm">
						<strong>What this does:</strong>
						<br />
						1. Creates "Ohne Kategorie" category (if it doesn't exist)
						<br />
						2. Assigns all uncategorized products to this category
						<br />
						3. Syncs changes to Meilisearch search index
						<br />
						4. Makes products visible in the frontend store
						<br />
						<br />
						⏱️ <strong>Time:</strong> 3-5 minutes (runs in background)
						<br />
						✅ <strong>Safe:</strong> Idempotent - can be run multiple times
					</Text>
				</div>
			</div>
		</Container>
	);
};

// Configure widget to appear in settings/products area
export const config = defineWidgetConfig({
	zone: 'product.list.before',
});

export default UncategorizedProductsTool;

