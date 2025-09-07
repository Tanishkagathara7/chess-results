import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import './RegistrationManagement.css';

const RegistrationManagement = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [registeredPlayers, setRegisteredPlayers] = useState([]);
    const [manualPlayers, setManualPlayers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showRegistrationInfo, setShowRegistrationInfo] = useState(false);

    useEffect(() => {
        fetchRegistrations();
    }, [tournamentId]);

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/api/tournaments/${tournamentId}/registrations`);
            setTournament(data.tournament);
            setParticipants(data.participants);
            setRegisteredPlayers(data.registered_players);
            setManualPlayers(data.manual_players);
            setStats(data.stats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantSelection = (participantId, checked) => {
        if (checked) {
            setSelectedParticipants([...selectedParticipants, participantId]);
        } else {
            setSelectedParticipants(selectedParticipants.filter(id => id !== participantId));
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedParticipants(participants.map(p => p.id));
        } else {
            setSelectedParticipants([]);
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedParticipants.length === 0) {
            alert('Please select participants and an action');
            return;
        }

        try {
            const result = await api.post(`/api/tournaments/${tournamentId}/registrations/bulk-action`, {
                action: bulkAction,
                participant_ids: selectedParticipants
            });
            
            alert(`${result.message}: ${result.modified_count} participants updated`);
            
            // Reset selections and refresh data
            setSelectedParticipants([]);
            setBulkAction('');
            fetchRegistrations();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const updateParticipantStatus = async (participantId, status) => {
        try {
            await api.put(`/api/tournaments/${tournamentId}/registrations/${participantId}`, { status });
            fetchRegistrations();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const copyRegistrationURL = () => {
        if (tournament?.registration?.registration_url) {
            navigator.clipboard.writeText(tournament.registration.registration_url);
            alert('Registration URL copied to clipboard!');
        }
    };

    const copyWebhookURL = () => {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        const webhookUrl = `${backendUrl}/api/tournaments/${tournamentId}/register-webhook`;
        navigator.clipboard.writeText(webhookUrl);
        alert('Webhook URL copied to clipboard!');
    };

    const generateForm = async () => {
        try {
            const result = await api.post(`/api/tournaments/${tournamentId}/generate-form`);
            alert('Google Form template generated! Check the Registration Info section.');
            fetchRegistrations(); // Refresh to show new registration data
        } catch (err) {
            alert('Error generating form: ' + err.message);
        }
    };

    const copyTemplateURL = () => {
        if (tournament?.registration?.template_url) {
            navigator.clipboard.writeText(tournament.registration.template_url);
            alert('Template URL copied to clipboard! Click to create your Google Form.');
        }
    };

    if (loading) return <div className="loading">Loading registrations...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="registration-management">
            <div className="header">
                <h1>Registration Management</h1>
                <h2>{tournament?.name}</h2>
                
                <div className="registration-info">
                    <div className="registration-controls">
                        <button 
                            onClick={() => setShowRegistrationInfo(!showRegistrationInfo)}
                            className="toggle-info-btn"
                        >
                            {showRegistrationInfo ? 'Hide' : 'Show'} Registration Info
                        </button>
                        
                        {!tournament?.registration?.enabled && (
                            <button 
                                onClick={generateForm}
                                className="generate-form-btn"
                                style={{ marginLeft: '10px', background: '#4CAF50' }}
                            >
                                Generate Registration Form
                            </button>
                        )}
                    </div>
                    
                    {tournament?.registration?.enabled && showRegistrationInfo && (
                        <div className="info-panel">
                            {tournament.registration.template_url && (
                                <div className="info-item">
                                    <strong>Google Form Template (Click to Create):</strong>
                                    <div className="url-container">
                                        <input 
                                            type="text" 
                                            value={tournament.registration.template_url} 
                                            readOnly 
                                        />
                                        <button onClick={copyTemplateURL} className="copy-btn">Copy</button>
                                        <a 
                                            href={tournament.registration.template_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                                marginLeft: '10px', 
                                                padding: '8px 12px', 
                                                background: '#2196F3', 
                                                color: 'white', 
                                                textDecoration: 'none', 
                                                borderRadius: '4px' 
                                            }}
                                        >
                                            Create Form
                                        </a>
                                    </div>
                                </div>
                            )}
                            
                            {tournament.registration.registration_url && (
                                <div className="info-item">
                                    <strong>Live Registration Form URL:</strong>
                                    <div className="url-container">
                                        <input 
                                            type="text" 
                                            value={tournament.registration.registration_url} 
                                            readOnly 
                                        />
                                        <button onClick={copyRegistrationURL} className="copy-btn">Copy</button>
                                    </div>
                                </div>
                            )}
                            
                            <div className="info-item">
                                <strong>Webhook URL (for form integration):</strong>
                                <div className="url-container">
                                    <input 
                                        type="text" 
                                        value={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/api/tournaments/${tournamentId}/register-webhook`}
                                        readOnly 
                                    />
                                    <button onClick={copyWebhookURL} className="copy-btn">Copy</button>
                                </div>
                            </div>
                            
                            <div className="info-item">
                                <strong>Registration Deadline:</strong> {
                                    tournament.registration.registration_deadline 
                                    ? new Date(tournament.registration.registration_deadline).toLocaleDateString()
                                    : 'Not set'
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="stats-section">
                <div className="stat-card">
                    <h3>Total Participants</h3>
                    <div className="stat-number">{stats.total_participants}</div>
                </div>
                <div className="stat-card">
                    <h3>Form Registrations</h3>
                    <div className="stat-number">{stats.registered_via_form}</div>
                </div>
                <div className="stat-card">
                    <h3>Manual Additions</h3>
                    <div className="stat-number">{stats.manually_added}</div>
                </div>
                <div className="stat-card">
                    <h3>Active Players</h3>
                    <div className="stat-number">{stats.active}</div>
                </div>
                <div className="stat-card">
                    <h3>Withdrawn</h3>
                    <div className="stat-number">{stats.withdrawn}</div>
                </div>
            </div>

            <div className="bulk-actions">
                <div className="bulk-controls">
                    <label>
                        <input 
                            type="checkbox" 
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            checked={selectedParticipants.length === participants.length && participants.length > 0}
                        />
                        Select All ({selectedParticipants.length} selected)
                    </label>
                    
                    <select 
                        value={bulkAction} 
                        onChange={(e) => setBulkAction(e.target.value)}
                        disabled={selectedParticipants.length === 0}
                    >
                        <option value="">Choose action...</option>
                        <option value="approve">Approve Selected</option>
                        <option value="reject">Reject Selected</option>
                        <option value="withdraw">Withdraw Selected</option>
                    </select>
                    
                    <button 
                        onClick={handleBulkAction}
                        disabled={!bulkAction || selectedParticipants.length === 0}
                        className="bulk-action-btn"
                    >
                        Apply Action
                    </button>
                </div>
            </div>

            <div className="participants-section">
                <h3>All Participants</h3>
                {participants.length === 0 ? (
                    <p>No participants registered yet.</p>
                ) : (
                    <div className="participants-table-container">
                        <table className="participants-table">
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Name</th>
                                    <th>Rating</th>
                                    <th>Title</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>Registration Date</th>
                                    <th>Contact</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map(participant => (
                                    <tr key={participant.id} className={`status-${participant.status}`}>
                                        <td>
                                            <input 
                                                type="checkbox"
                                                checked={selectedParticipants.includes(participant.id)}
                                                onChange={(e) => handleParticipantSelection(participant.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="player-name">
                                            {participant.player.title && (
                                                <span className="player-title">{participant.player.title}</span>
                                            )}
                                            {participant.player.name}
                                        </td>
                                        <td>{participant.player.rating || 'Unrated'}</td>
                                        <td>{participant.player.title || '-'}</td>
                                        <td className="source">
                                            {participant.registration_source === 'google_form' ? (
                                                <span className="source-form">📝 Form</span>
                                            ) : (
                                                <span className="source-manual">✋ Manual</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${participant.status}`}>
                                                {participant.status || 'registered'}
                                            </span>
                                        </td>
                                        <td>
                                            {participant.registration_date 
                                                ? new Date(participant.registration_date).toLocaleDateString()
                                                : '-'
                                            }
                                        </td>
                                        <td className="contact-info">
                                            {participant.contact_email && (
                                                <div>📧 {participant.contact_email}</div>
                                            )}
                                            {participant.contact_phone && (
                                                <div>📞 {participant.contact_phone}</div>
                                            )}
                                            {participant.federation && (
                                                <div>🏁 {participant.federation}</div>
                                            )}
                                        </td>
                                        <td className="actions">
                                            <select 
                                                value={participant.status || 'registered'}
                                                onChange={(e) => updateParticipantStatus(participant.id, e.target.value)}
                                                className="status-select"
                                            >
                                                <option value="registered">Registered</option>
                                                <option value="active">Active</option>
                                                <option value="withdrawn">Withdrawn</option>
                                                <option value="disqualified">Disqualified</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationManagement;
