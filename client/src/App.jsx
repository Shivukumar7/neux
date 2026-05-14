import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Trash2, Edit2, LogOut, ChevronUp, ChevronDown, 
  Globe, User, Calendar as CalIcon, Box, Activity, Users, Plus, Key
} from 'lucide-react';
import Auth from './Auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE_URL}/api/blogs`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [blogs, setBlogs] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteParams, setDeleteParams] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('global'); // 'global' or 'personal'
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(null); // 'create' or 'join'
  const [groupForm, setGroupForm] = useState({ name: '', duration_hours: '24', join_code: '' });

  useEffect(() => {
    if (token) {
      fetchBlogs();
      fetchGroups();
    }
  }, [token, selectedDate, activeGroupId]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setGroups(await response.json());
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

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
    if (!token) return;
    try {
      setIsLoading(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      let url = `${API_URL}?date=${formattedDate}`;
      if (activeGroupId) {
        url += `&group_id=${activeGroupId}`;
      }

      const response = await fetch(url, {
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newContent, group_id: activeGroupId }),
      });

      if (response.ok) {
        setNewContent('');
        fetchBlogs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to post');
      }
    } catch (error) {
      console.error('Error creating:', error);
    }
  };

  const submitGroupModal = async () => {
    try {
      if (showGroupModal === 'create') {
        const res = await fetch(`${API_BASE_URL}/api/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: groupForm.name, duration_hours: groupForm.duration_hours }),
        });
        if (res.ok) {
          fetchGroups();
          setShowGroupModal(null);
          setGroupForm({ name: '', duration_hours: '24', join_code: '' });
        } else {
          const err = await res.json();
          alert(err.error);
        }
      } else if (showGroupModal === 'join') {
        const res = await fetch(`${API_BASE_URL}/api/groups/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ join_code: groupForm.join_code }),
        });
        if (res.ok) {
          fetchGroups();
          setShowGroupModal(null);
          setGroupForm({ name: '', duration_hours: '24', join_code: '' });
        } else {
          const err = await res.json();
          alert(err.error);
        }
      }
    } catch (error) {
      console.error('Error with group action:', error);
    }
  };

  const handleVote = async (id, currentVote, type) => {
    const newVote = currentVote === type ? 'none' : type;

    setBlogs(blogs.map(blog => {
      if (blog.id === id) {
        let scoreDiff = 0;
        if (currentVote === 'up') scoreDiff -= 1;
        if (currentVote === 'down') scoreDiff += 1;
        if (newVote === 'up') scoreDiff += 1;
        if (newVote === 'down') scoreDiff -= 1;
        return { ...blog, user_vote: newVote, score: (Number(blog.score) || 0) + scoreDiff };
      }
      return blog;
    }));

    try {
      await fetch(`${API_URL}/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ vote_type: newVote })
      });
    } catch (error) {
      console.error('Vote failed:', error);
      fetchBlogs();
    }
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
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      });
      if (response.ok) {
        setEditingId(null);
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  if (!token) return <Auth onLogin={handleLogin} />;

  const displayedBlogs = blogs.filter(b => activeTab === 'global' || b.username === username);

  return (
    <>
      <div className="mesh-bg">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>

      <div className="app-container">
        <header className="top-nav surface">
          <div className="brand">
            <div className="brand-icon"><Activity size={24} color="#000" /></div>
            <h1>Nexus</h1>
          </div>
          <div className="nav-actions">
            <div className="user-profile">
              <div className="avatar">{username ? username.charAt(0).toUpperCase() : 'U'}</div>
              <span>{username}</span>
            </div>
            <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <main className="main-grid">
          <div className="feed-column">
            
            <div className="compose-box surface">
              <div className="compose-header">
                <Box size={20} color="var(--secondary)" />
                <h2>Log a thought</h2>
              </div>
              <textarea 
                className="compose-input" 
                placeholder="Transmit your ideas to the network..." 
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
              />
              <div className="compose-footer">
                <button className="btn btn-gradient" onClick={handleCreate}>
                  <Send size={16} /> Transmit
                </button>
              </div>
            </div>

            <div className="feed-header">
              <h2>Neural Feed {activeGroupId ? `- ${groups.find(g => g.id === activeGroupId)?.name}` : ''}</h2>
              {!activeGroupId && (
                <div className="feed-tabs">
                  <button className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>
                    <Globe size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Global
                  </button>
                  <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
                    <User size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Personal
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="loader"></div>
            ) : displayedBlogs.length === 0 ? (
              <div className="empty-state">
                <Activity size={48} />
                <p>No transmissions found for this sector.</p>
              </div>
            ) : (
              <AnimatePresence>
                {displayedBlogs.map(blog => (
                  <motion.div 
                    key={blog.id} 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="post-card surface"
                  >
                    <div className="post-header">
                      <div className="post-author">
                        <div className="author-avatar">{blog.username.substring(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="author-name">{blog.username}</div>
                          <div className="post-time">{format(new Date(blog.created_at), 'HH:mm')}</div>
                        </div>
                      </div>
                      
                      {blog.username === username && (
                        <div className="post-actions-menu">
                          <button className="icon-btn" onClick={() => { setEditingId(blog.id); setEditContent(blog.content); }}>
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn danger" onClick={() => setDeleteParams({ id: blog.id })}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === blog.id ? (
                      <div style={{ marginBottom: '1rem' }}>
                        <textarea 
                          className="styled-input" 
                          style={{ minHeight: '100px', marginBottom: '1rem' }}
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                          <button className="btn btn-gradient" onClick={() => handleUpdate(blog.id)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="post-content">{blog.content}</div>
                    )}

                    <div className="post-footer">
                      <div className="vote-group">
                        <button 
                          className={`vote-btn up ${blog.user_vote === 'up' ? 'active' : ''}`}
                          onClick={() => handleVote(blog.id, blog.user_vote, 'up')}
                        >
                          <ChevronUp size={20} />
                        </button>
                        <div className="vote-score">{blog.score}</div>
                        <button 
                          className={`vote-btn down ${blog.user_vote === 'down' ? 'active' : ''}`}
                          onClick={() => handleVote(blog.id, blog.user_vote, 'down')}
                        >
                          <ChevronDown size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <aside>
            <div className="sidebar-panel surface" style={{ marginBottom: '1.5rem' }}>
              <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--primary)" />
                  <h3>Groups</h3>
                </div>
                <div>
                  <button className="icon-btn" title="Create Group" onClick={() => setShowGroupModal('create')}><Plus size={16}/></button>
                  <button className="icon-btn" title="Join Group" onClick={() => setShowGroupModal('join')}><Key size={16}/></button>
                </div>
              </div>
              <div className="groups-list">
                <div 
                  className={`group-item ${!activeGroupId ? 'active' : ''}`} 
                  onClick={() => setActiveGroupId(null)}
                >
                  <Globe size={14} /> Global Nexus
                </div>
                {groups.map(group => (
                  <div 
                    key={group.id} 
                    className={`group-item ${activeGroupId === group.id ? 'active' : ''}`}
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    <span className="group-name">{group.name}</span>
                    {activeGroupId === group.id && <span className="group-code">Code: {group.join_code}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="sidebar-panel surface">
              <div className="calendar-header">
                <CalIcon size={20} color="var(--primary)" />
                <h3>Time Matrix</h3>
              </div>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                inline
                maxDate={new Date()}
              />
            </div>
          </aside>
        </main>
      </div>

      {deleteParams && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Record</h3>
            <p>Are you sure you want to purge this transmission from the nexus?</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteParams(null)}>Cancel</button>
              <button className="btn btn-gradient" onClick={confirmDelete} style={{ background: 'var(--primary)' }}>Purge</button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3>{showGroupModal === 'create' ? 'Establish Group' : 'Join Group'}</h3>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {showGroupModal === 'create' ? (
                <>
                  <input 
                    className="styled-input" 
                    placeholder="Group Name" 
                    value={groupForm.name} 
                    onChange={e => setGroupForm({...groupForm, name: e.target.value})}
                  />
                  <div className="duration-selector">
                    {[
                      { label: '1H', value: '1' },
                      { label: '24H', value: '24' },
                      { label: '3D', value: '72' },
                      { label: '1W', value: '168' },
                      { label: 'Perm', value: 'permanent' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`duration-btn ${groupForm.duration_hours === opt.value ? 'active' : ''}`}
                        onClick={() => setGroupForm({...groupForm, duration_hours: opt.value})}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <input 
                  className="styled-input" 
                  placeholder="Joining Code" 
                  value={groupForm.join_code} 
                  onChange={e => setGroupForm({...groupForm, join_code: e.target.value})}
                />
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowGroupModal(null)}>Cancel</button>
              <button className="btn btn-gradient" onClick={submitGroupModal}>
                {showGroupModal === 'create' ? 'Create' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
