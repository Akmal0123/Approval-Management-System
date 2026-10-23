import Swal from 'sweetalert2';

// Popup dialog & alert di tengah (center) dengan icon modern & rapi
export const showSwalToast = {
    error: (title: string, message?: string) => {
        return Swal.fire({
            icon: 'error',
            iconHtml: `
                <div class="custom-swal-icon error">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            `,
            title: title || 'Dokumen Tidak Ditemukan!',
            text: message || 'Dokumen yang Anda cari tidak tersedia atau ID tidak terdaftar.',
            position: 'center',
            showConfirmButton: true,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#4ba443',
            timer: 4500,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-custom-center',
                icon: 'swal2-custom-icon-clean',
            },
            didOpen: (popup) => {
                popup.onmouseenter = Swal.stopTimer;
                popup.onmouseleave = Swal.resumeTimer;
            },
        });
    },

    success: (title: string, message?: string) => {
        return Swal.fire({
            icon: 'success',
            iconHtml: `
                <div class="custom-swal-icon success">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            `,
            title: title || 'Berhasil!',
            text: message || '',
            position: 'center',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#4ba443',
            timer: 3500,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-custom-center',
                icon: 'swal2-custom-icon-clean',
            },
            didOpen: (popup) => {
                popup.onmouseenter = Swal.stopTimer;
                popup.onmouseleave = Swal.resumeTimer;
            },
        });
    },

    warning: (title: string, message?: string) => {
        return Swal.fire({
            icon: 'warning',
            iconHtml: `
                <div class="custom-swal-icon warning">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
            `,
            title: title || 'Peringatan',
            text: message || '',
            position: 'center',
            showConfirmButton: true,
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#4ba443',
            timer: 4000,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-custom-center',
                icon: 'swal2-custom-icon-clean',
            },
            didOpen: (popup) => {
                popup.onmouseenter = Swal.stopTimer;
                popup.onmouseleave = Swal.resumeTimer;
            },
        });
    },

    info: (title: string, message?: string) => {
        return Swal.fire({
            icon: 'info',
            iconHtml: `
                <div class="custom-swal-icon info">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
            `,
            title: title,
            text: message || '',
            position: 'center',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#4ba443',
            timer: 3500,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-custom-center',
                icon: 'swal2-custom-icon-clean',
            },
            didOpen: (popup) => {
                popup.onmouseenter = Swal.stopTimer;
                popup.onmouseleave = Swal.resumeTimer;
            },
        });
    },
};

export default showSwalToast;
