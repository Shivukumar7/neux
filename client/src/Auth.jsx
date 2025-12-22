import React, { useState } from 'react';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

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
                    // Auto login after register or ask to login
                    setIsLogin(true);
                    setError('Registration successful! Please login.');
                    setUsername('');
                    setPassword('');
                }
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
            </div>

            <div className="glass-card" style={{ maxWidth: '400px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <div className="header-content" style={{ marginBottom: '2rem' }}>
                    <div className="logo-container" style={{ justifyContent: 'center' }}>
                        <Sparkles className="logo-icon" size={28} />
                        <h1 style={{ fontSize: '2rem' }}>Welcome</h1>
                    </div>
                    <p className="subtitle" style={{ textAlign: 'center' }}>{isLogin ? 'Sign in to your space' : 'Create your account'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-wrapper">
                        <User className="input-icon" size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            className="blog-input"
                            style={{ paddingLeft: '3rem' }}
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="input-wrapper">
                        <Lock className="input-icon" size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="password"
                            className="blog-input"
                            style={{ paddingLeft: '3rem' }}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight size={18} />
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                    >
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Auth;
