import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle, Clock, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const { 
        notifications, 
        unreadCount, 
        loading, 
        markAsRead, 
        markAllAsRead,
        fetchNotifications 
    } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isOpen && buttonRef.current) {
            // Calculate position relative to button
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8, // 8px gap below button
                right: window.innerWidth - rect.right // Align right edge
            });
            fetchNotifications(); // Refresh notifications when opening
        }
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        // Here you could add navigation logic based on notification type
        if (notification.data?.tournament_id) {
            // Navigate to tournament or show tournament details
            console.log('Navigate to tournament:', notification.data.tournament_id);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'tournament_approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'tournament_rejected':
                return <X className="h-4 w-4 text-red-600" />;
            case 'info':
                return <AlertCircle className="h-4 w-4 text-blue-600" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-yellow-600" />;
            default:
                return <Bell className="h-4 w-4 text-gray-600" />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'tournament_approved':
                return 'bg-green-50 border-green-200';
            case 'tournament_rejected':
                return 'bg-red-50 border-red-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const dropdownContent = isOpen && (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-10 z-[9998]" 
                onClick={() => setIsOpen(false)} 
            />
            {/* Dropdown */}
            <div 
                ref={dropdownRef}
                className="fixed w-[420px] bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]" 
                style={{
                    top: `${dropdownPosition.top}px`,
                    right: `${dropdownPosition.right}px`
                }}
            >
                <div className="relative bg-white rounded-lg">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Mark all read
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="px-5 py-6 text-center text-gray-500">
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-5 py-6 text-center text-gray-500">
                                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No notifications yet</p>
                                <p className="text-xs">We'll notify you when something happens</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`px-5 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                        !notification.read ? getNotificationColor(notification.type) : 'bg-white'
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start space-x-3 min-h-0">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className={`text-sm font-medium leading-tight pr-2 ${
                                                    !notification.read ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                                                )}
                                            </div>
                                            <p className={`text-xs leading-relaxed break-words mb-2 ${
                                                !notification.read ? 'text-gray-700' : 'text-gray-500'
                                            }`}>
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center text-xs text-gray-400">
                                                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                                <span className="truncate">{formatTime(notification.created_date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-gray-600 hover:text-gray-700"
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/notifications');
                                }}
                            >
                                View all notifications
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <div className="relative">
            {/* Bell Icon with Badge */}
            <Button
                ref={buttonRef}
                variant="ghost"
                size="sm"
                className="relative"
                onClick={handleToggle}
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>
            
            {/* Portal the dropdown content */}
            {dropdownContent && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default NotificationDropdown;