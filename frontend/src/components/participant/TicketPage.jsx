import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './TicketPage.css';

const TicketPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const ticketRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTicket = useCallback(async () => {
    try {
      const response = await api.get(`/participant/ticket/${ticketId}`);
      setTicket(response.data.ticket);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket');
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const map = { Approved: '#10b981', Pending: '#f59e0b', Rejected: '#ef4444' };
    return map[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="ticket-page">
        <div className="ticket-loading">
          <div className="spinner" />
          <p>Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-page">
        <div className="ticket-error">
          <div className="error-icon"></div>
          <h2>Ticket Not Found</h2>
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate('/participant/dashboard')}>
             Back
          </button>
        </div>
      </div>
    );
  }

  const { event, participant, registration } = ticket;
  const isMerchandise = event.type === 'Merchandise';

  return (
    <div className="ticket-page">
      {/* Top Bar - hidden on print */}
      <div className="ticket-topbar no-print">
        <button className="btn-back-nav" onClick={() => navigate('/participant/dashboard')}>
           Back
        </button>
        <div className="topbar-actions">
          <button className="btn-print" onClick={handlePrint}>
             Print Ticket
          </button>
        </div>
      </div>

      {/* Ticket Card */}
      <div className="ticket-wrapper" ref={ticketRef}>
        <div className={`ticket-card ${isMerchandise ? 'merch-ticket' : 'normal-ticket'}`}>

          {/* Header */}
          <div className="ticket-header">
            <div className="ticket-header-left">
              <div className="ticket-brand">Felicity</div>
              <h1 className="ticket-event-name">{event.name}</h1>
              <p className="ticket-organizer">by {event.organizer.name}</p>
            </div>
            <div className="ticket-header-right">
              <div className="ticket-status-wrap">
                <span
                  className="ticket-status"
                  style={{ background: `${getStatusColor(registration.paymentStatus)}22`, color: getStatusColor(registration.paymentStatus) }}
                >
                  {registration.paymentStatus === 'Approved' ? 'Confirmed' : registration.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Tear Line */}
          <div className="tear-line">
            <div className="tear-circle left" />
            <div className="tear-dots" />
            <div className="tear-circle right" />
          </div>

          {/* Body */}
          <div className="ticket-body">
            {/* Left - Details */}
            <div className="ticket-details">

              {/* Event Details */}
              <div className="details-section">
                <h3 className="section-title">Event Details</h3>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Date</span>
                    <span className="d-value">{formatDate(event.startDate)}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Time</span>
                    <span className="d-value">{formatTime(event.startDate)}</span>
                  </div>
                </div>
                {event.endDate && event.endDate !== event.startDate && (
                  <div className="detail-row">
                    <div>
                      <span className="d-label">End Date</span>
                      <span className="d-value">{formatDate(event.endDate)}</span>
                    </div>
                  </div>
                )}
                <div className="detail-row">
                  <div>
                    <span className="d-label">Eligibility</span>
                    <span className="d-value">{event.eligibility}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Fee Paid</span>
                    <span className="d-value">{event.registrationFee}</span>
                  </div>
                </div>
              </div>

              {/* Merchandise Details */}
              {isMerchandise && event.merchandiseDetails && (
                <div className="details-section merch-section">
                  <h3 className="section-title">Item Details</h3>
                  <div className="detail-row">
                    <div>
                      <span className="d-label">Item</span>
                      <span className="d-value">{event.merchandiseDetails.itemDetails}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Participant Details */}
              <div className="details-section">
                <h3 className="section-title">Participant</h3>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Name</span>
                    <span className="d-value">{participant.name}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Email</span>
                    <span className="d-value">{participant.email}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div>
                    <span className="d-label">Type</span>
                    <span className="d-value">
                      {participant.participantType === 'IIIT' ? 'IIIT Student' : 'External Participant'}
                    </span>
                  </div>
                </div>
                {participant.participantType !== 'IIIT' && participant.collegeName && (
                  <div className="detail-row">
                    <div>
                      <span className="d-label">College</span>
                      <span className="d-value">{participant.collegeName}</span>
                    </div>
                  </div>
                )}
                {registration.teamName && (
                  <div className="detail-row">
                    <div>
                      <span className="d-label">Team</span>
                      <span className="d-value">{registration.teamName}</span>
                    </div>
                  </div>
                )}
                {registration.teamRole && (
                  <div className="detail-row">
                    <div>
                      <span className="d-label">Team Role</span>
                      <span className="d-value">{registration.teamRole}</span>
                    </div>
                  </div>
                )}
                <div className="detail-row">
                  <div>
                    <span className="d-label">Registered On</span>
                    <span className="d-value">{formatDateTime(registration.registrationDate)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right - QR Code */}
            <div className="ticket-qr-section">
              <div className="qr-wrapper">
                {ticket.qrCode ? (
                  <img src={ticket.qrCode} alt="Ticket QR Code" className="qr-image" />
                ) : (
                  <div className="qr-placeholder">QR</div>
                )}
              </div>

              <div className="ticket-id-section">
                <p className="ticket-id-label">TICKET ID</p>
                <p className="ticket-id-value">{ticketId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
