import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { organizerAPI, teamAPI } from '../../services/api';
import './OrganizerDashboard.css';

const initialEventState = {
  name: '',
  description: '',
  type: 'Normal',
  eligibility: 'Open to all',
  registrationDeadline: '',
  startDate: '',
  endDate: '',
  registrationLimit: '',
  registrationFee: '',
  tags: '',
  itemDetails: '',
  stockQuantity: '',
  purchaseLimit: ''
};

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0
  });

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState(initialEventState);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState(initialEventState);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamsForEvent, setTeamsForEvent] = useState([]);
  const [teamsEvent, setTeamsEvent] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState('');
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeEvent, setAnalyzeEvent] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [manualTicketId, setManualTicketId] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const scanTimerRef = React.useRef(null);

  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [eventsRes, statsRes] = await Promise.all([
        organizerAPI.getEvents(),
        organizerAPI.getStats()
      ]);

      setEvents(eventsRes.data?.events || []);
      try {
        const resetRes = await organizerAPI.getMyResetRequests();
        setResetRequests(resetRes.data?.requests || []);
      } catch (_) {}
      setStats(statsRes.data?.stats || stats);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePublishEvent = async (eventId) => {
    setError('');
    setSuccess('');

    const ok = window.confirm('Publish this event? Once published, edits may be restricted.');
    if (!ok) return;

    try {
      await organizerAPI.publishEvent(eventId);

      setSuccess('Event published successfully!');

      // Refresh list + stats so UI updates immediately
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to publish event');
    }
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
      fetchDashboardData();
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...newEvent,
        registrationLimit: Number(newEvent.registrationLimit),
        registrationFee: Number(newEvent.registrationFee),
        tags: newEvent.tags
          ? newEvent.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
        merchandiseDetails:
          newEvent.type === 'Merchandise'
            ? {
                itemDetails: newEvent.itemDetails,
                stockQuantity: Number(newEvent.stockQuantity),
                purchaseLimit: Number(newEvent.purchaseLimit)
              }
            : undefined,
        maxTeamSize:
          newEvent.type === 'Hackathon' ? Number(newEvent.maxTeamSize) : undefined
      };

      await organizerAPI.createEvent(payload);

      setSuccess('Event created successfully!');
      setShowAddEventModal(false);
      setNewEvent(initialEventState);
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (event) => {
    setEditError('');
    setEditEvent(event);
    const normalizedEligibility =
      event.eligibility === 'IIIT Students Only'
        ? 'Only IIIT'
        : (event.eligibility || 'Open to all');
    setEditForm({
      name: event.name || '',
      description: event.description || '',
      type: event.type || 'Normal',
      eligibility: normalizedEligibility,
      registrationDeadline: event.registrationDeadline ? event.registrationDeadline.slice(0, 10) : '',
      startDate: event.startDate ? event.startDate.slice(0, 10) : '',
      endDate: event.endDate ? event.endDate.slice(0, 10) : '',
      registrationLimit: event.registrationLimit ?? '',
      registrationFee: event.registrationFee ?? '',
      tags: Array.isArray(event.tags) ? event.tags.join(', ') : '',
      itemDetails: event.merchandiseDetails?.itemDetails || '',
      stockQuantity: event.merchandiseDetails?.stockQuantity || '',
      purchaseLimit: event.merchandiseDetails?.purchaseLimit || '',
      maxTeamSize: event.teamDetails?.maxTeamSize || ''
    });
    setShowEditModal(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editEvent?._id) return;
    setEditLoading(true);
    setEditError('');

    try {
      const payload = {};

      if (editEvent.status === 'Draft') {
        payload.name = editForm.name;
        payload.description = editForm.description;
        payload.type = editForm.type;
        payload.eligibility = editForm.eligibility;
        payload.registrationDeadline = editForm.registrationDeadline;
        payload.startDate = editForm.startDate;
        payload.endDate = editForm.endDate;
        payload.registrationLimit = Number(editForm.registrationLimit);
        payload.registrationFee = Number(editForm.registrationFee);
        payload.tags = editForm.tags
          ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [];
        if (editForm.type === 'Merchandise') {
          payload.merchandiseDetails = {
            itemDetails: editForm.itemDetails,
            stockQuantity: Number(editForm.stockQuantity),
            purchaseLimit: Number(editForm.purchaseLimit)
          };
        }
        if (editForm.type === 'Hackathon') {
          payload.maxTeamSize = Number(editForm.maxTeamSize);
        }
      } else if (editEvent.status === 'Published') {
        payload.description = editForm.description;
        payload.registrationDeadline = editForm.registrationDeadline;
        payload.registrationLimit = Number(editForm.registrationLimit);
        if (editForm.closeRegistrations) {
          payload.status = 'Closed';
        }
      } else {
        payload.status = editForm.status;
      }

      await organizerAPI.updateEvent(editEvent._id, payload);

      setShowEditModal(false);
      fetchDashboardData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update event');
    } finally {
      setEditLoading(false);
    }
  };

  const fetchAnalyzeEvent = async (event) => {
    setAnalyzeEvent(null);
    setAnalyzeError('');
    setAnalyzeLoading(true);
    setScanMessage('');
    setManualTicketId('');
    setManualNote('');
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

  const parseTicketId = (raw) => {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data.ticketId || raw;
    } catch {
      return raw;
    }
  };

  const scanTicket = async (ticketId, method) => {
    if (!analyzeEvent?._id || !ticketId) return;
    setScanMessage('');
    try {
      const res = await organizerAPI.scanAttendance(analyzeEvent._id, { ticketId, method });
      setScanMessage(res.data?.message || 'Attendance marked');
      await fetchAnalyzeEvent(analyzeEvent);
    } catch (err) {
      setScanMessage(err.response?.data?.message || 'Scan failed');
    }
  };

  const overrideAttendance = async (action) => {
    if (!analyzeEvent?._id || !manualTicketId) return;
    setScanMessage('');
    try {
      const res = await organizerAPI.overrideAttendance(analyzeEvent._id, {
        ticketId: manualTicketId.trim(), action, note: manualNote
      });
      setScanMessage(res.data?.message || 'Attendance updated');
      await fetchAnalyzeEvent(analyzeEvent);
    } catch (err) {
      setScanMessage(err.response?.data?.message || 'Override failed');
    }
  };

  const exportAttendance = async () => {
    if (!analyzeEvent?._id) return;
    try {
      const res = await organizerAPI.exportAttendance(analyzeEvent._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${analyzeEvent._id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setScanMessage(err.response?.data?.message || 'Export failed');
    }
  };

  const loadJsQR = () => new Promise((resolve, reject) => {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error('Failed to load QR library'));
    document.head.appendChild(s);
  });

  const startCameraScan = async () => {
    setScanMessage('Starting camera...');
    try {
      const jsQR = await loadJsQR();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;

      // Show viewfinder FIRST so <video> element is in the DOM before srcObject is set
      setCameraActive(true);

      // Let React re-render the video element
      await new Promise(r => setTimeout(r, 60));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (_) {}
      }

      setScanMessage('Camera active - point QR code at the camera');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scanLoop = () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const v = videoRef.current;
          if (v.readyState >= 2) {
            canvas.width  = v.videoWidth  || 640;
            canvas.height = v.videoHeight || 480;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              const ticketId = parseTicketId(code.data);
              if (ticketId) {
                stopCameraScan();
                scanTicket(ticketId, 'camera');
                return;
              }
            }
          }
        } catch (_) {}
        scanTimerRef.current = requestAnimationFrame(scanLoop);
      };
      scanTimerRef.current = requestAnimationFrame(scanLoop);

    } catch (err) {
      setCameraActive(false);
      if (err.name === 'NotAllowedError') {
        setScanMessage('Camera permission denied - allow camera in browser settings.');
      } else if (err.message === 'Failed to load QR library') {
        setScanMessage('Could not load QR library. Check your internet connection.');
      } else {
        setScanMessage('Unable to start camera: ' + err.message);
      }
    }
  };

  const stopCameraScan = () => {
    if (scanTimerRef.current) {
      cancelAnimationFrame(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanMessage('');
  };

  const handleFileScan = async (file) => {
    if (!file) return;
    setScanMessage('Scanning image...');
    try {
      const jsQR = await loadJsQR();
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (code && code.data) {
        const ticketId = parseTicketId(code.data);
        if (ticketId) await scanTicket(ticketId, 'upload');
        else setScanMessage('QR found but no ticket ID inside.');
      } else {
        setScanMessage('No QR code found in image. Try a clearer photo.');
      }
    } catch (err) {
      setScanMessage('Failed to scan image: ' + err.message);
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

  const isDateOnly = useCallback((v) => {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }, []);

  const toStartMs = useCallback((v) => {
    if (!v) return NaN;
    if (isDateOnly(v)) return new Date(`${v}T00:00:00`).getTime(); // local start of day
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? NaN : t;
  }, [isDateOnly]);

  const toEndMs = useCallback((v) => {
    if (!v) return NaN;
    if (isDateOnly(v)) return new Date(`${v}T23:59:59.999`).getTime(); // local end of day
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? NaN : t;
  }, [isDateOnly]);

const getPrettyStatus = useCallback((event) => {
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
}, [toStartMs, toEndMs]);

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

  const normalizedEvents = useMemo(() => {
    return (events || []).map(ev => {
      const pretty = getPrettyStatus(ev);
      return { ...ev, __prettyStatus: pretty };
    });
  }, [events, getPrettyStatus]);

  if (loading) {
    return (
      <div className="od-page">
        <div className="od-loading">
          <div className="od-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="od-page">
      {/* NAVBAR (kept, just restyled) */}
      <nav className="od-nav">
        <div className="od-nav-left">
          <div className="od-nav-logo">Organizer Portal</div>
          <div className="od-nav-links">
            <Link to="/organizer/dashboard" className="od-nav-link active">Dashboard</Link>
            <Link to="/organizer/ongoing" className="od-nav-link">Ongoing</Link>
            <Link to="/organizer/profile" className="od-nav-link">Profile</Link>
            <button className="od-nav-link" style={{background:'none',border:'none',cursor:'pointer',color:'inherit'}} onClick={() => setShowResetModal(true)}>Reset Password</button>
          </div>
        </div>
        <button className="od-nav-link" onClick={() => setShowAddEventModal(true)}>
            <span className="od-btn-ico" aria-hidden="true">{'\u2295'}</span>
            Create New Event
        </button>
        <button onClick={handleLogout} className="od-nav-logout">Logout</button>
      </nav>

      <div className="od-wrap">
        {/* ALERTS */}
        {error && <div className="od-alert od-alert-error">{error}</div>}
        {success && <div className="od-alert od-alert-success">{success}</div>}

        {/* HERO (like screenshot) */}
        <header className="od-hero">
          <div>
            <h1 className="od-hero-title">
              Welcome, {user?.name || 'Tech Club'}!
            </h1>
          </div>
        </header>

        {/* STATS (4 cards with icons, like screenshot) */}
        <section className="od-stats">
          <div className="od-stat-card">
            <div>
              <div className="od-stat-label">Total Events</div>
              <div className="od-stat-value">{stats.totalEvents}</div>
            </div>
            <div className="od-stat-icon od-icon-blue" aria-hidden="true">
              {/* calendar */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 2v3M17 2v3M3.5 9h17M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div className="od-stat-card">
            <div>
              <div className="od-stat-label">Upcoming Events</div>
              <div className="od-stat-value">{stats.upcomingEvents}</div>
            </div>
            <div className="od-stat-icon od-icon-green" aria-hidden="true">
              {/* trending up */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l7-7 4 4 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 7h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="od-stat-card">
            <div>
              <div className="od-stat-label">Total Registrations</div>
              <div className="od-stat-value">{stats.totalRegistrations}</div>
            </div>
            <div className="od-stat-icon od-icon-purple" aria-hidden="true">
              {/* users */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16.5 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div className="od-stat-card">
            <div>
              <div className="od-stat-label">Total Revenue</div>
              <div className="od-stat-value">{'\u20B9'}{formatMoney(stats.totalRevenue)}</div>
            </div>
            <div className="od-stat-icon od-icon-yellow" aria-hidden="true">
              {/* bar chart */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 19v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 19v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 19v-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 19v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </section>

        {/* EVENTS LIST (like screenshot: vertical list cards) */}
        <section className="od-card od-events">
          <div className="od-card-head">
            <h2>All My Events</h2>
          </div>

          {normalizedEvents.length === 0 ? (
            <div className="od-empty">
              <h3>No events yet</h3>
              <p>Create your first event to start tracking registrations and revenue.</p>
              <button className="od-btn od-btn-primary" onClick={() => setShowAddEventModal(true)}>
                Create Event
              </button>
            </div>
          ) : (
            <div className="od-event-list">
              {normalizedEvents.map(event => {
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

                        {event.status === 'Draft' && (
                          <button
                            className="od-publish-btn"
                            title="Publish"
                            onClick={() => handlePublishEvent(event._id)}
                          >
                            Publish
                          </button>
                        )}
                        {['Ongoing', 'Completed', 'Closed'].includes(pretty) && (
                          <button
                            className="od-publish-btn"
                            title="Analyze"
                            onClick={() => fetchAnalyzeEvent(event)}
                          >
                            Analyze
                          </button>
                        )}
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

                    {/* optional tags */}
                    {Array.isArray(event.tags) && event.tags.length > 0 && (
                      <div className="od-tag-row">
                        {event.tags.slice(0, 5).map((t, idx) => (
                          <span key={`${event._id}-tag-${idx}`} className="od-tag">
                            {t}
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

      {/* ================= ADD EVENT MODAL ================= */}
{showAddEventModal && (
        <div className="modal-overlay" onClick={() => setShowAddEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Event</h2>
              <button className="modal-close" onClick={() => setShowAddEventModal(false)}>{'\u00D7'}</button>
            </div>

            <form onSubmit={handleAddEvent} className="modal-form scrollable-form">
              {/* Mandatory Fields */}
              <div className="form-group">
                <label>Event Name *</label>
                <input type="text" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Type *</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} required>
                    <option value="Normal">Normal (Individual)</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Hackathon">Hackathon (Team)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Eligibility *</label>
                  <select value={newEvent.eligibility} onChange={(e) => setNewEvent({ ...newEvent, eligibility: e.target.value })} required>
                    <option value="Open to all">Open to all</option>
                    <option value="Only IIIT">Only IIIT</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Reg. Deadline *</label>
                  <input type="date" value={newEvent.registrationDeadline} onChange={(e) => setNewEvent({ ...newEvent, registrationDeadline: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input type="text" value={newEvent.tags} onChange={(e) => setNewEvent({ ...newEvent, tags: e.target.value })} placeholder="coding, workshop" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Reg. Limit *</label>
                  <input type="number" value={newEvent.registrationLimit} onChange={(e) => setNewEvent({ ...newEvent, registrationLimit: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Reg. Fee ({'\u20B9'}) *</label>
                  <input type="number" value={newEvent.registrationFee} onChange={(e) => setNewEvent({ ...newEvent, registrationFee: e.target.value })} required />
                </div>
              </div>

              {/* Conditional Merchandise Fields */}
              {newEvent.type === 'Merchandise' && (
                <div className="merch-fields">
                  <h4 className="sub-header">Merchandise Details</h4>
                  <div className="form-group">
                    <label>Item Details (Sizes, Colors) *</label>
                    <input type="text" value={newEvent.itemDetails} onChange={(e) => setNewEvent({ ...newEvent, itemDetails: e.target.value })} placeholder="S, M, L / Red, Blue" required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock Quantity *</label>
                      <input type="number" value={newEvent.stockQuantity} onChange={(e) => setNewEvent({ ...newEvent, stockQuantity: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Purchase Limit *</label>
                      <input type="number" value={newEvent.purchaseLimit} onChange={(e) => setNewEvent({ ...newEvent, purchaseLimit: e.target.value })} required />
                    </div>
                  </div>
                </div>
              )}

              {newEvent.type === 'Hackathon' && (
                <div className="form-group">
                  <label>Max Team Size *</label>
                  <input
                    type="number"
                    min="2" max="10"
                    value={newEvent.maxTeamSize || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, maxTeamSize: e.target.value })}
                    placeholder="e.g. 4"
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT EVENT MODAL ================= */}
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

      {/* ================= TEAMS MODAL (Hackathon) ================= */}
      {showTeamsModal && (
        <div className="modal-overlay" onClick={() => setShowTeamsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{teamsEvent?.name || 'Event'} {'\u2014'} Teams</h2>
              <button className="modal-close" onClick={() => setShowTeamsModal(false)}>{'\u00D7'}</button>
            </div>

            <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
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
    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 leader
    const isComplete = team.status === 'Complete';

    return (
      <div key={team._id} className="od-event-item od-team-item">
        {/* Top Row */}
        <div className="od-event-top od-team-top">
          <div className="od-event-title-row">
            <div>
              <h3 className="od-event-title od-team-title">{team.name}</h3>
              <p className="od-team-sub">
                {acceptedCount}/{team.maxSize} members
              </p>
            </div>

            <span className={`od-badge od-team-status ${isComplete ? 'badge-published' : 'badge-upcoming'}`}>
              {isComplete ? 'Complete' : 'Forming'}
            </span>
          </div>
        </div>

        {/* Meta Grid */}
        <div className="od-team-meta-grid">

              <div className="od-team-meta-card">
                <div className="od-team-meta-label">Members</div>
                <div className="od-team-meta-value">{acceptedCount} / {team.maxSize}</div>
              </div>

              <div className="od-team-meta-card">
                <div className="od-team-meta-label">Status</div>
                <div className="od-team-meta-value">
                  {isComplete ? "Tickets sent" : "Waiting for members"}
                </div>
              </div>
            </div>

            {/* Members Chips */}
            <div className="od-team-members">
              <span className="od-chip od-chip-leader">
                Leader {'\u2022'} {team.leader?.firstName} {team.leader?.lastName}
              </span>

              {team.members.map((m) => (
                <span
                  key={m._id}
                  className={`od-chip ${m.status === 'Accepted' ? 'od-chip-accepted' : 'od-chip-pending'}`}
                  title={m.user?.email || ''}
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

      {/* ================= ANALYZE / ATTENDANCE MODAL ================= */}
      {showAnalyzeModal && (
        <div className="modal-overlay" onClick={() => { stopCameraScan(); setShowAnalyzeModal(false); }}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attendance — {analyzeEvent?.name || 'Event'}</h2>
              <button className="modal-close" onClick={() => { stopCameraScan(); setShowAnalyzeModal(false); }}>×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: 560, overflowY: 'auto' }}>
              {analyzeError && <div className="od-alert od-alert-error" style={{ marginBottom: 12 }}>{analyzeError}</div>}

              {analyzeLoading || !analyzeEvent ? <p>Loading...</p> : (() => {
                const isOngoing = getPrettyStatus(analyzeEvent) === 'Ongoing';
                const attended  = analyzeEvent.participants.filter(p => p.attended).length;
                const total     = analyzeEvent.participants.length;
                return (
                  <>
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                      {[
                        { label: 'Registered', value: total },
                        { label: 'Attended',   value: attended },
                        { label: 'Remaining',  value: total - attended },
                      ].map(s => (
                        <div key={s.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                          <div style={{ fontSize: 12, color: '#666666' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Scan status message */}
                    {scanMessage && (
                      <div style={{ background: '#f0f0f0', border: '1px solid #d4d4d4', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#111111' }}>
                        {scanMessage}
                      </div>
                    )}

                    {isOngoing && (
                      <>
                        {/* Camera viewfinder */}
                        <div style={{ marginBottom: 14, display: cameraActive ? 'block' : 'none' }}>
                          <div className="qr-viewfinder">
                            <video ref={videoRef} className="qr-video" autoPlay playsInline muted />
                            <div className="qr-overlay">
                              <div className="qr-corner qr-tl" /><div className="qr-corner qr-tr" />
                              <div className="qr-corner qr-bl" /><div className="qr-corner qr-br" />
                              <div className="qr-laser" />
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          <button className="od-btn od-btn-primary" style={{ flex: 1 }} onClick={cameraActive ? stopCameraScan : startCameraScan}>
                            {cameraActive ? 'Stop Camera' : 'Scan QR'}
                          </button>
                          <label className="od-btn od-btn-ghost" style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}>
                            Upload QR Image
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileScan(e.target.files?.[0])} />
                          </label>
                        </div>

                        {/* Manual entry */}
                        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#333333' }}>Manual Entry</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              placeholder="Ticket ID"
                              value={manualTicketId}
                              onChange={(e) => setManualTicketId(e.target.value)}
                              style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                            />
                            <button className="od-btn od-btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => overrideAttendance('mark')}>✓ Mark</button>
                            <button className="od-btn od-btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={() => overrideAttendance('unmark')}>✗ Unmark</button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Participants list */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Participants</span>
                      <button className="od-btn od-btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={exportAttendance}>Export CSV</button>
                    </div>

                    {total === 0 ? (
                      <p style={{ color: '#666666', fontSize: 13 }}>No registrations yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {analyzeEvent.participants.map((p) => (
                          <div key={p.ticketId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: p.attended ? '#f0f0f0' : '#fff', border: `1px solid ${p.attended ? '#d4d4d4' : '#e5e7eb'}`, borderRadius: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.user?.firstName} {p.user?.lastName}</div>
                              <div style={{ fontSize: 11, color: '#666666' }}>{p.ticketId} · {p.user?.email}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: p.attended ? '#111111' : '#666666', background: p.attended ? '#f0f0f0' : '#f3f4f6', padding: '2px 8px', borderRadius: 12 }}>
                              {p.attended ? '✓ Attended' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}


      {/* ================= PASSWORD RESET REQUEST MODAL ================= */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => { setShowResetModal(false); setResetSuccess(''); setResetError(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'520px'}}>
            <div className="modal-header">
              <h2>Request Password Reset</h2>
              <button onClick={() => { setShowResetModal(false); setResetSuccess(''); setResetError(''); }} className="modal-close">{'×'}</button>
            </div>
            <div className="modal-body" style={{padding:'20px'}}>
              {resetSuccess ? (
                <div className="od-alert od-alert-success" style={{marginBottom:'16px'}}>{resetSuccess}</div>
              ) : (
                <>
                  <p style={{marginBottom:'12px',color:'#555'}}>Submit a password reset request to the admin</p>
                  {resetError && <div className="od-alert od-alert-error" style={{marginBottom:'12px'}}>{resetError}</div>}
                  <div className="form-group">
                    <label><strong>Reason for reset</strong></label>
                    <textarea
                      value={resetReason}
                      onChange={e => setResetReason(e.target.value)}
                      rows={4}
                      style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'6px',resize:'vertical',marginTop:'6px',boxSizing:'border-box'}}
                    />
                  </div>
                  <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
                    <button onClick={() => setShowResetModal(false)} className="btn-cancel" style={{flex:1}}>Cancel</button>
                    <button onClick={handleSubmitResetRequest} disabled={resetLoading} className="btn-submit" style={{flex:1}}>
                      {resetLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </>
              )}

              {/* Request History */}
              {resetRequests.length > 0 && (
                <div style={{marginTop:'24px',borderTop:'1px solid #eee',paddingTop:'16px'}}>
                  <h4 style={{marginBottom:'12px',fontSize:'14px',color:'#333333'}}>My Request History</h4>
                  {resetRequests.map(r => (
                    <div key={r._id} style={{background:'#f9f9f9',border:'1px solid #eee',borderRadius:'8px',padding:'12px',marginBottom:'10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                        <span style={{fontSize:'12px',color:'#666666'}}>{formatDateTime(r.createdAt)}</span>
                        <span style={{
                          padding:'2px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:700,
                          background: r.status==='Pending'?'#f0f0f0':r.status==='Approved'?'#f0f0f0':'#f0f0f0',
                          color: r.status==='Pending'?'#111111':r.status==='Approved'?'#111111':'#111111'
                        }}>{r.status}</span>
                      </div>
                      <p style={{fontSize:'13px',margin:'4px 0',color:'#333333'}}><strong>Reason:</strong> {r.reason}</p>
                      {r.adminComment && <p style={{fontSize:'12px',margin:'4px 0',color:'#666666'}}><strong>Admin Comment:</strong> {r.adminComment}</p>}
                      {r.status === 'Approved' && <p style={{fontSize:'12px',color:'#111111',margin:'6px 0 0',fontWeight:600}}> Your password has been reset. Contact admin to receive it.</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;