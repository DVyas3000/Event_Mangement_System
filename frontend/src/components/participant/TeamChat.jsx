import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { teamAPI } from '../../services/api';
import './TeamChat.css';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000';

const TeamChat = ({ team, currentUser }) => {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showOnline, setShowOnline]   = useState(false);
  const [linkInput, setLinkInput]     = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unread, setUnread]           = useState(0);
  const [isVisible, setIsVisible]     = useState(true);

  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);
  const token       = localStorage.getItem('token');

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Load message history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await teamAPI.getMessages(team._id);
        setMessages(res.data.messages || []);
      } catch (err) {
        setError('Failed to load message history');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [team._id, token]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  // Setup socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_team', team._id);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!isVisible) setUnread(u => u + 1);
      scrollToBottom();
    });

    socket.on('online_users', ({ users }) => setOnlineUsers(users));

    socket.on('typing_update', ({ typing }) => setTypingUsers(typing));

    socket.on('connect_error', () => setError('Real-time connection failed. Messages may be delayed.'));

    return () => socket.disconnect();
  }, [team._id, token, isVisible, scrollToBottom]);

  // Track tab visibility for unread count
  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(!document.hidden);
      if (!document.hidden) setUnread(0);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Update page title with unread count
  useEffect(() => {
    if (unread > 0) document.title = `(${unread}) Team Chat - ${team.name}`;
    else document.title = `Team Chat - ${team.name}`;
    return () => { document.title = 'Felicity'; };
  }, [unread, team.name]);

  const sendTypingStart = () => {
    socketRef.current?.emit('typing_start', { teamId: team._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { teamId: team._id });
    }, 2000);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTypingStart();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    clearTimeout(typingTimer.current);
    socketRef.current?.emit('typing_stop', { teamId: team._id });
    socketRef.current?.emit('send_message', { teamId: team._id, content: text, type: 'text' });
  };

  const handleSendLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    socketRef.current?.emit('send_message', { teamId: team._id, content: url, type: 'link' });
    setLinkInput('');
    setShowLinkModal(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isLink = (str) => {
    try { new URL(str); return str.startsWith('http'); } catch { return false; }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const myId = currentUser?.id || currentUser?._id;

  const resolveSenderLabel = (msg) => {
    const senderId = msg.sender?.toString();
    if (senderId && senderId === myId?.toString()) return 'You';

    if (msg.senderName && msg.senderName.trim() && msg.senderName !== 'User') {
      return msg.senderName.trim();
    }

    const leaderId = (team.leader?._id || team.leader)?.toString();
    if (senderId && leaderId === senderId) {
      const leaderName = `${team.leader?.firstName || ''} ${team.leader?.lastName || ''}`.trim();
      if (leaderName) return leaderName;
    }

    const member = team.members?.find((m) => m.user?._id?.toString() === senderId);
    if (member?.user) {
      const memberName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim();
      if (memberName) return memberName;
    }

    const online = onlineUsers.find((u) => u.id?.toString() === senderId);
    if (online?.name && online.name !== 'User') return online.name;

    return 'User';
  };

  if (loading) return <div className="tc-loading"><div className="tc-spinner" /><p>Loading...</p></div>;

  return (
    <div className="tc-container">
      {/* Header */}
      <div className="tc-header">
        <div className="tc-header-left">
          <div>
            <h3 className="tc-title">{team.name}</h3>
            <span className="tc-subtitle">{onlineUsers.length} online</span>
          </div>
        </div>
        <div className="tc-header-right">
          {unread > 0 && <span className="tc-unread-badge">{unread} new</span>}
          <button className="tc-members-btn" onClick={() => setShowOnline(s => !s)}>
            User: {onlineUsers.length}
          </button>
        </div>
      </div>

      <div className="tc-body">
        {/* Online sidebar */}
        {showOnline && (
          <div className="tc-sidebar">
            <h4>Online Members</h4>
            {onlineUsers.length === 0 ? (
              <p className="tc-empty-online">No one online</p>
            ) : (
              onlineUsers.map((u, i) => (
                <div key={i} className="tc-online-user">
                  <span className="tc-online-dot" />
                  <span>{u.name}</span>
                </div>
              ))
            )}
            <h4 style={{ marginTop: 16 }}>All Members</h4>
            <div className="tc-online-user">
              <span className="tc-online-dot" style={{ background: onlineUsers.some(u => u.id === (team.leader?._id || team.leader)?.toString()) ? '#22c55e' : '#d1d5db' }} />
              <span>{team.leader?.firstName} {team.leader?.lastName} <em>(Leader)</em></span>
            </div>
            {team.members?.filter(m => m.status === 'Accepted').map((m, i) => (
              <div key={i} className="tc-online-user">
                <span className="tc-online-dot" style={{ background: onlineUsers.some(u => u.id === m.user?._id?.toString()) ? '#22c55e' : '#d1d5db' }} />
                <span>{m.user?.firstName} {m.user?.lastName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div className="tc-messages">
          {error && <div className="tc-error">{error}</div>}

          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="tc-date-divider"><span>{date}</span></div>
              {msgs.map((msg) => {
                const isMe = msg.sender?.toString() === myId?.toString();
                const senderLabel = resolveSenderLabel(msg);
                return (
                  <div key={msg._id} className={`tc-message ${isMe ? 'tc-mine' : 'tc-theirs'}`}>
                    <div className="tc-bubble-wrap">
                      <span className="tc-sender-name">{senderLabel}</span>
                      <div className={`tc-bubble ${isMe ? 'tc-bubble-mine' : 'tc-bubble-theirs'} ${msg.type === 'link' ? 'tc-bubble-link' : ''}`}>
                        {msg.type === 'link' ? (
                          <a href={msg.content} target="_blank" rel="noopener noreferrer" className="tc-link">
                            🔗 {msg.content}
                          </a>
                        ) : msg.type === 'file' ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="tc-link">
                            📎 {msg.fileName || 'File'}
                          </a>
                        ) : (
                          <span className="tc-text">{msg.content}</span>
                        )}
                        <span className="tc-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="tc-typing">
              <div className="tc-typing-dots"><span /><span /><span /></div>
              <span>{typingUsers.slice(0, 2).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="tc-input-area">
        <button className="tc-attach-btn" title="Share link" onClick={() => setShowLinkModal(true)}>Share</button>
        <textarea
          className="tc-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <div className="tc-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="tc-modal" onClick={e => e.stopPropagation()}>
            <h4>Share a Link</h4>
            <input
              type="url"
              className="tc-link-input"
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendLink()}
              autoFocus
            />
            <div className="tc-modal-actions">
              <button className="tc-cancel-btn" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="tc-send-link-btn" onClick={handleSendLink} disabled={!linkInput.trim()}>Share</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;
