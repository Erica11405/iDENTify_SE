import React from 'react';
import Reports from '../aide/Reports';

function SuperAdminReports() {
    return (
        <Reports
            pageTitle="Super Admin Reports"
            pageSubtitle="Clinic-wide analytics, dentist performance, and export center."
            showSummaryCards={false}
        />
    );
}

export default SuperAdminReports;
