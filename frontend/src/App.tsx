import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Check, X, MessageSquare, LogOut, Eye, EyeOff } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
const APP_VERSION = "1.1.0";

interface Challenge {
  id: number;
  title: string;
  is_active: boolean;
  week_start_date: string;
  created_at: string;
}

interface DailyEntry {
  id: number;
  challenge_id: number;
  day_index: number;
  completed: boolean;
  difficulty: number | null;
  note: string | null;
  created_at: string;
}

const difficultyEmojis = ['', '😅', '😐', '😬', '😰', '🔥'];
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showEditDay, setShowEditDay] = useState<number | null>(null);
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editCompleted, setEditCompleted] = useState(false);
  const [editDifficulty, setEditDifficulty] = useState<number>(1);
  const [editNote, setEditNote] = useState('');
  const [newChallengeTitle, setNewChallengeTitle] = useState('');

  useEffect(() => {
    if (token) {
      fetchCurrentChallenge();
      fetchChallenges();
    }
  }, [token]);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders: Record<string, string> = {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    const defaultOptions: RequestInit = { headers: defaultHeaders };
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    return response.json();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (authMode === 'register') {
        await apiCall('/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        setAuthMode('login');
        setPassword('');
        setError('Registration successful! Please log in.');
      } else {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        const response = await apiCall('/token', { method: 'POST', body: formData });
        localStorage.setItem('token', response.access_token);
        setToken(response.access_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentChallenge(null);
    setDailyEntries([]);
    setChallenges([]);
  };

  const fetchCurrentChallenge = async () => {
    try {
      const challenge = await apiCall('/challenges/current');
      setCurrentChallenge(challenge);
      const entries = await apiCall(`/challenges/${challenge.id}/days`);
      setDailyEntries(entries);
    } catch {
      setCurrentChallenge(null);
      setDailyEntries([]);
    }
  };

  const fetchChallenges = async () => {
    try {
      const challenges = await apiCall('/challenges');
      setChallenges(challenges);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    }
  };

  const createChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeTitle.trim()) return;
    setLoading(true);
    try {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      await apiCall('/challenges', { method: 'POST', body: JSON.stringify({ title: newChallengeTitle, week_start_date: monday.toISOString() }) });
      setNewChallengeTitle('');
      setShowNewChallenge(false);
      fetchCurrentChallenge();
      fetchChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  const updateDayEntry = async (dayIndex: number) => {
    if (!currentChallenge) return;
    setLoading(true);
    try {
      await apiCall(`/challenges/${currentChallenge.id}/days/${dayIndex}`, { method: 'PUT', body: JSON.stringify({ completed: editCompleted, difficulty: editDifficulty, note: editNote.trim() || null }) });
      fetchCurrentChallenge();
      setShowEditDay(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update day');
    } finally {
      setLoading(false);
    }
  };

  const openEditDay = (dayIndex: number) => {
    const entry = dailyEntries.find(e => e.day_index === dayIndex);
    if (entry) {
      setEditCompleted(entry.completed);
      setEditDifficulty(entry.difficulty || 1);
      setEditNote(entry.note || '');
    } else {
      setEditCompleted(false);
      setEditDifficulty(1);
      setEditNote('');
    }
    setShowEditDay(dayIndex);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6">
        <div className="w-full max-w-4xl">
          <div className="rounded-3xl p-6 sm:p-8 md:p-10 mb-6 challenge-card">
            <div className="text-center mb-6">
              <Calendar className="mx-auto h-12 w-12 text-blue-300 mb-2" />
              <h1 className="text-2xl font-bold text-white">Weekly Challenges</h1>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white text-gray-900" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {error && (<div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>)}
              <button type="submit" disabled={loading} className="button-primary px-6 py-3 text-white font-medium rounded-full shadow-lg disabled:opacity-50">
                {loading ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Register'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} className="text-blue-300 hover:text-blue-400 text-sm">
                {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        <div className="rounded-3xl p-6 sm:p-8 md:p-10 mb-6 challenge-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar size={24} className="text-blue-300" />
              <h1 className="text-xl font-bold">Weekly Challenges</h1>
            </div>
            <button onClick={handleLogout} className="px-3 py-2 text-white/80 hover:text-white rounded-full">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div>
          {currentChallenge ? (
            <div className="space-y-6">
              <div className="challenge-card rounded-3xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Current Challenge</h2>
                <p className="text-purple-400 font-medium">{currentChallenge.title}</p>
                <p className="text-sm text-white/80 mt-1">Week of {new Date(currentChallenge.week_start_date).toLocaleDateString()}</p>
              </div>

              <div className="challenge-card rounded-3xl p-6">
                <h3 className="text-md font-medium text-white mb-4">This Week</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {dayNames.map((day, index) => {
                    const entry = dailyEntries.find(e => e.day_index === index);
                    return (
                      <div key={index} className="text-center">
                        <div className="text-xs text-white/80 mb-1">{day}</div>
                        <button onClick={() => openEditDay(index)} className={`day-box w-full h-16 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${entry?.completed ? 'border-green-500' : 'border-blue-500'}`}>
                          {entry?.completed ? (
                            <Check size={16} className="text-green-500" />
                          ) : entry?.difficulty ? (
                            <div className="text-sm">{difficultyEmojis[entry.difficulty]}</div>
                          ) : (
                            <X size={16} className="text-gray-400" />
                          )}
                          {entry?.note && (<MessageSquare size={8} className="text-gray-400 mt-1" />)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="challenge-card rounded-3xl p-6 text-center">
              <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-white/80 mb-4">No active challenge</p>
            </div>
          )}

          <div className="space-y-3 mt-6">
            <button onClick={() => setShowNewChallenge(true)} className="button-primary px-6 py-3 text-white font-medium rounded-full shadow-lg flex items-center justify-center space-x-2">
              <Plus size={20} />
              <span>New Challenge</span>
            </button>
            <button onClick={() => setShowHistory(true)} className="px-6 py-3 rounded-full bg-white/10 text-white/90 hover:text-white flex items-center justify-center space-x-2">
              <Calendar size={20} />
              <span>Challenge History</span>
            </button>
          </div>

          <div className="text-xs text-white/80 text-center mt-4">v{APP_VERSION}</div>
        </div>

        {showEditDay !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="challenge-card rounded-3xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">Edit {dayNames[showEditDay]}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Completed?</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setEditCompleted(true)} className={`flex-1 py-2 px-4 rounded-md ${editCompleted ? 'button-primary text-white' : 'bg-white/10 text-white/80'}`}>Yes</button>
                    <button onClick={() => setEditCompleted(false)} className={`flex-1 py-2 px-4 rounded-md ${!editCompleted ? 'bg-red-500 text-white' : 'bg-white/10 text-white/80'}`}>No</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Difficulty (1-5)</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button key={level} onClick={() => setEditDifficulty(level)} className={`flex-1 py-2 px-2 rounded-md text-sm ${editDifficulty === level ? 'button-primary text-white' : 'bg-white/10 text-white/80'}`}>
                        {difficultyEmojis[level]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Note (optional)</label>
                  <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" rows={3} placeholder="How did it go?" />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button onClick={() => setShowEditDay(null)} className="flex-1 bg-white/10 text-white/90 py-2 px-4 rounded-md hover:text-white">Cancel</button>
                <button onClick={() => updateDayEntry(showEditDay)} disabled={loading} className="flex-1 button-primary text-white py-2 px-4 rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {showNewChallenge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="challenge-card rounded-3xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">New Weekly Challenge</h3>
              <form onSubmit={createChallenge}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Challenge Title</label>
                  <input type="text" value={newChallengeTitle} onChange={(e) => setNewChallengeTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="e.g., No smoking or drinking" required />
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setShowNewChallenge(false)} className="flex-1 bg-white/10 text-white/90 py-2 px-4 rounded-md hover:text-white">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 button-primary text-white py-2 px-4 rounded-md disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="challenge-card rounded-3xl p-6 w-full max-w-sm max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Challenge History</h3>
              {challenges.length > 0 ? (
                <div className="space-y-3">
                  {challenges.map((challenge) => (
                    <div key={challenge.id} className={`p-3 rounded-lg border ${challenge.is_active ? 'border-blue-500' : 'border-gray-200'}`}>
                      <div className="font-medium text-gray-900">{challenge.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(challenge.week_start_date).toLocaleDateString()}
                        {challenge.is_active && (<span className="ml-2 text-blue-300 font-medium">• Active</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No challenges yet</p>
              )}
              <button onClick={() => setShowHistory(false)} className="w-full mt-6 bg-white/10 text-white/90 py-2 px-4 rounded-md hover:text-white">Close</button>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-2">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;