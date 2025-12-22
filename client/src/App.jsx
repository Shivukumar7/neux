import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenLine,
  Trash2,
  Save,
  X,
  Edit3,
  Calendar,
  PlusCircle,
  MessageSquare,
  Sparkles,
  LogOut,
  ThumbsUp,
  ThumbsDown,
  User,
  XCircle
} from 'lucide-react';
import Auth from './Auth';

const API_URL = 'http://localhost:3000/api/blogs';



function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [blogs, setBlogs] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteParams, setDeleteParams] = useState(null);
  const [notification, setNotification] = useState(null); // { message, type: 'error'|'success' }
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (token) {
      fetchBlogs();
    }
  }, [token, selectedDate]);

  const handleLogin = (newToken, newUsername) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setBlogs([]);
  };

  const fetchBlogs = async () => {
    // If not authenticated, don't fetch or clear blogs
    if (!token) return;

    try {
      setIsLoading(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`${API_URL}?date=${formattedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBlogs(data);
      } else if (response.status === 401 || response.status === 403) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewContent('');
        fetchBlogs();
      } else {
        setNotification({
          message: data.error || 'Failed to create post',
          type: 'error',
          icon: 'limit' // specific icon for limit
        });
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      setNotification({ message: 'Network error occurred', type: 'error' });
    }
  };

  const handleVote = async (id, currentVote, type) => {
    // If clicking same vote type, toggle to 'none'
    const newVote = currentVote === type ? 'none' : type;

    // Optimistic update
    setBlogs(blogs.map(blog => {
      if (blog.id === id) {
        let scoreDiff = 0;
        // Remove old vote effect
        if (currentVote === 'up') scoreDiff -= 1;
        if (currentVote === 'down') scoreDiff += 1;

        // Add new vote effect
        if (newVote === 'up') scoreDiff += 1;
        if (newVote === 'down') scoreDiff -= 1;

        return { ...blog, user_vote: newVote, score: (Number(blog.score) || 0) + scoreDiff };
      }
      return blog;
    }));

    try {
      await fetch(`${API_URL}/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote_type: newVote })
      });
      // specific error handling if needed, but optimistic UI usually sufficient
    } catch (error) {
      console.error('Vote failed:', error);
      // Could revert state here
      fetchBlogs();
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteParams({ id });
  };

  const confirmDelete = async () => {
    if (!deleteParams) return;

    try {
      const response = await fetch(`${API_URL}/${deleteParams.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchBlogs();
        setDeleteParams(null);
      } else {
        const errData = await response.json();
        setNotification({ message: 'Failed to delete: ' + (errData.error || 'Unknown error'), type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      setNotification({ message: 'Error deleting blog: ' + error.message, type: 'error' });
    }
  };

  const cancelDelete = () => {
    setDeleteParams(null);
  };

  const startEditing = (blog) => {
    setEditingId(blog.id);
    setEditContent(blog.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (response.ok) {
        setEditingId(null);
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error updating blog:', error);
    }
  };



  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <header className="app-header">
        <div className="header-content">
          <div className="logo-container">
            <Sparkles className="logo-icon" size={32} />
            <h1>Thought of the Day</h1>
          </div>
          <div className="header-controls">
            <button onClick={handleLogout} className="btn-icon logout-btn" title="Sign Out">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="layout-grid">
          <div className="feed-column">
            <section className="create-section glass-card">
              <div className="section-header">
                <PlusCircle className="section-icon" size={20} />
                <h2>New Entry</h2>
              </div>
              <form onSubmit={handleCreate}>
                <div className="input-wrapper">
                  <textarea
                    className="blog-input"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="What's on your mind today?"
                    rows={3}
                  />
                </div>
                <div className="form-footer">
                  <button type="submit" className="btn btn-primary">
                    <PenLine size={18} />
                    <span>Post Memory</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="blogs-list">
              {/* Your Thoughts Section */}
              <div className="list-header">
                <User size={20} />
                <h2>Your Thoughts</h2>
              </div>

              {isLoading ? (
                <div className="loading-state"><div className="spinner"></div></div>
              ) : (
                <div className="cards-grid" style={{ marginBottom: '3rem' }}>
                  {blogs.filter(b => b.username === username).length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {blogs.filter(b => b.username === username).map((blog) => (
                        <motion.div
                          key={blog.id}
                          layout
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="blog-card glass-card"
                        >
                          <div className="card-content">
                            {editingId === blog.id ? (
                              <div className="edit-mode">
                                <textarea
                                  className="blog-input edit-input"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={5}
                                  autoFocus
                                />
                                <div className="action-buttons">
                                  <button onClick={() => handleUpdate(blog.id)} className="btn btn-save" title="Save">
                                    <Save size={18} />
                                  </button>
                                  <button onClick={cancelEditing} className="btn btn-cancel" title="Cancel">
                                    <X size={18} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="view-mode">
                                <div className="blog-text">{blog.content}</div>
                                <div className="card-footer">
                                  <div className="meta-info">
                                    <span className="info-pill">
                                      <User size={14} />
                                      <span className="username">You</span>
                                    </span>
                                  </div>

                                  <div className="vote-actions">
                                    <button
                                      onClick={() => handleVote(blog.id, blog.user_vote, 'up')}
                                      className={`btn-icon vote-btn ${blog.user_vote === 'up' ? 'voted-up' : ''}`}
                                    >
                                      <ThumbsUp size={18} />
                                    </button>
                                    <span className={`vote-count ${blog.score > 0 ? 'positive' : blog.score < 0 ? 'negative' : ''}`}>
                                      {blog.score || 0}
                                    </span>
                                    <button
                                      onClick={() => handleVote(blog.id, blog.user_vote, 'down')}
                                      className={`btn-icon vote-btn ${blog.user_vote === 'down' ? 'voted-down' : ''}`}
                                    >
                                      <ThumbsDown size={18} />
                                    </button>
                                  </div>

                                  <div className="action-buttons">
                                    <button onClick={() => startEditing(blog)} className="btn-icon edit" title="Edit">
                                      <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteClick(blog.id)} className="btn-icon delete" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <p className="text-secondary" style={{ fontStyle: 'italic', opacity: 0.7 }}>You haven't posted any thoughts yet.</p>
                  )}
                </div>
              )}

              {/* Community Thoughts Section */}
              <div className="list-header">
                <MessageSquare size={20} />
                <h2>Community Thoughts</h2>
              </div>

              {isLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="cards-grid">
                  <AnimatePresence mode="popLayout">
                    {blogs
                      .filter(b => b.username !== username)
                      .sort((a, b) => Number(b.score) - Number(a.score) || new Date(b.created_at) - new Date(a.created_at))
                      .map((blog) => (
                        <motion.div
                          key={blog.id}
                          layout
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="blog-card glass-card"
                        >
                          <div className="card-content">
                            <div className="view-mode">
                              <div className="blog-text">{blog.content}</div>
                              <div className="card-footer">
                                <div className="meta-info">
                                  <span className="info-pill">
                                    <User size={14} />
                                    <span className="username">{blog.username || 'Anonymous'}</span>
                                  </span>
                                </div>

                                <div className="vote-actions">
                                  <button
                                    onClick={() => handleVote(blog.id, blog.user_vote, 'up')}
                                    className={`btn-icon vote-btn ${blog.user_vote === 'up' ? 'voted-up' : ''}`}
                                  >
                                    <ThumbsUp size={18} />
                                  </button>
                                  <span className={`vote-count ${blog.score > 0 ? 'positive' : blog.score < 0 ? 'negative' : ''}`}>
                                    {blog.score || 0}
                                  </span>
                                  <button
                                    onClick={() => handleVote(blog.id, blog.user_vote, 'down')}
                                    className={`btn-icon vote-btn ${blog.user_vote === 'down' ? 'voted-down' : ''}`}
                                  >
                                    <ThumbsDown size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>

          <aside className="sidebar-column">
            <div className="calendar-widget glass-card">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="EEEE, MMMM d, yyyy"
                maxDate={new Date()}
                inline
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {
        deleteParams && (
          <div className="modal-overlay">
            <div className="modal-content glass-card">
              <h3>Delete Memory?</h3>
              <p>Are you sure you want to delete this specific memory? This action cannot be undone.</p>
              <div className="modal-actions">
                <button onClick={cancelDelete} className="btn btn-secondary">Cancel</button>
                <button onClick={confirmDelete} className="btn btn-danger">Delete</button>
              </div>
            </div>
          </div>
        )
      }
      {/* Notification Modal */}
      {
        notification && (
          <div className="modal-overlay" onClick={() => setNotification(null)}>
            <div className="modal-content glass-card notification-modal" onClick={e => e.stopPropagation()}>
              <div className={`notification-icon-wrapper ${notification.type}`}>
                {notification.icon === 'limit' ? (
                  <AlertTriangle size={48} className="icon-limit" />
                ) : notification.type === 'error' ? (
                  <XCircle size={48} />
                ) : (
                  <CheckCircle size={48} />
                )}
              </div>

              <h3 className="notification-title">
                {notification.icon === 'limit' ? 'Daily Limit Reached' : notification.type === 'error' ? 'Something went wrong' : 'Success'}
              </h3>

              <p className="notification-message">{notification.message}</p>

              <button onClick={() => setNotification(null)} className="btn btn-primary full-width">
                Got it
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
