// busbasisberlin/src/api/admin-password-reset/route.ts
// Öffentliche API-Route für Admin Password Reset (nicht durch Admin-Middleware geschützt)

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

interface PasswordResetQuery {
	token?: string;
	email?: string;
}

interface PasswordResetBody {
	token?: string;
	email?: string;
	password?: string;
}

export async function GET(
	req: MedusaRequest<PasswordResetQuery>,
	res: MedusaResponse,
) {
	const { token, email } = req.query;

	// Basic validation
	if (!token || !email) {
		return res
			.status(400)
			.send(generateErrorPage('Ungültiger oder fehlerhafter Reset-Link'));
	}

	// Generate the HTML page
	const html = generateResetPasswordPage(String(token), String(email));

	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(html);
}

// Handle the password reset form submission
export async function POST(
	req: MedusaRequest<PasswordResetBody>,
	res: MedusaResponse,
) {
	try {
		const { token, email, password } = req.body;

		if (!token || !email || !password) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		// Call the Medusa password reset API for admin users
		const resetResponse = await fetch(
			`${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/auth/user/emailpass/update`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					email: email,
					password: password,
				}),
			},
		);

		if (!resetResponse.ok) {
			const errorData = await resetResponse.json().catch(() => ({}));
			return res.status(resetResponse.status).json({
				error: errorData.message || 'Password reset failed',
			});
		}

		return res.json({ success: true, message: 'Password reset successful' });
	} catch (error) {
		console.error('Password reset error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
}

// Generate the HTML page for password reset
function generateResetPasswordPage(token: string, email: string): string {
	// Get backend URL from environment or use current origin
	const backendUrl = process.env.MEDUSA_BACKEND_URL || '';
	const adminUrl = backendUrl ? `${backendUrl}/app` : '/app';

	return `
<!DOCTYPE html>
<html lang="de" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Passwort zurücksetzen - Basis Camp Berlin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .spinner {
            border: 3px solid #334155;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
        <!-- Logo & Header -->
        <div class="text-center">
            <div class="mx-auto mb-8 flex justify-center">
                <img src="https://medusa-js-busbasisberlin-storefront.vercel.app/logo-with-font.png" alt="Basis Camp Berlin" class="h-16 w-auto">
            </div>
            <h2 class="text-3xl font-bold text-white">
                Admin Passwort zurücksetzen
            </h2>
            <p class="mt-2 text-sm text-neutral-400">
                Erstellen Sie ein sicheres Passwort für Ihr Admin-Konto
            </p>
            <p class="mt-1 text-xs text-neutral-500">
                Für: <strong class="text-blue-400">${email}</strong>
            </p>
        </div>

        <!-- Success Message (hidden by default) -->
        <div id="successMessage" class="hidden bg-gradient-to-r from-green-900/90 to-emerald-900/90 border border-green-600 p-6 rounded-xl shadow-2xl">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-lg font-bold text-white mb-2">
                        Passwort erfolgreich geändert!
                    </h3>
                    <p class="text-sm text-green-200 mb-4">
                        Ihr Admin-Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
                    </p>
                    <button onclick="window.location.href='${adminUrl}'"
                            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl">
                        → Zur Admin-Anmeldung
                    </button>
                </div>
            </div>
        </div>

        <!-- Form -->
        <form id="resetForm" class="mt-8 space-y-6 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl" onsubmit="handleSubmit(event)">
            <div class="space-y-4">
                <!-- New Password -->
                <div>
                    <label for="password" class="block text-sm font-medium text-neutral-300 mb-2">
                        Neues Passwort
                    </label>
                    <div class="relative">
                        <input id="password" name="password" type="password" required
                               class="appearance-none block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg placeholder-neutral-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                               placeholder="Mindestens 8 Zeichen">
                        <button type="button" onclick="togglePassword('password')"
                                class="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors">
                            <span id="password-toggle">👁️</span>
                        </button>
                    </div>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-neutral-300 mb-2">
                        Passwort bestätigen
                    </label>
                    <div class="relative">
                        <input id="confirmPassword" name="confirmPassword" type="password" required
                               class="appearance-none block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg placeholder-neutral-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                               placeholder="Passwort wiederholen">
                        <button type="button" onclick="togglePassword('confirmPassword')"
                                class="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors">
                            <span id="confirmPassword-toggle">👁️</span>
                        </button>
                    </div>
                </div>

                <!-- Password Requirements -->
                <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                    <h4 class="text-sm font-medium text-neutral-300 mb-3">Passwort-Anforderungen:</h4>
                    <ul class="text-sm text-neutral-400 space-y-2">
                        <li id="req-length" class="flex items-center">
                            <span class="mr-2 text-neutral-600">○</span>
                            Mindestens 8 Zeichen
                        </li>
                        <li id="req-lower" class="flex items-center">
                            <span class="mr-2 text-neutral-600">○</span>
                            Ein Kleinbuchstabe
                        </li>
                        <li id="req-upper" class="flex items-center">
                            <span class="mr-2 text-neutral-600">○</span>
                            Ein Großbuchstabe
                        </li>
                        <li id="req-digit" class="flex items-center">
                            <span class="mr-2 text-neutral-600">○</span>
                            Eine Ziffer
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Error Message -->
            <div id="errorMessage" class="hidden bg-red-900/50 border border-red-600 p-4 rounded-lg">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-200" id="errorText"></p>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <div>
                <button type="submit" id="submitButton"
                        class="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
                    <span id="buttonText">Passwort zurücksetzen</span>
                    <div id="buttonSpinner" class="hidden spinner ml-2"></div>
                </button>
            </div>
        </form>

        <!-- Footer -->
        <div class="text-center">
            <p class="text-sm text-neutral-400">
                Haben Sie Probleme?
                <a href="${adminUrl}/reset-password" class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    Neuen Link anfordern
                </a>
            </p>
        </div>
    </div>

    <script>
        const token = "${token}";
        const email = "${email}";

        // Toggle password visibility
        function togglePassword(fieldId) {
            const field = document.getElementById(fieldId);
            const toggle = document.getElementById(fieldId + '-toggle');

            if (field.type === 'password') {
                field.type = 'text';
                toggle.textContent = '🙈';
            } else {
                field.type = 'password';
                toggle.textContent = '👁️';
            }
        }

        // Validate password requirements
        function validatePassword(password) {
            const requirements = {
                length: password.length >= 8,
                lower: /(?=.*[a-z])/.test(password),
                upper: /(?=.*[A-Z])/.test(password),
                digit: /(?=.*\\d)/.test(password)
            };

            // Update UI
            updateRequirement('req-length', requirements.length);
            updateRequirement('req-lower', requirements.lower);
            updateRequirement('req-upper', requirements.upper);
            updateRequirement('req-digit', requirements.digit);

            return Object.values(requirements).every(Boolean);
        }

        function updateRequirement(id, met) {
            const element = document.getElementById(id);
            const icon = element.querySelector('span');

            if (met) {
                element.className = 'flex items-center text-green-600';
                icon.textContent = '✓';
            } else {
                element.className = 'flex items-center text-gray-400';
                icon.textContent = '○';
            }
        }

        // Real-time password validation
        document.getElementById('password').addEventListener('input', function(e) {
            validatePassword(e.target.value);
        });

        // Handle form submission
        async function handleSubmit(event) {
            event.preventDefault();

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Hide previous messages
            document.getElementById('errorMessage').classList.add('hidden');
            document.getElementById('successMessage').classList.add('hidden');

            // Validate password
            if (!validatePassword(password)) {
                showError('Bitte erfüllen Sie alle Passwort-Anforderungen.');
                return;
            }

            if (password !== confirmPassword) {
                showError('Die Passwörter stimmen nicht überein.');
                return;
            }

            // Show loading state
            setLoadingState(true);

            try {
                const response = await fetch('/admin-password-reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token,
                        email: email,
                        password: password
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    // Hide form and show success
                    document.getElementById('resetForm').style.display = 'none';
                    document.getElementById('successMessage').classList.remove('hidden');
                } else {
                    if (result.error?.includes('expired') || result.error?.includes('invalid')) {
                        showError('Ihr Reset-Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen an.');
                    } else {
                        showError(result.error || 'Fehler beim Zurücksetzen des Passworts.');
                    }
                }
            } catch (error) {
                console.error('Password reset failed:', error);
                showError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
            } finally {
                setLoadingState(false);
            }
        }

        function showError(message) {
            document.getElementById('errorText').textContent = message;
            document.getElementById('errorMessage').classList.remove('hidden');
        }

        function setLoadingState(loading) {
            const button = document.getElementById('submitButton');
            const buttonText = document.getElementById('buttonText');
            const spinner = document.getElementById('buttonSpinner');

            if (loading) {
                button.disabled = true;
                buttonText.textContent = 'Passwort wird geändert...';
                spinner.classList.remove('hidden');
            } else {
                button.disabled = false;
                buttonText.textContent = 'Passwort zurücksetzen';
                spinner.classList.add('hidden');
            }
        }
    </script>
</body>
</html>`;
}

// Generate error page
function generateErrorPage(message: string): string {
	const backendUrl = process.env.MEDUSA_BACKEND_URL || '';
	const adminUrl = backendUrl ? `${backendUrl}/app` : '/app';

	return `
<!DOCTYPE html>
<html lang="de" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fehler - Basis Camp Berlin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://medusa-js-busbasisberlin-storefront.vercel.app/logo-with-font.png" alt="Basis Camp Berlin" class="h-16 w-auto mx-auto">
        </div>

        <!-- Error Message -->
        <div class="bg-red-900/50 border border-red-600 p-6 rounded-xl shadow-2xl">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-lg font-bold text-white mb-2">Fehler</h3>
                    <p class="text-sm text-red-200 mb-4">${message}</p>
                    <a href="${adminUrl}/reset-password"
                       class="inline-block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl">
                        Neuen Reset-Link anfordern
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}
