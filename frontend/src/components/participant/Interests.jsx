import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Interests.css';
import api from '../../services/api';

import art from '../images/art.png';
import music from '../images/music.png';
import stars from '../images/stars.png';
import robodebateticsImg from '../images/debate.png';
import dance from '../images/dance.png';
import sports from '../images/sports.png';
import vid_games from '../images/vid_games.png';
import lit from '../images/lit.png';
import adv from '../images/adv.png';
import photo from '../images/photo.png';
import cook from '../images/cook.png';
import theory from '../images/theory.png';

const interestsData = [
  { id: 'art', image: art },
  { id: 'music', image: music },
  { id: 'astronomy', image: stars },
  { id: 'debate', image: robodebateticsImg },
  { id: 'dance', image: dance },
  { id: 'sports', image: sports },
  { id: 'gaming', image: vid_games },
  { id: 'literature', image: lit },
  { id: 'adventure', image: adv },
  { id: 'photography', image: photo },
  { id: 'cooking', image: cook },
  { id: 'theory', image: theory }
];

const Interests = () => {
  const [selectedInterests, setSelectedInterests] = useState([]);
  const navigate = useNavigate();

  const toggleInterest = (id) => {
    setSelectedInterests((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

// Change the navigation after saving interests:

const handleContinue = async () => {
  try {
    await api.post('/user/interests', {
      interests: selectedInterests
    });

    navigate('/participant/follow-clubs');
  } catch (error) {
    console.error(error.response?.data || error.message);
    alert('Failed to save interests');
  }
};

const handleSkip = async () => {
  try {
    await api.post('/user/interests', {
      interests: []
    });

    navigate('/participant/follow-clubs');
  } catch (error) {
    console.error(error.response?.data || error.message);
    alert('Failed to skip');
  }
};

  return (
    <div className="interests-container">
      <h1>Select Your Interests</h1>

      <div className="interests-grid">
        {interestsData.map((interest) => (
          <div
            key={interest.id}
            className={`interest-card ${
              selectedInterests.includes(interest.id) ? 'selected' : ''
            }`}
            onClick={() => toggleInterest(interest.id)}
          >
            <img src={interest.image} alt={interest.label} />
            <span>{interest.label}</span>
          </div>
        ))}
      </div>

      <button
        className="continue-btn"
        disabled={selectedInterests.length === 0}
        onClick={handleContinue}
      >
        Continue
      </button>
      <button
        className="skip-btn"
        onClick={handleSkip}
      >
        Skip
      </button>
    </div>
  );
};

export default Interests;
