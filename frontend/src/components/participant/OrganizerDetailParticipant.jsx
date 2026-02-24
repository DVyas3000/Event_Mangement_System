import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './OrganizerDetailParticipant.css';

const OrganizerDetailParticipant = () => {
  const { id } = useParams(); // club/organizer id from URL
  const navigate = useNavigate();

  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('upcoming'); // upcoming | past
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await api.get(`/participant/clubs/${id}`);
        setOrganizer(res.data.organizer);
        setEvents(res.data.events || []);
      } catch (e) {
        console.error(e);
        setError('Failed to load organizer details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = Date.now();

    const upcoming = [];
    const past = [];

    for (const ev of events) {
      const end = ev.endDate || ev.startDate;
      const endMs = end ? new Date(end).getTime() : NaN;

      // if end date is not valid, treat as upcoming
      if (!Number.isFinite(endMs) || endMs >= now) upcoming.push(ev);
      else past.push(ev);
    }

    // sort upcoming: nearest first, past: latest first
    upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    past.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  if (loading) {
    return (
      <div className="org-detail-page">
        <div className="org-loading">Loading organizer details...</div>
      </div>
    );
  }

  return (
    <div className="org-detail-page">
      <div className="org-topbar">
        <button className="org-back" onClick={() => navigate(-1)}> Back</button>
        <h1>Organizer Details</h1>
      </div>

      {error && <div className="org-error">{error}</div>}

      {organizer && (
        <div className="org-card">
          <h2 className="org-name">{organizer.name}</h2>

          <div className="org-meta">
            <span className="org-pill">{organizer.category || 'Other'}</span>
            {organizer.contactEmail && (
              <span className="org-email">{organizer.contactEmail}</span>
            )}
          </div>

          <p className="org-desc">{organizer.description || 'No description provided.'}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="org-tabs">
        <button className={`org-tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          Upcoming
          <span className="org-count">{upcomingEvents.length}</span>
        </button>

        <button className={`org-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          Past
          <span className="org-count">{pastEvents.length}</span>
        </button>
      </div>

      {/* Events */}
      <div className="org-events">
        {(tab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 ? (
          <div className="org-empty">No {tab} events.</div>
        ) : (
          (tab === 'upcoming' ? upcomingEvents : pastEvents).map((ev) => (
            <div key={ev._id} className="org-event-card">
              <div className="org-event-title">{ev.name}</div>
              <div className="org-event-row">
                <span>Date:</span> <b>{formatDate(ev.startDate)}</b>
              </div>
              <div className="org-event-row">
                <span>Type:</span> <b>{ev.type}</b>
              </div>

              <button className="org-event-btn" onClick={() => navigate(`/participant/event/${ev._id}`)}>
                View Event
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrganizerDetailParticipant;
