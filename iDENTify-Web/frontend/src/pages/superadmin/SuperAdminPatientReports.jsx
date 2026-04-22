import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';

function SuperAdminPatientReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await api.getPatientReports();
            setReports(data || []);
        } catch (error) {
            console.error("Failed to load patient reports", error);
            toast.error("Failed to load patient reports");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (report, newStatus) => {
        setProcessingId(report.id);
        try {
            await api.updatePatientReportStatus(report.id, newStatus);
            toast.success(`Report marked as ${newStatus}`);
            loadReports();
        } catch (error) {
            toast.error("Failed to update status");
            setProcessingId(null);
        }
    };

    const handleSuspendDentist = async (report, suspend) => {
        setProcessingId(report.id);
        try {
            await api.suspendDentist(report.dentist_id, suspend);
            toast.success(`Dentist ${suspend ? 'suspended' : 'unsuspended'} successfully`);
            loadReports();
        } catch (error) {
            toast.error("Failed to update dentist suspension status");
            setProcessingId(null);
        }
    };

    return (
        <section className="animation-fade-in" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '5px' }}>Patient Reports</h1>
                    <p style={{ color: '#64748b' }}>Review issues reported by patients and manage dentist standing.</p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading reports...</div>
            ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                    No patient reports found.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {reports.map(report => (
                        <div key={report.id} style={{ 
                            background: '#fff', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px', 
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Report #{report.id}</h3>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', gap: '15px' }}>
                                        <span><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString()}</span>
                                        <span><strong>Patient:</strong> {report.patient_name || report.patient_full_name || `ID: ${report.patient_id}`}</span>
                                    </div>
                                </div>
                                <div>
                                    <span style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        background: report.status === 'valid' ? '#dcfce7' : 
                                                  report.status === 'dismissed' ? '#f1f5f9' : 
                                                  report.status === 'reviewed' ? '#dbeafe' : '#fef9c3',
                                        color: report.status === 'valid' ? '#166534' : 
                                               report.status === 'dismissed' ? '#475569' : 
                                               report.status === 'reviewed' ? '#1e40af' : '#854d0e'
                                    }}>
                                        {report.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Reported Dentist</div>
                                        <div style={{ fontWeight: '500', color: '#334155' }}>{report.dentist_name || `ID: ${report.dentist_id}`}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Branch</div>
                                        <div style={{ fontWeight: '500', color: '#334155' }}>{report.branch_name || 'N/A'}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Dentist Status</div>
                                        <div style={{ fontWeight: 'bold', color: report.is_suspended ? '#ef4444' : '#10b981' }}>
                                            {report.is_suspended ? 'Suspended' : 'Active'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Reason</div>
                                    <div style={{ color: '#1e293b', lineHeight: '1.5' }}>{report.reason}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => handleUpdateStatus(report, 'valid')}
                                        disabled={processingId === report.id || report.status === 'valid'}
                                        style={{ padding: '6px 12px', borderRadius: '4px', background: report.status === 'valid' ? '#dcfce7' : '#fff', border: '1px solid #22c55e', color: '#166534', cursor: processingId === report.id ? 'not-allowed' : 'pointer' }}
                                    >
                                        Mark Valid
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus(report, 'dismissed')}
                                        disabled={processingId === report.id || report.status === 'dismissed'}
                                        style={{ padding: '6px 12px', borderRadius: '4px', background: report.status === 'dismissed' ? '#f1f5f9' : '#fff', border: '1px solid #cbd5e1', color: '#475569', cursor: processingId === report.id ? 'not-allowed' : 'pointer' }}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                                <div>
                                    {!report.is_suspended ? (
                                        <button 
                                            onClick={() => handleSuspendDentist(report, true)}
                                            disabled={processingId === report.id}
                                            style={{ padding: '6px 12px', borderRadius: '4px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 'bold', cursor: processingId === report.id ? 'not-allowed' : 'pointer' }}
                                        >
                                            Suspend Dentist
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleSuspendDentist(report, false)}
                                            disabled={processingId === report.id}
                                            style={{ padding: '6px 12px', borderRadius: '4px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 'bold', cursor: processingId === report.id ? 'not-allowed' : 'pointer' }}
                                        >
                                            Unsuspend Dentist
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default SuperAdminPatientReports;