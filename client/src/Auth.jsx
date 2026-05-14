import React, { useState } from 'react';
import { Mail, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE_URL}/api`;

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/login' : '/register';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          onLogin(data.token, data.username);
        } else {
          setIsLogin(true);
          setError('Account created! Please sign in.');
          setUsername('');
          setPassword('');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card surface"
      >
        <div className="auth-header">
          <h1>{isLogin ? 'Welcome Back' : 'Join the Nexus'}</h1>
          <p>{isLogin ? 'Sign in to share your thoughts' : 'Create an account to start posting'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input
              type="text"
              className="styled-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              className="styled-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#FF2E93', textAlign: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
              {error}
            </motion.div>
          )}

          <button type="submit" className="btn btn-gradient" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Access Interface' : 'Initialize Account')}
            {!isLoading && <Zap size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? "New to the network?" : "Already established?"}
          <button
            type="button"
            className="auth-toggle"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default Auth;
