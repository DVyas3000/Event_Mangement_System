import React, { useState, useEffect } from 'react';
import { useAuth } from './../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    participantType: '',
    collegeName: '',
    contactNumber: '',
    areasOfInterest: [],
    followedClubs: []
  });

  // Editable fields
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  // Interests
  const [newInterest, setNewInterest] = useState('');
  const availableInterests = [
    'Music', 'Dance', 'Arts', 'Photography',
    'Sports', 'Video Games', 'Adventure', 'Theory',
    'Art', 'Cooking', 'Debate', 'Stars'
  ];

  // Clubs
  const [availableClubs, setAvailableClubs] = useState([]);
  const [followingClubs, setFollowingClubs] = useState([]);

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchClubs();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await participantAPI.getProfile();

      const profile = response.data.profile;
      setProfileData(profile);
      setEditedData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        contactNumber: profile.contactNumber || '',
        collegeName: profile.collegeName || '',
        areasOfInterest: profile.areasOfInterest || []
      });
      setFollowingClubs(profile.followedClubs || []);
    } catch (err) {
      console.error('Fetch Profile Error:', err);
      setError('Failed to load profile');
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await participantAPI.getClubs();
      setAvailableClubs(response.data.clubs || []);
    } catch (err) {
      console.error('Fetch Clubs Error:', err);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await participantAPI.updateProfile(editedData);

      setProfileData(response.data.profile);
      setEditMode(false);
      setSuccess('Profile updated successfully!');
      
      // Update localStorage user data
      const updatedUser = {
        ...user,
        firstName: response.data.profile.firstName,
        lastName: response.data.profile.lastName
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInterest = () => {
    if (newInterest && !editedData.areasOfInterest.includes(newInterest)) {
      setEditedData({
        ...editedData,
        areasOfInterest: [...editedData.areasOfInterest, newInterest]
      });
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest) => {
    setEditedData({
      ...editedData,
      areasOfInterest: editedData.areasOfInterest.filter(i => i !== interest)
    });
  };

  const handleToggleFollow = async (clubId) => {
    try {
      const response = await participantAPI.followClub(clubId);

      setSuccess(response.data.message);
      fetchProfile(); // Refresh to get updated followed clubs
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update following status');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await participantAPI.changePassword(passwordData);

      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
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

  const isFollowing = (clubId) => {
    return followingClubs.some(club => club._id === clubId);
  };

  return (
    <div className="profile-container">
      {/* Navbar */}
      <nav className="profile-navbar">
        <div className="navbar-brand">
          <h2>Felicity</h2>
        </div>
        <div className="navbar-menu">
          <button onClick={() => navigate('/participant/dashboard')} className="btn-back">
             Dashboard
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="profile-content">
        {/* Sidebar */}
        <aside className="profile-sidebar">

          <div className="sidebar-menu">
            <button
              className={`menu-item profile-info-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Information
            </button>
            <button
              className={`menu-item ${activeTab === 'interests' ? 'active' : ''}`}
              onClick={() => setActiveTab('interests')}
            >
              Interests
            </button>
            <button
              className={`menu-item ${activeTab === 'clubs' ? 'active' : ''}`}
              onClick={() => setActiveTab('clubs')}
            >
              Follow Clubs
            </button>
            <button
              className={`menu-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <main className="profile-main">
          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              {error}
              <button onClick={() => setError('')} className="alert-close">x</button>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              {success}
              <button onClick={() => setSuccess('')} className="alert-close">x</button>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2 className="profile-info-title">Profile Information</h2>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="btn-edit">
                     Edit Profile
                  </button>
                ) : (
                  <div className="edit-buttons">
                    <button onClick={() => setEditMode(false)} className="btn-cancel">
                      Cancel
                    </button>
                    <button onClick={handleUpdateProfile} disabled={loading} className="btn-save">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.firstName}
                        onChange={(e) => setEditedData({...editedData, firstName: e.target.value})}
                        className="form-control"
                      />
                    ) : (
                      <p className="form-value">{profileData.firstName}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.lastName}
                        onChange={(e) => setEditedData({...editedData, lastName: e.target.value})}
                        className="form-control"
                      />
                    ) : (
                      <p className="form-value">{profileData.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address <span className="non-editable">(Non-editable)</span></label>
                  <p className="form-value disabled">{profileData.email}</p>
                </div>

                <div className="form-group">
                  <label>Participant Type <span className="non-editable">(Non-editable)</span></label>
                  <p className="form-value disabled">
                    {profileData.participantType === 'IIIT' ? 'IIIT Student' : 'Non-IIIT Participant'}
                  </p>
                </div>

                {profileData.participantType === 'NON_IIIT' && (
                  <div className="form-group">
                    <label>College/Organization Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.collegeName}
                        onChange={(e) => setEditedData({...editedData, collegeName: e.target.value})}
                        className="form-control"
                      />
                    ) : (
                      <p className="form-value">{profileData.collegeName || 'Not specified'}</p>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Contact Number</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editedData.contactNumber}
                      onChange={(e) => setEditedData({...editedData, contactNumber: e.target.value})}
                      className="form-control"
                    />
                  ) : (
                    <p className="form-value">{profileData.contactNumber || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interests Tab */}
          {activeTab === 'interests' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Your Interests</h2>
              </div>

              <div className="interests-section">
                <div className="add-interest">
                  <select
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    className="form-control"
                  >
                    <option value="">Select an interest..</option>
                    {availableInterests
                      .filter(interest => !editedData.areasOfInterest?.includes(interest))
                      .map(interest => (
                        <option key={interest} value={interest}>{interest}</option>
                      ))
                    }
                  </select>
                  <button onClick={handleAddInterest} className="btn-add">
                    + Add Interest
                  </button>
                </div>

                <div className="interests-grid">
                  {editedData.areasOfInterest?.length === 0 ? (
                    <p className="empty-state">No interests selected yet. Add some!</p>
                  ) : (
                    editedData.areasOfInterest?.map(interest => (
                      <div key={interest} className="interest-tag">
                        {interest}
                        <button
                          onClick={() => handleRemoveInterest(interest)}
                          className="remove-btn"
                        >
                          
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="btn-save-interests"
                >
                  {loading ? 'Saving...' : 'Save Interests'}
                </button>
              </div>
            </div>
          )}

          {/* Clubs Tab */}
          {activeTab === 'clubs' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Follow Clubs</h2>
                <p className="subtitle">Stay updated with events from your favorite clubs</p>
              </div>

              <div className="clubs-grid">
                {availableClubs.length === 0 ? (
                  <p className="empty-state">No clubs available at the moment</p>
                ) : (
                  availableClubs.map(club => (
                    <div key={club._id} className="club-card">
                      <div className="club-header">
                        <h3>{club.name}</h3>
                        <span className={`club-category ${club.category.toLowerCase()}`}>
                          {club.category}
                        </span>
                      </div>
                      <p className="club-description">{club.description || 'No description available'}</p>
                      <button
                        onClick={() => handleToggleFollow(club._id)}
                        className={`btn-follow ${isFollowing(club._id) ? 'following' : ''}`}
                      >
                        {isFollowing(club._id) ? ' Following' : '+ Follow'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Change Password</h2>
              </div>

              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-change-password">
                  {loading ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Profile;
