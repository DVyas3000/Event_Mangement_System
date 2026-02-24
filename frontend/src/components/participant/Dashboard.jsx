import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import './Dashboard.css';

const ParticipantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    upcomingEvents: 0,
    followingClubs: 0,
    interests: 0
  });

  const [events, setEvents] = useState({
    upcoming:    [],
    normal:      [],
    merchandise: [],
    hackathon:   [],
    completed:   [],
    cancelled:   []
  });

  const [historyTab, setHistoryTab] = useState('normal');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch profile
      const profileRes  = await participantAPI.getProfile();
      const profileData = profileRes.data.profile;

      // Fetch events  safe default covers all tabs incl. hackathon
      let eventsData = {
        upcoming: [], normal: [], merchandise: [],
        hackathon: [], completed: [], cancelled: []
      };

      try {
        const myEventsRes = await participantAPI.getMyEvents();
        eventsData = { ...eventsData, ...(myEventsRes.data.events || {}) };
      } catch (eventsError) {
        console.log('Events endpoint not available yet');
      }

      setEvents(eventsData);

      const followedClubIds =
        profileData.followedClubs?.map((club) => (typeof club === 'object' ? club._id : club)) || [];

      setStats({
        upcomingEvents: eventsData.upcoming?.length || 0,
        followingClubs: followedClubIds.length,
        interests:      profileData.areasOfInterest?.length || 0
      });

      setLoading(false);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  //  Formatters 
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    const colors = {
      Registered: '#6f7fc6',
      Approved:   '#5f9a79',
      Pending:    '#b98b59',
      Rejected:   '#b26a75',
      Cancelled:  '#8d86a0',
      Closed:     '#8d86a0',
      Completed:  '#7e68a8',
      Forming:    '#b98b59'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeBadgeStyle = (type) => {
    if (type === 'Merchandise') return { background: '#faefd9', color: '#7e6849' };
    if (type === 'Hackathon')   return { background: '#ece4fa', color: '#695687' };
    return { background: '#e1ecfa', color: '#54688b' };
  };

  //  Event card 
  const renderEventCard = (event, variant = 'history') => {
    const showSchedule  = variant === 'upcoming';
    const isHackathon   = event.type === 'Hackathon';
    const hasTicket     = !!event.ticketId;
    // For hackathon cards still Forming, ticket doesn't exist yet
    const isForming     = isHackathon && !hasTicket;

    return (
      <div key={event._id} className={`event-card ${variant}`}>
        {/*  Header  */}
        <div className="event-card-header">
          <div className="event-title-section">
            <div className="event-title-info">
              <h4>{event.name}</h4>
              <p className="event-organizer">
                by {event.organizer?.name || 'Unknown Organizer'}
              </p>
            </div>
          </div>

          <span className="event-type-badge" style={getTypeBadgeStyle(event.type)}>
            {event.type}
          </span>
        </div>

        {/*  Detail grid  */}
        <div className="event-details-grid">
          {showSchedule && (
            <div className="detail-item">
              <span className="detail-label">Schedule</span>
              <span className="detail-value">
                {formatDate(event.startDate)}
                {event.endDate && event.startDate !== event.endDate &&
                  `  ${formatDate(event.endDate)}`}
                {' - '}
                {formatTime(event.startDate)}
              </span>
            </div>
          )}

          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value" style={{ color: getStatusColor(event.status) }}>
              {event.status || ''}
            </span>
          </div>

          {/* Team name  only show row for hackathon events */}
          {isHackathon && (
            <div className="detail-item">
              <span className="detail-label">Team</span>
              <span className="detail-value">
                {event.teamName || (isForming ? 'Forming' : '')}
              </span>
            </div>
          )}

          <div className="detail-item">
            <span className="detail-label">Ticket ID</span>
            <span
              className={`detail-value ticket-id${hasTicket ? ' clickable-ticket' : ''}`}
              onClick={() => hasTicket && navigate(`/participant/ticket/${event.ticketId}`)}
              style={{ cursor: hasTicket ? 'pointer' : 'default' }}
            >
              {hasTicket ? event.ticketId : (isForming ? 'Pending team completion' : '')}
            </span>
          </div>
        </div>

        {/*  Actions  */}
        <div className="event-actions">
          {isForming ? (
            /* Forming team  no ticket yet, just go to event page to check status */
            <button
              className="btn-event-details"
              onClick={() => navigate(`/participant/event/${event._id}`)}
            >
              View Team Status
            </button>
          ) : (
            <>
              <button
                className="btn-view-ticket"
                onClick={() => navigate(`/participant/ticket/${event.ticketId}`)}
                disabled={!hasTicket}
              >
                View Ticket
              </button>
              <button
                className="btn-event-details"
                onClick={() => navigate(`/participant/event/${event._id}`)}
              >
                Event Details
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  //  Upcoming section 
  const renderUpcomingSection = () => {
    const upcomingEvents = events.upcoming || [];

    return (
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Upcoming Events</h2>
          {upcomingEvents.length > 0 && (
            <span className="section-count">{upcomingEvents.length}</span>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="empty-state">
            <h3>No Upcoming Events :( </h3>
          </div>
        ) : (
          <div className="events-list">
            {upcomingEvents.map((event) => renderEventCard(event, 'upcoming'))}
          </div>
        )}
      </div>
    );
  };

  //  History section 
  const renderHistorySection = () => {
    const messageMap = {
      normal:      'No normal event registrations found',
      merchandise: 'No merchandise purchases found',
      hackathon:   'No hackathon registrations found',
      completed:   'No completed events yet',
      cancelled:   'No cancelled/rejected events'
    };

    const historyEvents = events[historyTab] || [];

    // tab config: key, label, count
    const tabs = [
      { key: 'normal',      label: 'Normal' },
      { key: 'merchandise', label: 'Merchandise' },
      { key: 'hackathon',   label: 'Hackathon' },
      { key: 'completed',   label: 'Completed' },
      { key: 'cancelled',   label: 'Cancelled/Rejected' }
    ];

    return (
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Participation History</h2>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          {tabs.map(({ key, label }) => {
            const count = (events[key] || []).length;
            return (
              <button
                key={key}
                className={`tab ${historyTab === key ? 'active' : ''}`}
                onClick={() => setHistoryTab(key)}
              >
                {label}
                {count > 0 && (
                  <span className="tab-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {historyEvents.length === 0 ? (
          <div className="empty-state-compact">
            <p>{messageMap[historyTab] || 'No events found'}</p>
          </div>
        ) : (
          <div className="events-list">
            {historyEvents.map((event) => renderEventCard(event, 'history'))}
          </div>
        )}
      </div>
    );
  };

  //  Team tracker (Forming hackathon teams) 
  const renderTeamTrackerSection = () => {
    const formingTeams = (events.hackathon || []).filter(
      (evt) => evt.teamStatus === 'Forming' || evt.status === 'Forming'
    );

    if (formingTeams.length === 0) return null;

    const userId = user?.id || user?._id;

    return (
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Team Tracker</h2>
          <span className="section-count">{formingTeams.length}</span>
        </div>

        <div className="events-list">
          {formingTeams.map((teamEvent) => {
            const isLeader = teamEvent.teamLeaderId && userId
              ? teamEvent.teamLeaderId.toString() === userId.toString()
              : false;
            const membersText = Array.isArray(teamEvent.teamMembers)
              ? teamEvent.teamMembers.map(m => `${m.name} (${m.status})`).join(', ')
              : '';

            return (
              <div key={teamEvent._id} className="event-card history">
                <div className="event-card-header">
                  <div className="event-title-section">
                    <div className="event-title-info">
                      <h4>{teamEvent.teamName || 'Team'}</h4>
                      <p className="event-organizer">
                        {teamEvent.name}
                      </p>
                    </div>
                  </div>
                  <span className="event-type-badge" style={getTypeBadgeStyle('Hackathon')}>
                    Hackathon
                  </span>
                </div>

                <div className="event-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Members Joined</span>
                    <span className="detail-value">
                      {teamEvent.teamAcceptedCount || 1} / {teamEvent.teamMaxSize || ''}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Slots Left</span>
                    <span className="detail-value">
                      {teamEvent.teamSlotsLeft ?? ''}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Members</span>
                    <span className="detail-value">{membersText}</span>
                  </div>
                  {isLeader && teamEvent.teamInviteCode && (
                    <div className="detail-item">
                      <span className="detail-label">Invite Code</span>
                      <span className="detail-value">{teamEvent.teamInviteCode}</span>
                    </div>
                  )}
                </div>

                <div className="event-actions">
                  <button
                    className="btn-event-details"
                    onClick={() => navigate(`/participant/event/${teamEvent._id}`)}
                  >
                    View Team
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  //  Loading 
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  //  Render 
  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <h2>Felicity</h2>
        </div>
        <div className="navbar-menu">
          <button className="nav-btn active">Dashboard</button>

          <button className="nav-btn" onClick={() => navigate('/participant/browse-events')}>
            Browse Events
          </button>

          <button className="nav-btn" onClick={() => navigate('/participant/clubs')}>
            Clubs/Organizers
          </button>

          <button className="nav-btn" onClick={() => navigate('/participant/profile')}>
            Profile
          </button>

          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="dashboard-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')} className="alert-close">x</button>
          </div>
        )}

        {/* Welcome */}
        <div className="welcome-section">
          <div className="welcome-text">
            <h1>Welcome back, {user?.firstName}!</h1>
            <div className="user-badges">
              <span className="user-badge">
                {user?.participantType === 'IIIT' ? 'IIIT Student' : 'External Participant'}
              </span>
            </div>
            <p className="participant-user-email">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{stats.upcomingEvents}</h3>
              <p>Upcoming Events</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>{stats.interests}</h3>
              <p>Interests</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>{stats.followingClubs}</h3>
              <p>Following Clubs</p>
            </div>
          </div>
        </div>

        {renderTeamTrackerSection()}
        {renderUpcomingSection()}
        {renderHistorySection()}
      </div>
    </div>
  );
};

export default ParticipantDashboard;
