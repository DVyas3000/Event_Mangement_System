import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Use Google's public test key in local dev when no env key is set.
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const CAPTCHA_ENABLED = process.env.NODE_ENV === 'production' ||
  String(process.env.REACT_APP_RECAPTCHA_ENABLED || '').toLowerCase() === 'true';

const Login = () => {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData]         = useState({ email: '', password: '', role: 'participant' });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const containerRef = useRef(null);
  const widgetId     = useRef(null);

  const { email, password, role } = formData;

useEffect(() => {
  if (!CAPTCHA_ENABLED) return;

  if (window.grecaptcha && window.grecaptcha.render) {
    setCaptchaReady(true);
    return;
  }

  // Use grecaptcha onload callback
  window.onRecaptchaLoad = () => setCaptchaReady(true);

  const s = document.createElement('script');
  s.src   = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
  s.async = true;
  s.defer = true;
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
    if (!email || !password || !role) { setError('Please fill in all fields'); return; }
    if (CAPTCHA_ENABLED && !captchaToken) { setError('Please complete the CAPTCHA verification'); return; }
    setLoading(true);
    const result = await login(email, password, role, CAPTCHA_ENABLED ? captchaToken : '');
    setLoading(false);
    if (result.success) {
      if (role === 'participant') navigate('/participant/dashboard');
      else if (role === 'organizer') navigate('/organizer/organizerdashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    } else {
      setError(result.message);
      resetCaptcha();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Felicity</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Login</h2>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <select name="role" value={role} onChange={handleChange} className="form-control" required>
              <option value="participant">Participant</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" value={email}
              onChange={handleChange} className="form-control" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={password}
              onChange={handleChange} className="form-control" required />
          </div>

          {CAPTCHA_ENABLED && (
            <div className="form-group captcha-group">
              <div ref={containerRef} />
              {!captchaReady && <p className="captcha-loading">Loading CAPTCHA...</p>}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {role === 'participant' && (
            <div className="form-footer">
              <p>Don't have an account? <Link to="/register">Signup</Link></p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
