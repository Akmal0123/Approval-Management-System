import ReportView, { ReportPageProps } from './report-view';

export default function UnapprovedReport(props: ReportPageProps) {
    return (
        <ReportView
            {...props}
            reportType="unapproved"
            pageTitle="Unapprove Dokumen"
            pageSubtitle="Laporan dokumen yang belum disetujui."
            breadcrumbs={[
                { title: 'Report', href: '/report' },
                { title: 'Unapprove Dokumen', href: '/report/unapproved' },
            ]}
        />
    );
}
