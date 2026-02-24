import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './BrowseEvents.css';

const BrowseEvents = () => {
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchEvents();
    fetchTrendingEvents();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, filterType, filterEligibility, filterStartDate, filterEndDate, showFollowedOnly]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (filterType) params.append('type', filterType);
      if (filterEligibility) params.append('eligibility', filterEligibility);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (showFollowedOnly) params.append('followedOnly', 'true');
      
      const response = await api.get(`/participant/events/browse?${params.toString()}`);
      setEvents(response.data.events);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
      setLoading(false);
    }
  };

  const fetchTrendingEvents = async () => {
    try {
      const response = await api.get('/participant/events/trending');
      setTrendingEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching trending events:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type) => {
    return type === 'Merchandise' ? '#fef3c7' : '#dbeafe';
  };

  const getEventTypeTextColor = (type) => {
    return type === 'Merchandise' ? '#92400e' : '#1e40af';
  };

  if (loading) {
    return (
      <div className="browse-events-page">
        <nav className="browse-navbar">
          <button onClick={() => navigate('/participant/dashboard')} className="btn-back">
             Back
          </button>
          <h1>Browse Events</h1>
          <div></div>
        </nav>
        <div className="browse-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-events-page">
      {/* Navbar */}
      <nav className="browse-navbar">
        <button onClick={() => navigate('/participant/dashboard')} className="btn-back">
           Back to Dashboard
        </button>
        <h1>Browse Events</h1>
      </nav>

      <div className="browse-container">
        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')} className="alert-close">x</button>
          </div>
        )}

        {/* Trending Section */}
        {trendingEvents.length > 0 && (
          <div className="trending-section">
            <div className="section-header">
              <h2>Trending Events (Top 5 / 24h)</h2>
            </div>
            <div className="trending-carousel">
              {trendingEvents.map((event) => (
                <div 
                  key={event._id} 
                  className="trending-card"
                  onClick={() => navigate(`/participant/event/${event._id}`)}
                >
                  <div className="trending-badge">Trending</div>
                  <h3>{event.name}</h3>
                  <p className="trending-organizer">by {event.organizer?.name}</p>
                  <div className="trending-stats">
                    <span>{formatDate(event.startDate)}</span>
                    <span>{event.recentRegistrations} new</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="search-filter-section">
          <div className="search-box">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                
              </button>
            )}
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter('all');
                setFilterType('');
                setFilterEligibility('');
                setShowFollowedOnly(false);
              }}
            >
              All Events
            </button>
            <button
              className={`filter-tab ${activeFilter === 'normal' ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter('normal');
                setFilterType('Normal');
              }}
            >
              Normal Events
            </button>
            <button
              className={`filter-tab ${activeFilter === 'merchandise' ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter('merchandise');
                setFilterType('Merchandise');
              }}
            >
              Merchandise
            </button>
            <button
              className={`filter-tab ${activeFilter === 'followed' ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter('followed');
                setShowFollowedOnly(true);
              }}
            >
              Followed Clubs
            </button>
          </div>

          <div className="advanced-filters">
            <div className="filter-group">
              <label>Eligibility</label>
              <select
                value={filterEligibility}
                onChange={(e) => setFilterEligibility(e.target.value)}
              >
                <option value="">All</option>
                <option value="IIIT Students Only">IIIT Students Only</option>
                <option value="Open to all">Open to all</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date (From)</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>End Date (To)</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* Events List */}
        <div className="events-grid">
          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No Events Found</h3>
            </div>
          ) : (
            events.map((event) => (
              <div 
                key={event._id} 
                className="event-browse-card"
                onClick={() => navigate(`/participant/event/${event._id}`)}
              >
                <div className="event-card-top">
                  <div className="event-header">
                    {event.isRegistered && (
                      <span className="registered-badge">Registered</span>
                    )}
                  </div>
                  <h3>{event.name}</h3>
                  <p className="event-organizer">by {event.organizer?.name}</p>
                </div>

                <div className="event-details">
                  <div className="detail-row">
                    <span>{formatDate(event.startDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span>{formatTime(event.startDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span>{event.eligibility}</span>
                  </div>
                  <div className="detail-row">
                    <span>{event.registrationFee}</span>
                  </div>
                  <div className="detail-row">
                    <span>{event.spotsLeft || 0} spots left</span>
                  </div>
                </div>

                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags">
                    {event.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="event-card-footer">
                  <button 
                    className="btn-view-event"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/participant/event/${event._id}`);
                    }}
                  >
                    {event.isRegistered ? 'View Details' : 'Register Now'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseEvents;
