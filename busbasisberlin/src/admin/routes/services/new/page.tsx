import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { Service } from '../../../../modules/service/models/service';
import ServiceForm from '../components/ServiceForm';

const NewServicePage = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const formId = 'new-service-form';

	const createService = useMutation({
		mutationFn: async (values: Partial<Service>) => {
			const res = await fetch('/admin/services', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(values),
			});
			if (!res.ok) throw new Error('Fehler beim Erstellen');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-services'] });
			toast.success('Dienstleistung erfolgreich erstellt');
			navigate('/services');
		},
		onError: (e: any) => toast.error(e.message),
	});

	const handleSubmit = (data: Partial<Service>) => {
		createService.mutate(data);
	};

	return (
		<Container className="p-0 h-full">
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
					<div className="flex items-center gap-x-2">
						<h1 className="text-xl font-semibold">Neue Dienstleistung</h1>
					</div>
					<div className="flex items-center gap-x-2">
						<Button
							variant="secondary"
							size="small"
							onClick={() => navigate('/services')}
						>
							Abbrechen
						</Button>
						<Button
							variant="primary"
							size="small"
							type="submit"
							form={formId}
							isLoading={createService.isPending}
						>
							Erstellen
						</Button>
					</div>
				</div>

				{/* Form */}
				<div className="flex-1 overflow-auto">
					<ServiceForm
						formId={formId}
						onSubmit={handleSubmit}
						isSubmitting={createService.isPending}
					/>
				</div>
			</div>
		</Container>
	);
};

export default NewServicePage;
