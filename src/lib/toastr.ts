export type ToastKind = 'success' | 'error' | 'info' | 'warning';

let configured = false;

async function ensureToastr() {
	if (typeof window === 'undefined') return null;

	const [{ default: jQuery }, toastrModule] = await Promise.all([
		import('jquery'),
		import('toastr')
	]);
	await import('toastr/build/toastr.min.css');

	const toastr = toastrModule.default;
	const win = window as Window & { jQuery?: typeof jQuery; $?: typeof jQuery };
	win.jQuery = jQuery;
	win.$ = jQuery;

	if (!configured) {
		toastr.options = {
			closeButton: true,
			debug: false,
			newestOnTop: true,
			progressBar: true,
			positionClass: 'toast-top-left',
			preventDuplicates: true,
			onclick: undefined,
			showDuration: 250,
			hideDuration: 250,
			timeOut: 3200,
			extendedTimeOut: 1500,
			showEasing: 'swing',
			hideEasing: 'linear',
			showMethod: 'fadeIn',
			hideMethod: 'fadeOut',
			rtl: true
		};
		configured = true;
	}

	return toastr;
}

export async function showToast(message: string, kind: ToastKind = 'info') {
	const toastr = await ensureToastr();
	if (!toastr) return;

	switch (kind) {
		case 'success':
			toastr.success(message);
			break;
		case 'error':
			toastr.error(message);
			break;
		case 'warning':
			toastr.warning(message);
			break;
		default:
			toastr.info(message);
	}
}
