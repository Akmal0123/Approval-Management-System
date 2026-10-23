import ReportView, { ReportPageProps } from './report-view';

export default function RejectedReport(props: ReportPageProps) {
    return (
        <ReportView
            {...props}
            reportType="rejected"
            pageTitle="Rejected Document"
            pageSubtitle="Laporan dokumen yang ditolak."
            breadcrumbs={[
                { title: 'Report', href: '/report' },
                { title: 'Rejected Document', href: '/report/rejected' },
            ]}
        />
    );
}
