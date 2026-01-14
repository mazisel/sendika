export const formatDateSafe = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '-';
    }
};

export const formatCurrencySafe = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    try {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    } catch (e) {
        return `${amount} TL`;
    }
};
