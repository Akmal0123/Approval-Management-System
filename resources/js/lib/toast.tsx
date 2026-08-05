import toast from 'react-hot-toast';

// Custom toast styles and utilities
export const toastStyles = {
    success: {
        background: '#F0FDF4',
        color: '#166534',
        border: '1px solid #BBF7D0',
        textAlign: 'center' as const,
        maxWidth: '400px',
        borderRadius: '8px',
    },
    error: {
        background: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FECACA',
        textAlign: 'center' as const,
        maxWidth: '400px',
        borderRadius: '8px',
    },
    info: {
        background: '#EFF6FF',
        color: '#1E40AF',
        border: '1px solid #BFDBFE',
        textAlign: 'center' as const,
        maxWidth: '400px',
        borderRadius: '8px',
    },
    warning: {
        background: '#FFFBEB',
        color: '#D97706',
        border: '1px solid #FED7AA',
        textAlign: 'center' as const,
        maxWidth: '400px',
        borderRadius: '8px',
    },
};

// Custom toast functions with consistent styling
export const showToast = {
    success: (message: string, duration = 4000) => {
        toast.success(message, {
            duration,
            style: toastStyles.success,
        });
    },

    error: (message: string, duration = 5000) => {
        toast.error(message, {
            duration,
            style: toastStyles.error,
        });
    },

    info: (message: string, duration = 4000) => {
        toast(message, {
            duration,
            style: toastStyles.info,
            icon: 'ℹ️',
        });
    },

    warning: (message: string, duration = 4000) => {
        toast(message, {
            duration,
            style: toastStyles.warning,
            icon: '⚠️',
        });
    },

    // Real-time specific toasts
    realtime: {
        created: (itemName: string, itemType = 'item') => {
            toast.success(`✅ New ${itemType} "${itemName}" has been created!`, {
                duration: 4000,
                style: toastStyles.success,
            });
        },

        updated: (itemName: string, itemType = 'item') => {
            toast.success(`📝 ${itemType} "${itemName}" has been updated!`, {
                duration: 4000,
                style: toastStyles.info,
            });
        },

        deleted: (itemType = 'Item') => {
            toast.success(`🗑️ ${itemType} has been deleted successfully!`, {
                duration: 4000,
                style: {
                    background: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                },
            });
        },
    },

    // Delete confirmation with danger styling
    confirmDelete: (itemName: string, onConfirm: () => void, itemType = 'item') => {
        toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-red-500">🗑️</span>
                        <span className="font-medium">Delete {itemType}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete <strong>"{itemName}"</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            className="rounded-md bg-gray-100 px-3 py-1 text-xs transition-colors hover:bg-gray-200"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            Cancel
                        </button>
                        <button
                            className="rounded-md bg-red-500 px-3 py-1 text-xs text-white transition-colors hover:bg-red-600"
                            onClick={() => {
                                toast.dismiss(t.id);
                                onConfirm();
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ),
            {
                duration: Infinity,
                style: {
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    minWidth: '320px',
                    maxWidth: '400px',
                    textAlign: 'left' as const,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
            },
        );
    },
};

export default showToast;
