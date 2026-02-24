import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

// Use '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' for local dev (Google's test key, always passes)
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const CAPTCHA_ENABLED = process.env.NODE_ENV === 'production' ||
  String(process.env.REACT_APP_RECAPTCHA_ENABLED || '').toLowerCase() === 'true';

const Register = () => {
  const navigate    = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    confirmPassword: '', participantType: 'IIIT', collegeName: '', contactNumber: ''
  });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const containerRef = useRef(null);
  const widgetId     = useRef(null);

  const { firstName, lastName, email, password, confirmPassword, participantType, collegeName, contactNumber } = formData;

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return;
    if (window.grecaptcha) { setCaptchaReady(true); return; }
    const s = document.createElement('script');
    s.src    = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async  = true;
    s.defer  = true;
    s.onload = () => setCaptchaReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return;
    if (!captchaReady || !containerRef.current || widgetId.current !== null) return;
    widgetId.current = window.grecaptcha.render(containerRef.current, {
      sitekey:            RECAPTCHA_SITE_KEY,
      callback:           (t) => setCaptchaToken(t),
      'expired-callback': ()  => setCaptchaToken(''),
      'error-callback':   ()  => setCaptchaToken('')
    });
  }, [captchaReady]);

  const resetCaptcha = () => {
    if (widgetId.current !== null && window.grecaptcha) window.grecaptcha.reset(widgetId.current);
    setCaptchaToken('');
  };

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName || !lastName || !email || !password || !confirmPassword || !participantType) {
      setError('Please fill in all required fields'); return;
    }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (participantType === 'NON_IIIT' && !collegeName) { setError('Please enter your college/organization name'); return; }
    if (CAPTCHA_ENABLED && !captchaToken) { setError('Please complete the CAPTCHA verification'); return; }

    setLoading(true);
    const result = await register({
      firstName, lastName, email, password, participantType,
      collegeName: participantType === 'NON_IIIT' ? collegeName : undefined,
      contactNumber, captchaToken: CAPTCHA_ENABLED ? captchaToken : ''
    });
    setLoading(false);

    if (result.success) {
      navigate('/participant/interests');
    } else {
      setError(result.message);
      resetCaptcha();
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <h1>Felicity</h1>
          <h2>Create Your Account</h2>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input type="text" name="firstName" value={firstName} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input type="text" name="lastName" value={lastName} onChange={handleChange} className="form-control" required />
            </div>
          </div>

          <div className="form-group">
            <label>Participant Type *</label>
            <select name="participantType" value={participantType} onChange={handleChange} className="form-control" required>
              <option value="IIIT">IIIT Student</option>
              <option value="NON_IIIT">Non-IIIT Participant</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Email Address *
              {participantType === 'IIIT' && <span className="email-hint"> (Use @iiit.ac.in)</span>}
            </label>
            <input type="email" name="email" value={email} onChange={handleChange} className="form-control" required />
          </div>

          {participantType === 'NON_IIIT' && (
            <div className="form-group">
              <label>College/Organization Name *</label>
              <input type="text" name="collegeName" value={collegeName} onChange={handleChange} className="form-control" required />
            </div>
          )}

          <div className="form-group">
            <label>Contact Number (Optional)</label>
            <input type="tel" name="contactNumber" value={contactNumber} onChange={handleChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input type="password" name="password" value={password} onChange={handleChange} className="form-control" required />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input type="password" name="confirmPassword" value={confirmPassword} onChange={handleChange} className="form-control" required />
          </div>

          {CAPTCHA_ENABLED && (
            <div className="form-group captcha-group">
              <div ref={containerRef} />
              {!captchaReady && <p className="captcha-loading">Loading CAPTCHA...</p>}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>

          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;