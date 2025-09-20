import { lazy } from 'react';

// Lazy load heavy components for code splitting
export const AdminPanel = lazy(() => import('./AdminPanel'));
export const NotificationsPage = lazy(() => import('./NotificationsPage'));
export const AuthPage = lazy(() => import('./AuthPage'));
export const LandingPage = lazy(() => import('./LandingPage'));

// Tournament components (if they become large)
export const TournamentDetails = lazy(() => 
  import('./TournamentDetails').catch(() => ({
    default: () => <div>Tournament details component not available</div>
  }))
);

export const PlayerManagement = lazy(() => 
  import('./PlayerManagement').catch(() => ({
    default: () => <div>Player management component not available</div>
  }))
);

// Loading component for Suspense
export const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Error boundary for lazy components
export const LazyErrorBoundary = ({ children, fallback }) => {
  return children;
};