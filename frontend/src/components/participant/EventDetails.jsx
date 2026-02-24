import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantAPI, teamAPI } from '../../services/api';
import TeamChat from './TeamChat';
import './EventDetails.css';

// ─────────────────────────────────────────────────────────────
//  TeamRegistrationModal  (FIXED VERSION with proper error handling)
// ─────────────────────────────────────────────────────────────
const TeamRegistrationModal = ({ event, onClose, onSuccess }) => {
  const [mode, setMode]             = useState(null); // 'create' | 'join'
  const [myTeam, setMyTeam]         = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // create-team form
  const [teamName, setTeamName] = useState('');
  const [maxSize, setMaxSize]   = useState(event?.teamDetails?.maxTeamSize || 4);

  // join-team form
  const [inviteCode, setInviteCode] = useState('');
  const [preview, setPreview]       = useState(null);
  const [showChat, setShowChat]     = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchMyTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const res = await teamAPI.getMyTeam(event._id);
      if (res.data?.success) setMyTeam(res.data.team);
      else setMyTeam(null);
    } catch (err) {
      console.error('Fetch team error:', err);
      setMyTeam(null);
    }
    setLoadingTeam(false);
  }, [event._id]);

  useEffect(() => { 
    fetchMyTeam(); 
  }, [fetchMyTeam]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (err) {
      console.error('Error parsing user from localStorage:', err);
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const res = await teamAPI.createTeam({
        eventId: event._id,
        teamName,
        maxSize: Number(maxSize)
      });
      if (!res.data?.success) throw new Error(res.data?.message);
      setSuccess(res.data.message);
      setMode(null);
      fetchMyTeam();
    } catch (err) {
      console.error('Create team error:', err);
      setError(err.message || 'Failed to create team');
    }
    setSubmitting(false);
  };

  const handlePreview = async () => {
    setError(''); setPreview(null);
    if (!inviteCode.trim()) return setError('Enter an invite code');
    try {
      const res = await teamAPI.previewTeam(inviteCode.trim());
      if (!res.data?.success) throw new Error(res.data?.message || 'Invalid invite code or team not found');
      setPreview(res.data.team);
    } catch (err) {
      console.error('Preview team error:', err);
      setError(err.message || 'Invalid invite code');
    }
  };

  const handleJoin = async () => {
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const res = await teamAPI.joinTeam({ inviteCode: inviteCode.trim() });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to join team');
      }
      setSuccess(res.data.message);
      setMode(null);
      setPreview(null);
      fetchMyTeam();
    } catch (err) {
      console.error('Join team error:', err);
      setError(err.message || 'Failed to join team');
    }
    setSubmitting(false);
  };

  const handleDeleteTeam = async () => {
    if (!myTeam?._id) return;
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const res = await teamAPI.deleteTeam(myTeam._id);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to delete team');
      }
      setSuccess(res.data.message || 'Team deleted');
      setMyTeam(null);
      setMode(null);
      setPreview(null);
      setInviteCode('');
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Delete team error:', err);
      setError(err.message || 'Failed to delete team');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>Team Registration</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#555', fontWeight: 400 }}>{event.name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error   && <div className="alert alert-error"   style={{ marginBottom: 14 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

          {loadingTeam ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#555', fontSize: 13 }}>
              Loading team info…
            </div>
          ) : myTeam ? (
            /* ── Already in a team ── */
            <div>
              <div className="team-card">
                <div className="team-card-header">
                  <h3>{myTeam.name}</h3>
                  <span className={`team-status-badge team-status-${myTeam.status.toLowerCase()}`}>
                    {myTeam.status}
                  </span>
                </div>

                {/* Invite code (only for leader while Forming) */}
                {myTeam.status === 'Forming' && (
                  <div className="invite-code-box">
                    <p className="invite-code-label">Invite Code — share with teammates</p>
                    <div className="invite-code-display">{myTeam.inviteCode}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn-copy"
                        onClick={() => {
                          navigator.clipboard.writeText(myTeam.inviteCode);
                          setSuccess('Copied to clipboard!');
                        }}
                      >
                        Copy Code
                      </button>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        {myTeam.members.filter(m => m.status === 'Accepted').length + 1} / {myTeam.maxSize} members joined
                      </span>
                      {myTeam.leader?._id === (JSON.parse(localStorage.getItem('user') || '{}')._id || JSON.parse(localStorage.getItem('user') || '{}').id) && (
                        <button
                          className="btn-cancel"
                          onClick={handleDeleteTeam}
                          disabled={submitting}
                        >
                          Delete Team
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {myTeam.status === 'Complete' && (
                  <div>
                    <div className="team-complete-banner">
                      Team is complete! Tickets have been sent to all member's emails.
                    </div>
                    <button
                      className="btn-register"
                      style={{ width: '100%', marginTop: 12 }}
                      onClick={() => setShowChat(s => !s)}
                    >
                      {showChat ? 'Hide Team Chat' : 'Open Team Chat'}
                    </button>
                    {showChat && currentUser && (
                      <div style={{ marginTop: 16 }}>
                        <TeamChat team={myTeam} currentUser={currentUser} />
                      </div>
                    )}
                  </div>
                )}

                {/* Members table */}
                <table className="team-members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Leader row */}
                    <tr>
                      <td>{myTeam.leader?.firstName} {myTeam.leader?.lastName}</td>
                      <td style={{ fontSize: 12, color: '#555' }}>{myTeam.leader?.email}</td>
                      <td><span className="role-badge role-leader">Leader</span></td>
                      <td><span className="member-status member-status-accepted">Accepted</span></td>
                    </tr>
                    {/* Member rows */}
                    {myTeam.members.map((m, i) => (
                      <tr key={i}>
                        <td>{m.user?.firstName} {m.user?.lastName}</td>
                        <td style={{ fontSize: 12, color: '#555' }}>{m.user?.email}</td>
                        <td><span className="role-badge role-member">Member</span></td>
                        <td>
                          <span className={`member-status member-status-${m.status.toLowerCase()}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── No team yet ── */
            <div>
              {!mode && (
                <div className="team-choice">
                  <p className="team-choice-hint">
                    This is a team event. You need to either create a new team or join an
                    existing one using an invite code before the registration deadline.
                  </p>
                  <div className="team-choice-btns">
                    <button className="btn-register" onClick={() => setMode('create')}>
                      Create a New Team
                    </button>
                    <button
                      className="btn-cancel"
                      style={{ flex: 1 }}
                      onClick={() => setMode('join')}
                    >
                      Join with Invite Code
                    </button>
                  </div>
                </div>
              )}

              {mode === 'create' && (
                <form onSubmit={handleCreate}>
                  <h3 className="sub-section-title">Create Team</h3>
                  <div className="form-field">
                    <label>Team Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Team Size (including you) <span className="required">*</span></label>
                    <input
                      type="number" min={2} max={10}
                      value={maxSize}
                      onChange={e => setMaxSize(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>
                      Min 2, Max 10
                    </span>
                  </div>
                  <div className="modal-footer" style={{ padding: '14px 0 0' }}>
                    <button type="button" className="btn-cancel" onClick={() => setMode(null)}>
                      Back
                    </button>
                    <button type="submit" className="btn-confirm-register" disabled={submitting}>
                      {submitting ? 'Creating…' : 'Create Team'}
                    </button>
                  </div>
                </form>
              )}

              {mode === 'join' && (
                <div>
                  <h3 className="sub-section-title">Join with Invite Code</h3>
                  <div className="form-field">
                    <label>Invite Code <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value.toUpperCase())}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={handlePreview}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {preview && (
                    <div className="team-preview-card">
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>{preview.name}</p>
                      <p style={{ margin: '0 0 3px', fontSize: 13, color: '#555' }}>
                        Event: {preview.event?.name}
                      </p>
                      <p style={{ margin: '0 0 3px', fontSize: 13, color: '#555' }}>
                        Members: {preview.memberCount} / {preview.maxSize}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
                        Leader: {preview.leader?.firstName} {preview.leader?.lastName}
                      </p>
                      {preview.status !== 'Forming' && (
                        <p style={{ marginTop: 6, fontSize: 12, color: '#111111', fontWeight: 600 }}>
                          This team is no longer accepting members.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="modal-footer" style={{ padding: '14px 0 0' }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => { setMode(null); setPreview(null); setInviteCode(''); }}
                    >
                      Back
                    </button>
                    <button
                      className="btn-confirm-register"
                      disabled={!preview || preview.status !== 'Forming' || submitting}
                      onClick={handleJoin}
                    >
                      {submitting ? 'Joining…' : 'Join Team'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Main EventDetails component
// ─────────────────────────────────────────────────────────────
const EventDetails = () => {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event, setEvent]                         = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');
  const [registering, setRegistering]             = useState(false);
  const [cancelling, setCancelling]               = useState(false);
  const [formData, setFormData]                   = useState({});
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showTeamModal, setShowTeamModal]         = useState(false);

  const fetchEventDetails = useCallback(async () => {
    try {
      const response = await participantAPI.getEventById(eventId);
      setEvent(response.data.event);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError('Failed to load event details');
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchEventDetails(); }, [fetchEventDetails]);

  // ── Normal / Merchandise registration button handler ──────
  const handleRegister = () => {
    if (event.isRegistered) {
      setError('You are already registered for this event');
      return;
    }
    if (event.registrationClosed) {
      setError('Registration for this event is closed');
      return;
    }
    setShowRegistrationModal(true);
  };

  // ── Hackathon register button handler ─────────────────────
  const handleTeamRegister = () => {
    if (event.isRegistered) {
      setError('You are already registered for this event');
      return;
    }
    if (event.registrationClosed) {
      setError('Registration for this event is closed');
      return;
    }
    setShowTeamModal(true);
  };

  // ── Submit normal / merchandise registration ──────────────
  const submitRegistration = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setError('');

    try {
      const response = await participantAPI.registerForEvent(eventId, { formData: formData });

      setSuccess(`Successfully registered! Your ticket ID is: ${response.data.ticketId}`);
      setShowRegistrationModal(false);
      await fetchEventDetails();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Cancel your registration for this event?')) return;
    setCancelling(true);
    setError('');
    setSuccess('');

    try {
      const response = await participantAPI.cancelRegistration(eventId);
      setSuccess(response.data?.message || 'Registration cancelled');
      await fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel registration');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Derived: is this a hackathon? ─────────────────────────
  const isHackathon = event?.type === 'Hackathon';

  // ── Loading / not-found guards ────────────────────────────
  if (loading) {
    return (
      <div className="event-details-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-page">
        <div className="error-state">
          <h2>Event Not Found</h2>
          <button onClick={() => navigate('/participant/browse-events')} className="btn-primary">
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  // ── Sidebar registration section (right column) ───────────
  const renderRegistrationSidebar = () => {
    if (event.registrationClosed) {
      return (
        <div className="registration-closed">
          <div className="closed-icon">🚫</div>
          <h4>Registration Closed</h4>
          <p>
            {event.spotsLeft <= 0
              ? 'Event is full'
              : new Date() > new Date(event.registrationDeadline)
              ? 'Deadline passed'
              : 'Registration is currently closed'}
          </p>
        </div>
      );
    }

    if (event.isRegistered) {
      return (
        <div className="already-registered">
          <div className="registered-icon">✓</div>
          <h4>{isHackathon ? 'Team Registered!' : "You're Registered!"}</h4>
          {event.userRegistration?.ticketId && (
            <p style={{ fontSize: 12, color: '#555', margin: '4px 0 12px' }}>
              Ticket: {event.userRegistration.ticketId}
            </p>
          )}
          {!isHackathon && (
            <button
              className="btn-cancel"
              style={{ marginTop: 8 }}
              onClick={handleCancelRegistration}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Registration'}
            </button>
          )}
          {isHackathon && (
            <button
              className="btn-view-ticket"
              style={{ marginTop: 8, background: '#fff', color: '#111', border: '1px solid #d4d4d4' }}
              onClick={() => setShowTeamModal(true)}
            >
              View Team
            </button>
          )}
        </div>
      );
    }

    // Not yet registered — show register button(s)
    return (
      <>
        <div className="registration-summary">
          <div className="summary-row">
            <span>Registration Fee</span>
            <span className="fee-amount">₹{event.registrationFee}</span>
          </div>
          <div className="summary-row">
            <span>{isHackathon ? 'Team Slots Left' : 'Spots Left'}</span>
            <span className={event.spotsLeft < 10 ? 'low-spots' : ''}>
              {event.spotsLeft}
            </span>
          </div>
          {isHackathon && event.teamDetails?.maxTeamSize && (
            <div className="summary-row">
              <span>Max Team Size</span>
              <span>{event.teamDetails.maxTeamSize}</span>
            </div>
          )}
        </div>

        {isHackathon ? (
          <button className="btn-register" onClick={handleTeamRegister}>
            Register as Team
          </button>
        ) : (
          <button className="btn-register" onClick={handleRegister}>
            {event.type === 'Merchandise' ? 'Purchase Now' : 'Register Now'}
          </button>
        )}

        {isHackathon && (
          <p style={{ fontSize: 11, color: '#888', margin: '10px 0 0', lineHeight: 1.5 }}>
            Create a team or join one using an invite code. Tickets are issued once the team is full.
          </p>
        )}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="event-details-page">
      {/* Top header bar */}
      <div className="event-details-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Back
          </button>
          <div className="header-badges">
            <span
              className="type-badge"
              style={{
                background:
                  event.type === 'Merchandise'
                    ? '#f0f0f0'
                    : isHackathon
                    ? '#f0f0f0'
                    : '#f0f0f0',
                color:
                  event.type === 'Merchandise'
                    ? '#111111'
                    : isHackathon
                    ? '#111111'
                    : '#111111'
              }}
            >
              {event.type}
            </span>
            {event.isRegistered && (
              <span className="registered-badge">
                {isHackathon ? 'Team Registered' : 'Registered'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="event-details-container">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={() => setSuccess('')} className="alert-close">×</button>
          </div>
        )}

        <div className="event-content-grid">
          {/* ── Left column ── */}
          <div className="event-main-info">
            <div className="event-header-section">
              <h1>{event.name}</h1>
              <div className="organizer-info">
                <span className="organizer-label">Organized by</span>
                <h3
                  className="organizer-name"
                  onClick={() => navigate(`/participant/organizer/${event.organizer._id}`)}
                >
                  {event.organizer.name}
                </h3>
                <p className="organizer-category">{event.organizer.category}</p>
              </div>
            </div>

            <div className="event-description-section">
              <h2>About This Event</h2>
              <p className="event-description">{event.description}</p>
            </div>

            {/* Info grid */}
            <div className="event-info-grid">
              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">Event Date</span>
                  <span className="info-value">{formatDate(event.startDate)}</span>
                  {event.endDate && event.startDate !== event.endDate && (
                    <span className="info-sub">to {formatDate(event.endDate)}</span>
                  )}
                </div>
              </div>

              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">Time</span>
                  <span className="info-value">{formatTime(event.startDate)}</span>
                </div>
              </div>

              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">Registration Deadline</span>
                  <span className="info-value">{formatDate(event.registrationDeadline)}</span>
                </div>
              </div>

              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">Eligibility</span>
                  <span className="info-value">{event.eligibility}</span>
                </div>
              </div>

              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">Registration Fee</span>
                  <span className="info-value">₹{event.registrationFee}</span>
                </div>
              </div>

              <div className="info-card">
                <div className="info-content">
                  <span className="info-label">
                    {isHackathon ? 'Team Slots Available' : 'Spots Available'}
                  </span>
                  <span className="info-value">
                    {event.spotsLeft} / {event.registrationLimit}
                  </span>
                </div>
              </div>

              {/* Extra hackathon info card */}
              {isHackathon && event.teamDetails?.maxTeamSize && (
                <div className="info-card">
                  <div className="info-content">
                    <span className="info-label">Max Team Size</span>
                    <span className="info-value">{event.teamDetails.maxTeamSize} members</span>
                  </div>
                </div>
              )}
            </div>

            {/* Merchandise details */}
            {event.type === 'Merchandise' && event.merchandiseDetails && (
              <div className="merchandise-section">
                <h2>Merchandise Details</h2>
                <p>{event.merchandiseDetails.itemDetails}</p>
                <div className="merch-stats">
                  <div className="merch-stat">
                    <span className="merch-label">Stock Available</span>
                    <span className="merch-value">{event.merchandiseDetails.stockQuantity}</span>
                  </div>
                  <div className="merch-stat">
                    <span className="merch-label">Purchase Limit</span>
                    <span className="merch-value">{event.merchandiseDetails.purchaseLimit} per person</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hackathon info banner */}
            {isHackathon && (
              <div className="hackathon-info-section">
                <h2>How Team Registration Works</h2>
                <div className="hackathon-steps">
                  <div className="hackathon-step">
                    <span className="step-num">1</span>
                    <div>
                      <strong>Create a Team</strong>
                      <p>One person creates the team and sets the size. You get a unique invite code.</p>
                    </div>
                  </div>
                  <div className="hackathon-step">
                    <span className="step-num">2</span>
                    <div>
                      <strong>Invite Members</strong>
                      <p>Share the invite code with your teammates. They join using the code.</p>
                    </div>
                  </div>
                  <div className="hackathon-step">
                    <span className="step-num">3</span>
                    <div>
                      <strong>All Accept → Tickets Issued</strong>
                      <p>Once all members join, tickets with QR codes are emailed to everyone.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="tags-section">
                <h3>Tags</h3>
                <div className="tags-list">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column (sidebar) ── */}
          <div className="registration-sidebar">
            <div className="registration-card">
              <h3>{isHackathon ? 'Team Registration' : 'Registration'}</h3>
              {renderRegistrationSidebar()}
            </div>

            {/* Organizer contact card */}
            <div className="contact-card">
              <h3>Contact Organizer</h3>
              <p>{event.organizer.contactEmail}</p>
              {event.organizer.description && (
                <p className="organizer-desc">{event.organizer.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Normal/Merchandise registration modal ── */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Registration</h2>
              <button
                className="modal-close"
                onClick={() => setShowRegistrationModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitRegistration}>
              <div className="modal-body">
                <div className="registration-summary-modal">
                  <h3>{event.name}</h3>
                  <p>Fee: ₹{event.registrationFee}</p>
                  {event.type === 'Merchandise' && event.merchandiseDetails && (
                    <div className="merch-info-box">
                      <p><strong>Item:</strong> {event.merchandiseDetails.itemDetails}</p>
                      <p><strong>Stock Left:</strong> {event.merchandiseDetails.stockQuantity}</p>
                      <p><strong>Purchase Limit:</strong> {event.merchandiseDetails.purchaseLimit} per person</p>
                    </div>
                  )}
                </div>

                {/* Custom form fields */}
                {event.customFormFields && event.customFormFields.length > 0 && (
                  <div className="custom-form-section">
                    <h4>Additional Information</h4>
                    {event.customFormFields.map((field, idx) => (
                      <div key={idx} className="form-field">
                        <label>
                          {field.label}{' '}
                          {field.required && <span className="required">*</span>}
                        </label>
                        {field.fieldType === 'text' && (
                          <input
                            type="text"
                            required={field.required}
                            onChange={e => setFormData({ ...formData, [field.label]: e.target.value })}
                          />
                        )}
                        {field.fieldType === 'dropdown' && (
                          <select
                            required={field.required}
                            defaultValue=""
                            onChange={e => setFormData({ ...formData, [field.label]: e.target.value })}
                          >
                            <option value="" disabled>Select…</option>
                            {(field.options || []).map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {field.fieldType === 'checkbox' && (
                          <label className="checkbox-label" style={{ marginTop: 4 }}>
                            <input
                              type="checkbox"
                              required={field.required}
                              onChange={e => setFormData({ ...formData, [field.label]: e.target.checked })}
                            />
                            <span>{field.label}</span>
                          </label>
                        )}
                        {field.fieldType === 'file upload' && (
                          <input
                            type="file"
                            required={field.required}
                            onChange={e => setFormData({ ...formData, [field.label]: e.target.files[0]?.name || '' })}
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="confirmation-section">
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span>
                      I confirm that I meet the eligibility criteria and agree to pay ₹{event.registrationFee}
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRegistrationModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-register"
                  disabled={registering}
                >
                  {registering
                    ? 'Processing...'
                    : `Confirm & ${event.type === 'Merchandise' ? 'Purchase' : 'Register'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Team registration modal (Hackathon only) ── */}
      {showTeamModal && (
        <TeamRegistrationModal
          event={event}
          onClose={() => setShowTeamModal(false)}
          onSuccess={() => {
            setShowTeamModal(false);
            setSuccess('Team registration complete! Tickets sent to all members.');
            fetchEventDetails();
          }}
        />
      )}
    </div>
  );
};

export default EventDetails;
