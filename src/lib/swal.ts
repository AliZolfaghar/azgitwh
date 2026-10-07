import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { showToast, type ToastKind } from './toastr.js';

export type AlertKind = ToastKind;

/** Toasts via toastr; modal dialogs via SweetAlert2. */
export async function showAlert(options: {
	message: string;
	kind?: AlertKind;
	title?: string;
	toast?: boolean;
}) {
	const kind = options.kind ?? 'info';
	const asToast = options.toast ?? kind !== 'error';

	if (asToast) {
		await showToast(options.message, kind);
		return;
	}

	await Swal.fire({
		icon: kind,
		title: options.title ?? (kind === 'error' ? 'خطا' : 'توجه'),
		text: options.message,
		confirmButtonText: 'باشه',
		confirmButtonColor: '#1976d2'
	});
}

export async function confirmAction(options: {
	title: string;
	text: string;
	confirmText?: string;
	cancelText?: string;
	danger?: boolean;
}) {
	const result = await Swal.fire({
		icon: 'warning',
		title: options.title,
		text: options.text,
		showCancelButton: true,
		confirmButtonText: options.confirmText ?? 'بله',
		cancelButtonText: options.cancelText ?? 'انصراف',
		confirmButtonColor: options.danger ? '#c62828' : '#1976d2',
		cancelButtonColor: '#757575',
		reverseButtons: true,
		focusCancel: true
	});
	return result.isConfirmed;
}
