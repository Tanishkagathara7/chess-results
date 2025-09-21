import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, Clock, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

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

    const { theme } = useTheme();
    const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
    const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
    const subtle = theme === 'light' ? 'text-slate-600' : 'text-slate-300';
    const zebra = theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40';
    
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

    useEffect(() => {
        fetchNotifications();
    }, []); // Remove fetchNotifications dependency to avoid infinite loop

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'tournament_approved':
                return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-300" />;
            case 'tournament_rejected':
                return <X className="h-5 w-5 text-red-500 dark:text-red-300" />;
            case 'info':
                return <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-300" />;
            case 'warning':
                return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />;
            default:
                return <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />;
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
                return 'border-l-slate-600';
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
        <div className={`min-h-screen ${pageBg}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
onClick={() => navigate('/home')}
                            className="px-2 text-amber-400 hover:bg-amber-500/10 mb-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <h1 className="text-3xl font-bold">Notifications</h1>
                        <p className={`${subtle} mt-1`}>
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    <div className="hidden sm:block mt-1">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-wrap gap-2">
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
                            className="text-blue-500 dark:text-blue-400 hover:bg-blue-500/10"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <Card className={`${cardBg} rounded-xl`}>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className={`p-8 text-center ${subtle}`}>
                                Loading notifications...
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                                <h3 className="text-lg font-medium mb-2">{filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}</h3>
                                <p className={`${subtle} text-sm`}>
                                    {filter === 'all' 
                                        ? "We'll notify you when something happens" 
                                        : `Switch to "All" to see other notifications`}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-5 cursor-pointer ${zebra} transition-colors border-l-4 ${getNotificationColor(notification.type)}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-semibold">{notification.title}</h3>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center text-sm ${subtle}`}>
                                                        <Clock className="h-4 w-4 mr-1" />
                                                        {formatTime(notification.created_date)}
                                                    </div>
                                                </div>
                                                <p className={`${subtle} leading-relaxed`}>
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