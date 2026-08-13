import toast from 'react-hot-toast';

// Custom toast styles and utilities - Elegant Corner Notifications
export const toastStyles = {
    success: {
        background: '#FFFFFF',
        color: '#065F46',
        borderLeft: '5px solid #10B981',
        borderTop: '1px solid #F0FDF4',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'left' as const,
        maxWidth: '420px',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 12px 24px -6px rgba(16, 185, 129, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
    },
    error: {
        background: '#FFFFFF',
        color: '#9F1239',
        borderLeft: '5px solid #F43F5E',
        borderTop: '1px solid #FFF1F2',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'left' as const,
        maxWidth: '420px',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 12px 24px -6px rgba(244, 63, 94, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
    },
    info: {
        background: '#FFFFFF',
        color: '#1E40AF',
        borderLeft: '5px solid #3B82F6',
        borderTop: '1px solid #EFF6FF',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'left' as const,
        maxWidth: '420px',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 12px 24px -6px rgba(59, 130, 246, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
    },
    warning: {
        background: '#FFFFFF',
        color: '#92400E',
        borderLeft: '5px solid #F59E0B',
        borderTop: '1px solid #FFFBEB',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'left' as const,
        maxWidth: '420px',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 12px 24px -6px rgba(245, 158, 11, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
    },
};

// Custom toast functions with consistent styling - Hardcoded bottom-right position
export const showToast = {
    success: (message: string, duration = 4000) => {
        toast.success(message, {
            duration,
            position: 'bottom-right',
            style: toastStyles.success,
        });
    },

    error: (message: string, duration = 5000) => {
        toast.error(message, {
            duration,
            position: 'bottom-right',
            style: toastStyles.error,
        });
    },

    info: (message: string, duration = 4000) => {
        toast(message, {
            duration,
            position: 'bottom-right',
            style: toastStyles.info,
            icon: 'ℹ️',
        });
    },

    warning: (message: string, duration = 4000) => {
        toast(message, {
            duration,
            position: 'bottom-right',
            style: toastStyles.warning,
            icon: '⚠️',
        });
    },

    // Real-time specific toasts
    realtime: {
        created: (itemName: string, itemType = 'item') => {
            toast.success(`✅ New ${itemType} "${itemName}" has been created!`, {
                duration: 4000,
                position: 'bottom-right',
                style: toastStyles.success,
            });
        },

        updated: (itemName: string, itemType = 'item') => {
            toast.success(`📝 ${itemType} "${itemName}" has been updated!`, {
                duration: 4000,
                position: 'bottom-right',
                style: toastStyles.info,
            });
        },

        deleted: (itemType = 'Item') => {
            toast.success(`🗑️ ${itemType} has been deleted successfully!`, {
                duration: 4000,
                position: 'bottom-right',
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
