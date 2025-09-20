import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, Clock, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { 
        notifications, 
        unreadCount, 
        loading, 
        markAsRead, 
        markAllAsRead,
        fetchNotifications 
    } = useNotifications();
    
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

    useEffect(() => {
        fetchNotifications();
    }, []); // Remove fetchNotifications dependency to avoid infinite loop

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'tournament_approved':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'tournament_rejected':
                return <X className="h-5 w-5 text-red-600" />;
            case 'info':
                return <AlertCircle className="h-5 w-5 text-blue-600" />;
            case 'warning':
                return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            default:
                return <Bell className="h-5 w-5 text-gray-600" />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'tournament_approved':
                return 'border-l-green-500';
            case 'tournament_rejected':
                return 'border-l-red-500';
            case 'info':
                return 'border-l-blue-500';
            case 'warning':
                return 'border-l-yellow-500';
            default:
                return 'border-l-gray-500';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
        return date.toLocaleDateString();
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

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.read;
        if (filter === 'read') return notification.read;
        return true; // 'all'
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(-1)}
                            className="mr-4"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                            <p className="text-gray-600 mt-1">
                                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                            <Button 
                                variant={filter === 'all' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setFilter('all')}
                            >
                                All ({notifications.length})
                            </Button>
                            <Button 
                                variant={filter === 'unread' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setFilter('unread')}
                            >
                                Unread ({unreadCount})
                            </Button>
                            <Button 
                                variant={filter === 'read' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setFilter('read')}
                            >
                                Read ({notifications.length - unreadCount})
                            </Button>
                        </div>
                        {unreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-blue-600 hover:text-blue-700"
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                Loading notifications...
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {filter === 'unread' ? 'No unread notifications' : 
                                     filter === 'read' ? 'No read notifications' : 
                                     'No notifications yet'}
                                </h3>
                                <p className="text-sm">
                                    {filter === 'all' 
                                        ? "We'll notify you when something happens" 
                                        : `Switch to "${filter === 'unread' ? 'All' : 'All'}" to see ${filter === 'unread' ? 'all' : 'other'} notifications`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredNotifications.map((notification, index) => (
                                    <div
                                        key={notification.id}
                                        className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                                            !notification.read ? 'bg-blue-50' : 'bg-white'
                                        }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className={`text-base font-semibold ${
                                                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                                                        }`}>
                                                            {notification.title}
                                                        </h3>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Clock className="h-4 w-4 mr-1" />
                                                        {formatTime(notification.created_date)}
                                                    </div>
                                                </div>
                                                <p className={`text-sm leading-relaxed ${
                                                    !notification.read ? 'text-gray-800' : 'text-gray-600'
                                                }`}>
                                                    {notification.message}
                                                </p>
                                                {notification.type && (
                                                    <div className="mt-3">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {notification.type.replace('_', ' ').toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default NotificationsPage;