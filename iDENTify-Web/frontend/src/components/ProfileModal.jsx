import React from 'react';

function ProfileModal({ isOpen, onClose, user, role }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 9999
        }}>
            <div style={{
                background: '#fff', padding: '24px', borderRadius: '12px',
                minWidth: '320px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                position: 'relative', color: '#334e68', fontFamily: 'sans-serif'
            }}>
                {/* Close 'X' Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '12px', right: '15px',
                        background: 'none', border: 'none', fontSize: '1.5rem',
                        cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1
                    }}
                >
                    &times;
                </button>
                
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem' }}>
                    Profile Details
                </h3>
                
                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666' }}>Name</p>
                    <p style={{ margin: 0, fontWeight: '500', fontSize: '1rem' }}>{user?.name || 'N/A'}</p>
                </div>

                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666' }}>Role</p>
                    <p style={{ margin: 0, fontWeight: '500', fontSize: '1rem' }}>
                        {role === 'dentist' ? 'Dentist' : 'Dental Aide'}
                    </p>
                </div>
                
                <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666' }}>Email</p>
                    <p style={{ margin: 0, fontWeight: '500', fontSize: '1rem' }}>{user?.email || 'N/A'}</p>
                </div>
                
                <button 
                    onClick={onClose}
                    style={{
                        width: '100%', background: '#334e68', color: '#fff', border: 'none',
                        padding: '10px 0', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

export default ProfileModal;