import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { organizerAPI, teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './OrganizerDashboard.css';
import './OrganizerOngoing.css';

const OrganizerOngoing = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'Ongoing' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamsForEvent, setTeamsForEvent] = useState([]);
  const [teamsEvent, setTeamsEvent] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState('');
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeEvent, setAnalyzeEvent] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await organizerAPI.getEvents();
      setEvents(res.data?.events || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load ongoing events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmitResetRequest = async () => {
    if (!resetReason.trim()) {
      setResetError('Please provide a reason for reset request');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await organizerAPI.submitResetRequest({ reason: resetReason });
      setResetSuccess('Request submitted! Admin will review and share your new password.');
      setResetReason('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setResetLoading(false);
    }
  };

  const openEditModal = (event) => {
    const pretty = getPrettyStatus(event);
    setEditError('');
    setEditEvent(event);
    setEditForm({ status: pretty === 'Ongoing' ? 'Ongoing' : (event.status || 'Ongoing') });
    setShowEditModal(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editEvent?._id) return;
    setEditLoading(true);
    setEditError('');
    try {
      await organizerAPI.updateEvent(editEvent._id, { status: editForm.status });
      setShowEditModal(false);
      await fetchEvents();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update event');
    } finally {
      setEditLoading(false);
    }
  };

  const fetchEventTeams = async (event) => {
    setTeamsEvent(event);
    setTeamsForEvent([]);
    setTeamsError('');
    setTeamsLoading(true);
    setShowTeamsModal(true);
    try {
      const res = await teamAPI.getEventTeams(event._id);
      setTeamsForEvent(res.data?.teams || []);
    } catch (err) {
      setTeamsError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchAnalyzeEvent = async (event) => {
    setAnalyzeEvent(null);
    setAnalyzeError('');
    setAnalyzeLoading(true);
    setShowAnalyzeModal(true);
    try {
      const res = await organizerAPI.getEvent(event._id);
      setAnalyzeEvent(res.data?.event || null);
    } catch (err) {
      setAnalyzeError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMoney = (n) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  };

  const isDateOnly = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

  const toStartMs = (v) => {
    if (!v) return NaN;
    if (isDateOnly(v)) return new Date(`${v}T00:00:00`).getTime();
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? NaN : t;
  };

  const toEndMs = (v) => {
    if (!v) return NaN;
    if (isDateOnly(v)) return new Date(`${v}T23:59:59.999`).getTime();
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? NaN : t;
  };

  const getPrettyStatus = (event) => {
    const backendStatus = event?.status;

    if (backendStatus === 'Draft') return 'Draft';
    if (!backendStatus) return 'Draft';

    if (backendStatus === 'Published') {
      const now = Date.now();
      const s = toStartMs(event?.startDate);
      const e = toEndMs(event?.endDate);

      if (Number.isFinite(s) && now < s) return 'Upcoming';
      if (Number.isFinite(s) && Number.isFinite(e) && now >= s && now <= e) return 'Ongoing';
      if (Number.isFinite(e) && now > e) return 'Closed';

      return 'Published';
    }

    return backendStatus;
  };

  const statusClass = (prettyStatus) => {
    const map = {
      Draft: 'badge-draft',
      Published: 'badge-published',
      Upcoming: 'badge-upcoming',
      Ongoing: 'badge-ongoing',
      Closed: 'badge-closed'
    };
    return map[prettyStatus] || 'badge-draft';
  };

  const ongoingEvents = (events || [])
    .map((event) => ({ ...event, __prettyStatus: getPrettyStatus(event) }))
    .filter((event) => event.__prettyStatus === 'Ongoing');

  if (loading) {
    return (
      <div className="od-page">
        <div className="od-loading">
          <div className="od-spinner" />
          <p>Loading ongoing events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="od-page">
      <nav className="od-nav">
        <div className="od-nav-left">
          <div className="od-nav-logo">Organizer Portal</div>
          <div className="od-nav-links">
            <Link to="/organizer/dashboard" className="od-nav-link">Dashboard</Link>
            <Link to="/organizer/ongoing" className="od-nav-link active">Ongoing</Link>
            <Link to="/organizer/profile" className="od-nav-link">Profile</Link>
            <button
              className="od-nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              onClick={() => setShowResetModal(true)}
            >
              Reset Password
            </button>
          </div>
        </div>
        <button className="od-nav-link" onClick={() => navigate('/organizer/dashboard')}>
          <span className="od-btn-ico" aria-hidden="true">{'\u2295'}</span>
          Create New Event
        </button>
        <button onClick={handleLogout} className="od-nav-logout">Logout</button>
      </nav>

      <div className="od-wrap">
        {error && <div className="od-alert od-alert-error">{error}</div>}
        {resetSuccess && <div className="od-alert od-alert-success">{resetSuccess}</div>}

        <header className="od-hero">
          <div>
            <h1 className="od-hero-title">Ongoing Events</h1>
          </div>
        </header>

        <section className="od-card od-events">
          <div className="od-card-head">
            <h2>Ongoing Events</h2>
          </div>

          {ongoingEvents.length === 0 ? (
            <div className="od-empty">
              <h3>No ongoing events</h3>
              <p>Events will show here once their dates include the current time.</p>
            </div>
          ) : (
            <div className="od-event-list">
              {ongoingEvents.map((event) => {
                const pretty = event.__prettyStatus;
                const fee = Number(event.registrationFee || 0);
                const limit = event.registrationLimit ?? '-';
                const registered = event.totalRegistrations ?? event.registrationsCount ?? event.registeredCount ?? null;

                return (
                  <div key={event._id} className="od-event-item">
                    <div className="od-event-top">
                      <div className="od-event-title-row">
                        <h3 className="od-event-title">{event.name}</h3>
                        <div className="od-event-badges">
                          <span className="od-badge od-badge-type">
                            {event.type === 'Merchandise' ? 'Merch' : 'Event'}
                          </span>
                          <span className={`od-badge ${statusClass(pretty)}`}>
                            {pretty}
                          </span>
                        </div>
                      </div>
                      <div className="od-event-actions">
                        <button
                          className="od-edit-btn"
                          title="Edit"
                          onClick={() => openEditModal(event)}
                        >
                          <span className="od-edit-text">Edit</span>
                        </button>
                        {event.type === 'Hackathon' && (
                          <button
                            className="od-edit-btn"
                            title="Teams"
                            onClick={() => fetchEventTeams(event)}
                          >
                            <span className="od-edit-text">Teams</span>
                          </button>
                        )}
                        <button
                          className="od-publish-btn"
                          title="Analyze"
                          onClick={() => fetchAnalyzeEvent(event)}
                        >
                          Analyze
                        </button>
                      </div>
                    </div>

                    <p className="od-event-desc">{event.description}</p>

                    <div className="od-event-meta">
                      <div className="od-meta-chip">
                        <span className="od-meta-ico" aria-hidden="true">{'\u{1F5D3}'}</span>
                        <span>{formatDateTime(event.startDate)}</span>
                      </div>

                      <div className="od-meta-chip">
                        <span>
                          {registered !== null ? `${registered} / ${limit} registered` : `${limit} seats`}
                        </span>
                      </div>

                      <div className="od-meta-chip">
                        <span>{fee > 0 ? `${'\u20B9'}${formatMoney(fee)}` : `${'\u20B9'}0 (Free)`}</span>
                      </div>
                    </div>

                    {Array.isArray(event.tags) && event.tags.length > 0 && (
                      <div className="od-tag-row">
                        {event.tags.slice(0, 5).map((tag, idx) => (
                          <span key={`${event._id}-tag-${idx}`} className="od-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Password Reset</h2>
              <button className="modal-close" onClick={() => setShowResetModal(false)}>{'\u00D7'}</button>
            </div>
            <div className="modal-form">
              {resetError && <div className="od-alert od-alert-error">{resetError}</div>}
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Tell admin why you need a password reset"
                  rows={4}
                />
              </div>
              <button
                type="button"
                className="btn-submit"
                disabled={resetLoading}
                onClick={handleSubmitResetRequest}
              >
                {resetLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editEvent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Event</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>{'\u00D7'}</button>
            </div>

            <form onSubmit={handleEditSave} className="modal-form scrollable-form">
              {editError && <div className="od-alert od-alert-error">{editError}</div>}

              {editEvent.status === 'Draft' && (
                <>
                  <div className="form-group">
                    <label>Event Name *</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Event Type *</label>
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} required>
                        <option value="Normal">Normal (Individual)</option>
                        <option value="Merchandise">Merchandise</option>
                        <option value="Hackathon">Hackathon (Team)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Eligibility *</label>
                      <select value={editForm.eligibility} onChange={(e) => setEditForm({ ...editForm, eligibility: e.target.value })} required>
                        <option value="Open to all">Open to all</option>
                        <option value="Only IIIT">Only IIIT</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date *</label>
                      <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>End Date *</label>
                      <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Reg. Deadline *</label>
                      <input type="date" value={editForm.registrationDeadline} onChange={(e) => setEditForm({ ...editForm, registrationDeadline: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Tags (comma separated)</label>
                      <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Reg. Limit *</label>
                      <input type="number" value={editForm.registrationLimit} onChange={(e) => setEditForm({ ...editForm, registrationLimit: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Reg. Fee ({'\u20B9'}) *</label>
                      <input type="number" value={editForm.registrationFee} onChange={(e) => setEditForm({ ...editForm, registrationFee: e.target.value })} required />
                    </div>
                  </div>

                  {editForm.type === 'Merchandise' && (
                    <div className="merch-fields">
                      <h4 className="sub-header">Merchandise Details</h4>
                      <div className="form-group">
                        <label>Item Details *</label>
                        <input type="text" value={editForm.itemDetails} onChange={(e) => setEditForm({ ...editForm, itemDetails: e.target.value })} required />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Stock Quantity *</label>
                          <input type="number" value={editForm.stockQuantity} onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label>Purchase Limit *</label>
                          <input type="number" value={editForm.purchaseLimit} onChange={(e) => setEditForm({ ...editForm, purchaseLimit: e.target.value })} required />
                        </div>
                      </div>
                    </div>
                  )}

                  {editForm.type === 'Hackathon' && (
                    <div className="form-group">
                      <label>Max Team Size *</label>
                      <input type="number" min="2" max="10" value={editForm.maxTeamSize || ''} onChange={(e) => setEditForm({ ...editForm, maxTeamSize: e.target.value })} required />
                    </div>
                  )}
                </>
              )}

              {editEvent.status === 'Published' && (
                <>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Reg. Deadline</label>
                      <input type="date" value={editForm.registrationDeadline} onChange={(e) => setEditForm({ ...editForm, registrationDeadline: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Reg. Limit (increase only)</label>
                      <input type="number" min={editEvent.registrationLimit} value={editForm.registrationLimit} onChange={(e) => setEditForm({ ...editForm, registrationLimit: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!editForm.closeRegistrations}
                        onChange={(e) => setEditForm({ ...editForm, closeRegistrations: e.target.checked })}
                      />
                      Close registrations
                    </label>
                  </div>
                </>
              )}

              {['Ongoing', 'Completed'].includes(editEvent.status) && (
                <div className="form-group">
                  <label>Status</label>
                  <select value={editForm.status || editEvent.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showTeamsModal && (
        <div className="modal-overlay" onClick={() => setShowTeamsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{teamsEvent?.name || 'Event'} {'\u2014'} Teams</h2>
              <button className="modal-close" onClick={() => setShowTeamsModal(false)}>{'\u00D7'}</button>
            </div>
            <div className="modal-body oo-modal-body-420">
              {teamsError && (
                <div className="od-alert od-alert-error" style={{ marginBottom: 12 }}>
                  {teamsError}
                </div>
              )}
              {teamsLoading ? (
                <p>Loading teams...</p>
              ) : teamsForEvent.length === 0 ? (
                <p>No teams yet for this event.</p>
              ) : (
                <div className="od-event-list od-team-list">
                  {teamsForEvent.map((team) => {
                    const acceptedCount = team.members.filter((m) => m.status === 'Accepted').length + 1;
                    const isComplete = team.status === 'Complete';
                    return (
                      <div key={team._id} className="od-event-item od-team-item">
                        <div className="od-event-top od-team-top">
                          <div className="od-event-title-row">
                            <div>
                              <h3 className="od-event-title od-team-title">{team.name}</h3>
                              <p className="od-team-sub">{acceptedCount}/{team.maxSize} members</p>
                            </div>
                            <span className={`od-badge od-team-status ${isComplete ? 'badge-published' : 'badge-upcoming'}`}>
                              {isComplete ? 'Complete' : 'Forming'}
                            </span>
                          </div>
                        </div>
                        <div className="od-team-members">
                          <span className="od-chip od-chip-leader">
                            Leader {'\u2022'} {team.leader?.firstName} {team.leader?.lastName}
                          </span>
                          {team.members.map((m) => (
                            <span
                              key={m._id}
                              className={`od-chip ${m.status === 'Accepted' ? 'od-chip-accepted' : 'od-chip-pending'}`}
                            >
                              {m.user?.firstName} {m.user?.lastName}
                              <span className="od-chip-dot">{'\u2022'}</span>
                              {m.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAnalyzeModal && (
        <div className="modal-overlay" onClick={() => setShowAnalyzeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{analyzeEvent?.name || 'Event'} {'\u2014'} Analysis</h2>
              <button className="modal-close" onClick={() => setShowAnalyzeModal(false)}>{'\u00D7'}</button>
            </div>
            <div className="modal-body oo-modal-body-520">
              {analyzeError && (
                <div className="od-alert od-alert-error" style={{ marginBottom: 12 }}>
                  {analyzeError}
                </div>
              )}
              {analyzeLoading || !analyzeEvent ? (
                <p>Loading...</p>
              ) : (
                <>
                  <div className="od-event-meta oo-mb-12">
                    <div className="od-meta-chip">
                      <span>{(analyzeEvent.participants || []).length} registered</span>
                    </div>
                    <div className="od-meta-chip">
                      <span>{(analyzeEvent.participants || []).filter((p) => p.attended).length} attended</span>
                    </div>
                    <div className="od-meta-chip">
                      <span>{'\u20B9'}{formatMoney(analyzeEvent.analytics?.totalRevenue || 0)}</span>
                    </div>
                  </div>
                  <div className="od-card oo-analysis-card">
                    <h3 className="oo-analysis-title">Participants</h3>
                    {(analyzeEvent.participants || []).length === 0 ? (
                      <p>No registrations yet.</p>
                    ) : (
                      <div className="od-event-list">
                        {(analyzeEvent.participants || []).map((p) => (
                          <div key={p.ticketId} className="od-event-item">
                            <div className="od-event-top">
                              <div className="od-event-title-row">
                                <h3 className="od-event-title">
                                  {p.user?.firstName} {p.user?.lastName}
                                </h3>
                                <div className="od-event-badges">
                                  <span className={`od-badge ${p.attended ? 'badge-published' : 'badge-upcoming'}`}>
                                    {p.attended ? 'Attended' : 'Not Attended'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="od-event-meta">
                              <div className="od-meta-chip">
                                <span>{p.ticketId}</span>
                              </div>
                              <div className="od-meta-chip">
                                <span>{p.user?.email}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerOngoing;
