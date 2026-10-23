import ReportView, { ReportPageProps } from './report-view';

export default function GeneralReport(props: ReportPageProps) {
    return (
        <ReportView
            {...props}
            reportType="general"
            pageTitle="Report Dokumen"
            pageSubtitle="Laporan dokumen berdasarkan company, aplikasi, dan transaksi."
            breadcrumbs={[
                { title: 'Report', href: '/report' },
            ]}
        />
    );
}
