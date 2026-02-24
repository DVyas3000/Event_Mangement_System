import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Clubs.css';
import api from '../../services/api';

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [followingInProgress, setFollowingInProgress] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await api.get('/participant/clubs');
      setClubs(response.data.clubs || []);

      const profileResponse = await api.get('/participant/profile');
      const followedClubIds =
        profileResponse.data.profile.followedClubs?.map((club) =>
          typeof club === 'object' ? club._id : club
        ) || [];

      setFollowedClubs(followedClubIds);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError('Failed to load clubs');
      setLoading(false);
    }
  };

  const handleToggleFollow = async (clubId, clubName) => {
    if (followingInProgress[clubId]) return;

    const isFollowing = followedClubs.includes(clubId);

    setFollowingInProgress((prev) => ({ ...prev, [clubId]: true }));
    setError('');
    setSuccess('');

    try {
      await api.post(`/participant/follow/${clubId}`);

      if (isFollowing) {
        setFollowedClubs((prev) => prev.filter((id) => id !== clubId));
        setSuccess(`Unfollowed ${clubName}`);
      } else {
        setFollowedClubs((prev) => [...prev, clubId]);
        setSuccess(`Now following ${clubName}`);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || 'Failed to update following status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setFollowingInProgress((prev) => ({ ...prev, [clubId]: false }));
    }
  };

  const isFollowing = (clubId) => followedClubs.includes(clubId);

  const getCategoryColor = (category) => {
    const colors = {
      Technical: '#111111',
      Cultural: '#111111',
      Sports: '#111111',
      Social: '#111111',
      Academic: '#111111',
      Other: '#666666'
    };
    return colors[category] || '#666666';
  };

  if (loading) {
    return (
      <div className="clubs-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading clubs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clubs-page">
      <nav className="clubs-navbar">
        <button onClick={() => navigate('/participant/dashboard')} className="btn-back">
           Back
        </button>
        <h1>Clubs & Organizers</h1>
        <div className="following-count">
          Following: {followedClubs.length}
        </div>
      </nav>

      <div className="clubs-container">
        <div className="clubs-page-header">
          <h2>Discover Clubs</h2>
          <p>Follow clubs to get updates on their events</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {clubs.length === 0 ? (
          <div className="no-clubs">
            <h3>No Clubs Available</h3>
          </div>
        ) : (
          <div className="clubs-grid">
            {clubs.map((club) => {
              const following = isFollowing(club._id);
              const inProgress = followingInProgress[club._id];

              return (
                <div key={club._id} className="club-card">
                  {/* Info */}
                  <div className="club-content">
                    <h3>{club.name}</h3>

                    <span
                      className="club-category-badge"
                      style={{
                        background: `${getCategoryColor(club.category)}22`,
                        color: getCategoryColor(club.category)
                      }}
                    >
                      {club.category}
                    </span>

                    <p className="club-description">
                      {club.description || 'No description available'}
                    </p>

                    {club.contactEmail && (
                      <div className="club-contact">
                        {club.contactEmail}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="club-actions">

                    {/* DETAILS BUTTON */}
                    <button
                      className="btn-details"
                      onClick={() => navigate(`/participant/clubs/${club._id}`)}
                    >
                      Details
                    </button>

                    {/* FOLLOW BUTTON */}
                    <button
                      className={`btn-follow ${following ? 'following' : ''}`}
                      onClick={() => handleToggleFollow(club._id, club.name)}
                      disabled={inProgress}
                    >
                      {inProgress
                        ? 'Loading...'
                        : following
                        ? 'Following'
                        : 'Follow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubs;
