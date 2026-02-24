// components/participant/TeamRegistration.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamAPI } from '../../services/api';
import './TeamRegistration.css';
import TeamChat from './TeamChat';


const TeamRegistration = ({ event, onClose }) => {
  const navigate  = useNavigate();

  const [mode, setMode]         = useState(null); // 'create' | 'join'
  const [myTeam, setMyTeam]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Create form
  const [teamName, setTeamName] = useState('');
  const [maxSize, setMaxSize]   = useState(4);

  // Join form
  const [inviteCode, setInviteCode]   = useState('');
  const [preview, setPreview]         = useState(null);

  // Get current user safely
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Error parsing user from localStorage:', err);
      // If we can't get user, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => { 
    if (currentUser) {
      fetchMyTeam(); 
    }
  }, [currentUser]);

  const fetchMyTeam = async () => {
    setLoading(true);
    try {
      const res = await teamAPI.getMyTeam(event._id);
      setMyTeam(res.data.team);
    } catch {
      setMyTeam(null);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await teamAPI.createTeam({ eventId: event._id, teamName, maxSize: Number(maxSize) });
      setSuccess(res.data.message);
      setMyTeam(res.data.team);
      setMode(null);
      fetchMyTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const handlePreview = async () => {
    setError(''); setPreview(null);
    if (!inviteCode.trim()) return setError('Enter an invite code');
    try {
      const res = await teamAPI.previewTeam(inviteCode.trim());
      setPreview(res.data.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code');
    }
  };

  const handleJoin = async () => {
    setError(''); setSuccess('');
    try {
      const res = await teamAPI.joinTeam({ inviteCode: inviteCode.trim() });
      setSuccess(res.data.message);
      setMode(null);
      fetchMyTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join team');
    }
  };

  const handleDeleteTeam = async () => {
    if (!myTeam?._id) return;
    setError(''); setSuccess('');
    try {
      await teamAPI.deleteTeam(myTeam._id);
      setSuccess('Team deleted.');
      setMyTeam(null);
      setMode(null);
      setPreview(null);
      setInviteCode('');
      setTeamName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const copyInviteCode = () => {
    if (myTeam?.inviteCode) {
      navigator.clipboard.writeText(myTeam.inviteCode);
      setSuccess('Invite code copied!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="tr-modal-overlay" onClick={onClose}>
        <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tr-modal-body">
            <p>Loading team info...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentUserId = currentUser?._id || currentUser?.id;
  const isLeader = myTeam && myTeam.leader._id === currentUserId;
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="tr-modal-overlay" onClick={onClose}>
      <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tr-modal-header">
          <h2>Team Registration</h2>
          <button className="tr-close" onClick={onClose}>Ã—</button>
        </div>
        <div className="tr-modal-body">
          {error && <div className="tr-alert tr-alert-error">{error}</div>}
          {success && <div className="tr-alert tr-alert-success">{success}</div>}

          {/* Already in a team */}
          {myTeam && (
            <div className="tr-team-card">
              <div className="tr-team-header">
                <h3>{myTeam.name}</h3>
                <span className={`tr-status tr-status-${myTeam.status.toLowerCase()}`}>
                  {myTeam.status}
                </span>
              </div>

              {isLeader && myTeam.status === 'Forming' && (
                <div className="tr-invite-box">
                  <p className="tr-invite-label">Share this code with your team</p>
                  <div className="tr-invite-code">{myTeam.inviteCode}</div>
                  <button className="tr-btn-copy" onClick={copyInviteCode}>
                    ðŸ“‹ Copy Code
                  </button>
                  <p className="tr-invite-hint">
                    Members can join using this code. Team will be finalized when all {myTeam.maxSize} members join.
                  </p>
                  <button className="tr-btn-secondary" onClick={handleDeleteTeam}>
                    Delete Team
                  </button>
                </div>
              )}

              <div className="tr-team-info">
                <div className="tr-info-row">
                  <span className="tr-label">Leader:</span>
                  <span>{myTeam.leader.firstName} {myTeam.leader.lastName}</span>
                </div>
                <div className="tr-info-row">
                  <span className="tr-label">Team Size:</span>
                  <span>
                    {myTeam.members.filter(m => m.status === 'Accepted').length + 1} / {myTeam.maxSize}
                  </span>
                </div>
                <div className="tr-info-row">
                  <span className="tr-label">Your Role:</span>
                  <span>{isLeader ? 'Leader' : 'Member'}</span>
                </div>
                <div className="tr-info-row">
                  <span className="tr-label">Slots Left:</span>
                  <span>
                    {Math.max(0, myTeam.maxSize - (myTeam.members.filter(m => m.status === 'Accepted').length + 1))}
                  </span>
                </div>
              </div>

              <div className="tr-members">
                <h4>Team Members</h4>
                <div className="tr-member-item">
                  <span className="tr-member-name">
                    ðŸ‘‘ {myTeam.leader.firstName} {myTeam.leader.lastName}
                  </span>
                  <span className="tr-member-status tr-status-leader">Leader</span>
                </div>
                {myTeam.members.map((m, i) => (
                  <div key={i} className="tr-member-item">
                    <span className="tr-member-name">
                      {m.user.firstName} {m.user.lastName}
                    </span>
                    <span className={`tr-member-status tr-status-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>

              {myTeam.status === 'Complete' && (
                <div>
                  <div className="tr-complete-msg">
                    ✅ Team registration complete! Check your email for your ticket.
                  </div>
                  <button
                    className="tr-btn-primary"
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => setShowChat(s => !s)}
                  >
                    💬 {showChat ? 'Hide Team Chat' : 'Open Team Chat'}
                  </button>
                  {showChat && (
                    <div style={{ marginTop: '16px' }}>
                      <TeamChat team={myTeam} currentUser={currentUser} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No team yet - show options */}
          {!myTeam && !mode && (
            <div className="tr-choice">
              <p className="tr-description">
                Form a team of 2â€“{event.teamDetails?.maxTeamSize || 5} participants.
              </p>
              <div className="tr-choice-btns">
                <button className="tr-btn-primary" onClick={() => setMode('create')}>
                  Create a New Team
                </button>
                <button className="tr-btn-secondary" onClick={() => setMode('join')}>
                  Join with Invite Code
                </button>
              </div>
            </div>
          )}

          {/* Create Form */}
          {mode === 'create' && (
            <form onSubmit={handleCreate} className="tr-form">
              <h3 className="tr-form-title">Create Team</h3>
              <div className="tr-field">
                <label>Team Name</label>
                <input 
                  value={teamName} 
                  onChange={e => setTeamName(e.target.value)}
                  required 
                />
              </div>
              <div className="tr-field">
                <label>Team Size (including you)</label>
                <input 
                  type="number" 
                  min={2} 
                  max={event.teamDetails?.maxTeamSize || 10} 
                  value={maxSize}
                  onChange={e => setMaxSize(e.target.value)} 
                  required 
                />
                <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>
                  Min 2, Max {event.teamDetails?.maxTeamSize || 10}
                </span>
              </div>
              <div className="tr-form-actions">
                <button type="button" className="tr-btn-secondary" onClick={() => setMode(null)}>
                  Back
                </button>
                <button type="submit" className="tr-btn-primary">Create Team</button>
              </div>
            </form>
          )}

          {/* Join Form */}
          {mode === 'join' && (
            <div className="tr-form">
              <h3 className="tr-form-title">Join with Invite Code</h3>
              <div className="tr-field">
                <label>Invite Code</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input 
                    value={inviteCode} 
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="tr-btn-secondary"
                    onClick={handlePreview}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {preview && (
                <div className="tr-preview-box">
                  <h4>Team Preview</h4>
                  <div className="tr-info-row">
                    <span className="tr-label">Team Name:</span>
                    <span>{preview.name}</span>
                  </div>
                  <div className="tr-info-row">
                    <span className="tr-label">Leader:</span>
                    <span>{preview.leader.firstName} {preview.leader.lastName}</span>
                  </div>
                  <div className="tr-info-row">
                    <span className="tr-label">Size:</span>
                    <span>{preview.memberCount} / {preview.maxSize}</span>
                  </div>
                  <div className="tr-info-row">
                    <span className="tr-label">Event:</span>
                    <span>{preview.event.name}</span>
                  </div>
                  <div className="tr-info-row">
                    <span className="tr-label">Status:</span>
                    <span className={`tr-status tr-status-${preview.status.toLowerCase()}`}>
                      {preview.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="tr-form-actions">
                <button 
                  type="button" 
                  className="tr-btn-secondary" 
                  onClick={() => {
                    setMode(null);
                    setPreview(null);
                    setInviteCode('');
                  }}
                >
                  Back
                </button>
                <button 
                  type="button" 
                  className="tr-btn-primary"
                  onClick={handleJoin}
                  disabled={!preview}
                >
                  Join Team
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamRegistration;
