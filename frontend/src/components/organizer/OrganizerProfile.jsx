import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { organizerAPI } from '../../services/api'; // FIX #12: use centralized api service
import './OrganizerProfile.css';

const OrganizerProfile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  const [activeTab, setActiveTab] = useState('profile');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await organizerAPI.getProfile();
        setProfileData(response.data.profile);
        setEditedData({
          name: response.data.profile.name,
          description: response.data.profile.description || '',
          contactEmail: response.data.profile.contactEmail || '',
          contactNumber: response.data.profile.contactNumber || '',
          discordWebhook: response.data.profile.discordWebhook || ''
        });
      } catch (err) {
        setError('Failed to load profile');
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await organizerAPI.updateProfile(editedData);
      setProfileData(response.data.profile);
      setEditMode(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await organizerAPI.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-container">
      {/* NAVBAR */}
      <nav className="profile-navbar">
        <h2>Felicity  Organizer Profile</h2>
        <div>
          <button onClick={() => navigate('/organizer/organizerdashboard')}>
             Dashboard
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="profile-content">
        {/* SIDEBAR */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <h3>{profileData.name}</h3>
            <p>{profileData.email}</p>
            <span>{profileData.category} Club</span>
          </div>
        </aside>

        {/* MAIN */}
        <main className="profile-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* TABS */}
          <div className="tabs">
            <button
              className={activeTab === 'profile' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={activeTab === 'security' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="profile-form">
              <div className="form-header">
                <h2>Organizer Information</h2>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}>Edit</button>
                ) : (
                  <>
                    <button onClick={() => setEditMode(false)}>Cancel</button>
                    <button onClick={handleUpdateProfile} disabled={loading}>
                      {loading ? 'Saving' : 'Save'}
                    </button>
                  </>
                )}
              </div>

              <div className="form-group">
                <label>Email (Non-editable)</label>
                <p>{profileData.email}</p>
              </div>

              <div className="form-group">
                <label>Category</label>
                <p>{profileData.category}</p>
              </div>

              <div className="form-group">
                <label>Club Name</label>
                {editMode ? (
                  <input
                    value={editedData.name}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  />
                ) : (
                  <p>{profileData.name}</p>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                {editMode ? (
                  <textarea
                    value={editedData.description}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                  />
                ) : (
                  <p>{profileData.description || 'No description'}</p>
                )}
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                {editMode ? (
                  <input
                    value={editedData.contactEmail}
                    onChange={(e) => setEditedData({ ...editedData, contactEmail: e.target.value })}
                  />
                ) : (
                  <p>{profileData.contactEmail || 'Not specified'}</p>
                )}
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                {editMode ? (
                  <input
                    value={editedData.contactNumber}
                    onChange={(e) => setEditedData({ ...editedData, contactNumber: e.target.value })}
                  />
                ) : (
                  <p>{profileData.contactNumber || 'Not specified'}</p>
                )}
              </div>

              <div className="form-group">
                <label>Discord Webhook</label>
                {editMode ? (
                  <input
                    value={editedData.discordWebhook}
                    onChange={(e) => setEditedData({ ...editedData, discordWebhook: e.target.value })}
                  />
                ) : (
                  <p>{profileData.discordWebhook || 'Not configured'}</p>
                )}
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="security-card">
              <h2>Change Password</h2>

              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="primary-btn">
                  {loading ? 'Changing' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OrganizerProfile;