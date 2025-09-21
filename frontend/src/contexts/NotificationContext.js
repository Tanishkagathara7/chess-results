import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Fetch notifications when user is authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchNotifications();
            fetchUnreadCount();
            
            // Set up polling for new notifications every 15 seconds for better responsiveness
            const interval = setInterval(() => {
                fetchUnreadCountWithSound();
            }, 15000);
            
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isAuthenticated, user]);

    const fetchNotifications = async (limit = 10) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/notifications?limit=${limit}`);
            setNotifications(response || []);
        } catch (error) {
            // Gracefully ignore auth errors
            if (error?.status === 401 || error?.status === 403) {
                setNotifications([]);
                return;
            }
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        try {
            // Create a subtle notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Fallback to no sound if Web Audio API is not supported
            console.log('Notification sound not supported');
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/api/notifications/unread-count');
            setUnreadCount(response?.unread_count ?? 0);
        } catch (error) {
            // Treat auth errors as zero unread silently
            if (error?.status === 401 || error?.status === 403) {
                setUnreadCount(0);
                return;
            }
            console.error('Error fetching unread count:', error);
        }
    };

    const fetchUnreadCountWithSound = async () => {
        try {
            const response = await api.get('/api/notifications/unread-count');
            const newUnreadCount = response?.unread_count ?? 0;
            
            // Play sound if unread count increased
            if (newUnreadCount > unreadCount && unreadCount >= 0) {
                playNotificationSound();
                // Also refresh the full notifications list to show new ones
                fetchNotifications();
            }
            
            setUnreadCount(newUnreadCount);
        } catch (error) {
            // Treat auth errors as zero unread silently
            if (error?.status === 401 || error?.status === 403) {
                setUnreadCount(0);
                return;
            }
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/api/notifications/${notificationId}/read`);
            
            // Update local state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: true, read_date: new Date().toISOString() }
                        : notification
                )
            );
            
            // Update unread count
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/api/notifications/mark-all-read');
            
            // Update local state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification => ({
                    ...notification,
                    read: true,
                    read_date: new Date().toISOString()
                }))
            );
            
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const addNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.read) {
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        addNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};