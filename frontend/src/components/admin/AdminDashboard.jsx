import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [organizers, setOrganizers] = useState([]);
  const [passwordResets, setPasswordResets] = useState([]);
  const [stats, setStats] = useState({
    totalOrganizers: 0,
    activeOrganizers: 0,
    totalParticipants: 0,
    totalEvents: 0,
    pendingResets: 0
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New organizer form
  const [newOrganizer, setNewOrganizer] = useState({
    name: '',
    email: '',
    category: 'Technical',
    description: '',
    contactEmail: '',
    contactNumber: ''
  });

  // Security monitoring state
  const [securityEvents, setSecurityEvents] = useState([]);
  const [blockedIPs, setBlockedIPs]         = useState([]);
  const [blockIPInput, setBlockIPInput]     = useState('');
  const [blockReason, setBlockReason]       = useState('');
  const [resetComment, setResetComment]     = useState({});
  const [approvedPassword, setApprovedPassword] = useState(null);
  const [resetFilter, setResetFilter]       = useState('All');
  const [eventFilter, setEventFilter]       = useState('ALL');

  const fetchSecurityData = useCallback(async () => {
    try {
      const [evRes, blRes] = await Promise.all([
        adminAPI.getSecurityEvents(),
        adminAPI.getBlockedIPs()
      ]);
      setSecurityEvents(evRes.data.events  || []);
      setBlockedIPs(blRes.data.blocked || []);
    } catch (err) {
      console.error('Security fetch error:', err);
    }
  }, []);

  const handleManualBlock = async () => {
    if (!blockIPInput.trim()) return;
    try {
      await adminAPI.blockIP({ ip: blockIPInput.trim(), reason: blockReason || 'Manual block' });
      setBlockIPInput(''); setBlockReason('');
      fetchSecurityData();
    } catch (err) {
      setError('Failed to block IP');
    }
  };

  const handleUnblock = async (ip) => {
    try {
      await adminAPI.unblockIP(ip);
      fetchSecurityData();
    } catch (err) {
      setError('Failed to unblock IP');
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch organizers
      const orgResponse = await adminAPI.getOrganizers();
      setOrganizers(orgResponse.data.organizers || []);
      
      // Fetch stats
      const statsResponse = await adminAPI.getStats();
      setStats(statsResponse.data.stats || stats);
      
      const resetResponse = await adminAPI.getPasswordResets();
      setPasswordResets(resetResponse.data.requests || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    }
  }, [stats]);

  useEffect(() => {
    fetchDashboardData();
    fetchSecurityData();
  }, [fetchDashboardData, fetchSecurityData]);

  const handleApproveReset = async (requestId) => {
    const comment = resetComment[requestId] || '';
    try {
      const res = await adminAPI.approvePasswordReset(requestId, { adminComment: comment });
      setApprovedPassword({ password: res.data.newPassword, email: res.data.organizerEmail, name: res.data.organizerName });
      setSuccess();
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectReset = async (requestId) => {
    const comment = resetComment[requestId] || '';
    try {
      await adminAPI.rejectPasswordReset(requestId, { adminComment: comment });
      setSuccess('Password reset request rejected');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddOrganizer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminAPI.createOrganizer(newOrganizer);

      setSuccess(`Organizer created! Email: ${response.data.email}, Password: ${response.data.tempPassword}`);
      setShowAddModal(false);
      setNewOrganizer({
        name: '',
        email: '',
        category: 'Technical',
        description: '',
        contactEmail: '',
        contactNumber: ''
      });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create organizer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganizer = async (organizerId) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) return;

    try {
      await adminAPI.deleteOrganizer(organizerId);
      setSuccess('Organizer deleted successfully');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete organizer');
    }
  };

  const handleToggleActive = async (organizerId, currentStatus) => {
    try {
      await adminAPI.toggleOrganizer(organizerId);
      setSuccess('Organizer status updated');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <h2>Dashboard Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>{stats.totalOrganizers}</h3>
            <p>Total Organizers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>{stats.activeOrganizers}</h3>
            <p>Active Organizers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>{stats.totalParticipants}</h3>
            <p>Total Participants</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>{stats.totalEvents}</h3>
            <p>Total Events</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>{stats.pendingResets}</h3>
            <p>Pending Password Resets</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => setActiveTab('organizers')} className="action-btn">
            Manage Organizers
          </button>
          <button onClick={() => setShowAddModal(true)} className="action-btn primary">
            Add New Organizer
          </button>
          <button onClick={() => setActiveTab('resets')} className="action-btn">
            Password Reset Requests
          </button>
        </div>
      </div>


    <div className="organizers-section">
      <div className="section-header">
        <h2>Manage Organizers</h2>
      </div>

      {organizers.length === 0 ? (
        <div className="empty-state">
          <p>No organizers found. Create one to get started!</p>
        </div>
      ) : (
        <div className="organizers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => (
                <tr key={org._id}>
                  <td>
                    <strong>{org.name}</strong>
                  </td>
                  <td>{org.email}</td>
                  <td>
                    <span className={`category-badge ${org.category.toLowerCase()}`}>
                      {org.category}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${org.isActive ? 'active' : 'inactive'}`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleToggleActive(org._id, org.isActive)}
                      className="btn-toggle"
                      title={org.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteOrganizer(org._id)}
                      className="btn-delete"
                      title="Delete"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );

  const renderOrganizers = () => (
    <div className="organizers-section">
      <div className="section-header">
        <h2>Manage Organizers</h2>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          Add New Organizer
        </button>
      </div>

      {organizers.length === 0 ? (
        <div className="empty-state">
          <p>No organizers found. Create one to get started!</p>
        </div>
      ) : (
        <div className="organizers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => (
                <tr key={org._id}>
                  <td>
                    <strong>{org.name}</strong>
                  </td>
                  <td>{org.email}</td>
                  <td>
                    <span className={`category-badge ${org.category.toLowerCase()}`}>
                      {org.category}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${org.isActive ? 'active' : 'inactive'}`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleToggleActive(org._id, org.isActive)}
                      className="btn-toggle"
                      title={org.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteOrganizer(org._id)}
                      className="btn-delete"
                      title="Delete"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPasswordResets = () => {
    const filtered = resetFilter === 'All' ? passwordResets : passwordResets.filter(r => r.status === resetFilter);
    return (
    <div className="resets-section">
      <div className="section-header">
        <h2>Password Reset Requests</h2>
        <div className="reset-filters">
          {['All','Pending','Approved','Rejected'].map(f => (
            <button key={f} className={`filter-btn ${resetFilter === f ? 'active' : ''}`} onClick={() => setResetFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {approvedPassword && (
        <div className="approved-password-banner">
          <h3>Password Reset Approved :)</h3>
          <p><strong>Organizer:</strong> {approvedPassword.name} ({approvedPassword.email})</p>
          <p><strong>New Password:</strong> <code className="new-password-code">{approvedPassword.password}</code></p>
          <p className="pw-warning">Copy this password now and share it with the organizer. It won't be shown again.</p>
          <button className="btn-cancel" onClick={() => setApprovedPassword(null)}>Dismiss</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No {resetFilter !== 'All' ? resetFilter.toLowerCase() : ''} password reset requests</p></div>
      ) : (
        <div className="resets-list">
          {filtered.map((reset) => (
            <div key={reset._id} className={`reset-card reset-${reset.status.toLowerCase()}`}>
              <div className="reset-card-header">
                <div>
                  <h3>{reset.organizerName}</h3>
                  <p className="reset-email">{reset.organizerEmail}</p>
                  <p className="reset-club">Club: {reset.clubName}</p>
                </div>
                <span className={`status-badge ${reset.status === 'Pending' ? 'pending' : reset.status === 'Approved' ? 'active' : 'inactive'}`}>
                  {reset.status}
                </span>
              </div>
              <div className="reset-reason-box">
                <strong>Reason:</strong>
                <p>{reset.reason}</p>
              </div>

              {reset.status === 'Pending' && (
                <div className="reset-action-area">
                  <textarea
                    className="reset-comment-input"
                    value={resetComment[reset._id] || ''}
                    onChange={e => setResetComment(prev => ({ ...prev, [reset._id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="reset-actions">
                    <button className="btn-approve" onClick={() => handleApproveReset(reset._id)}>Approve</button>
                    <button className="btn-reject"  onClick={() => handleRejectReset(reset._id)}>Reject</button>
                  </div>
                </div>
              )}

              {reset.status !== 'Pending' && reset.adminComment && (
                <div className="admin-comment-box">
                  <strong>Admin Comment:</strong> {reset.adminComment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  const EVENT_COLORS = {
    FAILED_ATTEMPT: '#b00000', AUTO_BLOCK: '#7c1010', MANUAL_BLOCK: '#4a0000',
    BLOCKED_REQUEST: '#cc4400', RATE_LIMITED: '#cc7700', UNBLOCK: '#1a6b30',
    SUCCESS: '#1a6b30'
  };

  const renderSecurity = () => {
    const filtered = eventFilter === 'ALL'
      ? securityEvents
      : securityEvents.filter(e => e.type === eventFilter);

    return (
      <div className="security-section">
        <div className="section-header">
          <h2>Security Monitor</h2>
          <button onClick={fetchSecurityData} className="action-btn">Refresh</button>
        </div>

        {/* Block IP manually */}
        <div className="security-block-form">
          <h3>Manual IP Block</h3>
          <div className="block-inputs">
            <input
              type="text" 
              value={blockIPInput} onChange={e => setBlockIPInput(e.target.value)}
              className="block-ip-input"
            />
            <input
              type="text" 
              value={blockReason} onChange={e => setBlockReason(e.target.value)}
              className="block-reason-input"
            />
            <button onClick={handleManualBlock} className="action-btn reject">Block IP</button>
          </div>
        </div>

        {/* Blocked IPs */}
        <div className="blocked-ips-section">
          <h3>Blocked IPs ({blockedIPs.length})</h3>
          {blockedIPs.length === 0 ? (
            <p className="empty-state">No IPs currently blocked.</p>
          ) : (
            <div className="organizers-table">
              <table>
                <thead>
                  <tr>
                    <th>IP Address</th><th>Reason</th><th>Type</th>
                    <th>Blocked At</th><th>Expires</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIPs.map((b, i) => (
                    <tr key={i}>
                      <td><code>{b.ip}</code></td>
                      <td>{b.reason}</td>
                      <td>
                        <span className={`status-badge ${b.permanent ? 'inactive' : 'active'}`}>
                          {b.permanent ? 'Permanent' : 'Temporary'}
                        </span>
                      </td>
                      <td>{new Date(b.blockedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{b.expiresAt ? new Date(b.expiresAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>
                        <button onClick={() => handleUnblock(b.ip)} className="action-btn approve">
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Event log */}
        <div className="security-events-section">
          <div className="events-header">
            <h3>Security Event Log ({filtered.length})</h3>
            <div className="event-filters">
              {['ALL','FAILED_ATTEMPT','AUTO_BLOCK','BLOCKED_REQUEST','RATE_LIMITED','SUCCESS','UNBLOCK'].map(f => (
                <button key={f}
                  className={`filter-btn ${eventFilter === f ? 'active' : ''}`}
                  onClick={() => setEventFilter(f)}
                >
                  {f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="empty-state">No events recorded yet.</p>
          ) : (
            <div className="events-table organizers-table">
              <table>
                <thead>
                  <tr><th>Time</th><th>Type</th><th>IP</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((ev, i) => (
                    <tr key={i}>
                      <td style={{whiteSpace:'nowrap'}}>{new Date(ev.ts).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className="event-type-badge" style={{
                          color: EVENT_COLORS[ev.type] || '#333',
                          fontWeight: 700, fontSize: 11, textTransform: 'uppercase'
                        }}>
                          {ev.type.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td><code>{ev.ip}</code></td>
                      <td style={{color:'#555', fontSize:12}}>{ev.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <h1>Felicity Admin</h1>
        </div>
        <div className="navbar-user">
          <button onClick={handleLogout} className="btn-logout">
            Logout 
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-content">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`menu-item ${activeTab === 'organizers' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizers')}
            >
              Manage Organizers
            </button>
            <button
              className={`menu-item ${activeTab === 'resets' ? 'active' : ''}`}
              onClick={() => setActiveTab('resets')}
            >
              Password Resets
              {stats.pendingResets > 0 && (
                <span className="badge">{stats.pendingResets}</span>
              )}
            </button>
            <button
              className={`menu-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => { setActiveTab('security'); fetchSecurityData(); }}
            >
              Security
              {blockedIPs.length > 0 && (
                <span className="badge">{blockedIPs.length}</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <main className="admin-main">
          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              {error}
              <button onClick={() => setError('')} className="alert-close">x</button>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              {success}
              <button onClick={() => setSuccess('')} className="alert-close">x</button>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === 'overview'   && renderOverview()}
          {activeTab === 'organizers' && renderOrganizers()}
          {activeTab === 'resets'     && renderPasswordResets()}
          {activeTab === 'security'   && renderSecurity()}
        </main>
      </div>

      {/* Add Organizer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Organizer</h2>
              <button onClick={() => setShowAddModal(false)} className="modal-close">x</button>
            </div>

            <form onSubmit={handleAddOrganizer} className="modal-form">
              <div className="form-group">
                <label>Organizer Name *</label>
                <input
                  type="text"
                  value={newOrganizer.name}
                  onChange={(e) => setNewOrganizer({...newOrganizer, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Email *</label>
                <input
                  type="email"
                  value={newOrganizer.email}
                  onChange={(e) => setNewOrganizer({...newOrganizer, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={newOrganizer.category}
                  onChange={(e) => setNewOrganizer({...newOrganizer, category: e.target.value})}
                  required
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Social">Social</option>
                  <option value="Academic">Academic</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newOrganizer.description}
                  onChange={(e) => setNewOrganizer({...newOrganizer, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={newOrganizer.contactEmail}
                  onChange={(e) => setNewOrganizer({...newOrganizer, contactEmail: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  value={newOrganizer.contactNumber}
                  onChange={(e) => setNewOrganizer({...newOrganizer, contactNumber: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? 'Creating...' : 'Create Organizer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
