import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Follow_Clubs.css';
import api from '../../services/api';

const FollowClubs = () => {
  const [, setfollowedClubs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await api.get('/participant/clubs');
      setClubs(response.data.clubs || []);
      const profileResponse = await api.get('/participant/profile');
      const followedClubIds = profileResponse.data.profile.followedClubs?.map(club => 
      typeof club === 'object' ? club._id : club
      ) || [];
      setfollowedClubs(followedClubIds);
      setSelectedClubs(followedClubIds);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError('Failed to load clubs');
      setLoading(false);
    }
  };

    const toggleClub = (clubId) => {
        setSelectedClubs((prev) => {
        if (prev.includes(clubId)) {
            return prev.filter((id) => id !== clubId);
        } else {
            return [...prev, clubId];
        }
        });
    };

  const handleContinue = async () => {
    try {
      // Follow all selected clubs
      const followPromises = selectedClubs.map(clubId =>
        api.post(`/participant/follow/${clubId}`)
      );
      
      await Promise.all(followPromises);
      navigate('/participant/dashboard');
    } catch (error) {
      console.error(error.response?.data || error.message);
      setError('Failed to follow clubs');
    }
  };

  const handleSkip = () => {
    navigate('/participant/dashboard');
  };

  // Get category icon based on category
  const getCategoryIcon = (category) => {
    const icons = {
      Technical: '',
      Cultural: '',
      Sports: '',
      Social: '',
      Academic: '',
      Other: ''
    };
    return icons[category];
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      Technical: '#3b82f6',
      Cultural: '#ec4899',
      Sports: '#10b981',
      Social: '#f59e0b',
      Academic: '#8b5cf6',
      Other: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="follow-clubs-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading clubs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="follow-clubs-container">
      <div className="clubs-header">
        <h1>Follow Your Favorite Clubs</h1>
        <p>Stay updated with events from clubs you're interested in </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {clubs.length === 0 ? (
        <div className="no-clubs">
          <p>No clubs available at the moment</p>
          <button className="skip-btn" onClick={handleSkip}>
            Continue to Dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="clubs-grid">
            {clubs.map((club) => (
            <div
                key={club._id}
                className={`club-card ${selectedClubs.includes(club._id) ? 'selected' : ''}`}
                onClick={() => toggleClub(club._id)}
                style={{
                borderColor: selectedClubs.includes(club._id)
                    ? getCategoryColor(club.category)
                    : 'transparent'
                }}
            >
                <div
                className="club-icon"
                style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(club.category)}22, ${getCategoryColor(club.category)}44)`
                }}
                >
                <span style={{ fontSize: '2.5rem' }}>{getCategoryIcon(club.category)}</span>
                </div>

                <div className="club-info">
                <h3>{club.name}</h3>

                <span
                    className="club-category"
                    style={{
                    background: `${getCategoryColor(club.category)}22`,
                    color: getCategoryColor(club.category)
                    }}
                >
                    {club.category}
                </span>

                {club.description && (
                    <p className="club-description">
                    {club.description.length > 80 ? club.description.substring(0, 80) + '...' : club.description}
                    </p>
                )}

                <button
                    className="details-btn"
                    onClick={(e) => {
                    e.stopPropagation(); // IMPORTANT: dont toggle
                    navigate(`/participant/clubs/${club._id}`);
                    }}
                >
                    Details
                </button>
                </div>

                {selectedClubs.includes(club._id) && (
                <div className="selected-indicator">
                    <span></span>
                </div>
                )}
            </div>
            ))}
        </div>


          <div className="clubs-actions">
            <div className="selected-count">
              {selectedClubs.length} club{selectedClubs.length !== 1 ? 's' : ''} selected
            </div>
            
            <div className="action-buttons">
              <button className="skip-btn" onClick={handleSkip}>
                Skip for Now
              </button>
              
              <button
                className="continue-btn"
                onClick={handleContinue}
                disabled={selectedClubs.length === 0}
              >
                {selectedClubs.length > 0 
                  ? `Follow ${selectedClubs.length} Club${selectedClubs.length !== 1 ? 's' : ''}` 
                  : 'Continue'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FollowClubs;
