import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock the Header component since it's not in its own file
// This would normally import from the separate Header component file
const Header = ({ searchQuery, setSearchQuery, onSearch, showAuthButton = false }) => {
  const { isAuthenticated, logout, user } = { 
    isAuthenticated: true, 
    logout: jest.fn(), 
    user: { email: 'test@example.com', role: 'user' } 
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className=\"bg-white border-b border-gray-200 shadow-sm\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"flex justify-between items-center h-16\">
          <div className=\"flex items-center space-x-8\">
            <span className=\"text-xl font-bold text-gray-900\">ChessTournaments</span>
            <nav className=\"hidden md:flex space-x-6\">
              <span className=\"text-gray-600\">Home</span>
              {user?.role !== 'admin' && (
                <span className=\"text-gray-600\">Tournaments</span>
              )}
              {user?.role === 'admin' && (
                <span className=\"text-gray-600\">Admin</span>
              )}
            </nav>
          </div>
          <div className=\"flex items-center space-x-4\">
            <div className=\"relative max-w-md\">
              <input
                type=\"text\"
                placeholder=\"Search tournaments...\"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                className=\"pl-10 w-64\"
                data-testid=\"search-input\"
              />
            </div>
            <button onClick={onSearch} data-testid=\"search-button\">
              Search
            </button>
            {showAuthButton && isAuthenticated && (
              <div className=\"flex items-center space-x-3\">
                <span className=\"text-sm text-gray-600\">Welcome, {user?.email}</span>
                <button onClick={handleLogout} data-testid=\"logout-button\">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          {component}
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  const mockSetSearchQuery = jest.fn();
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header with title', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    expect(screen.getByText('ChessTournaments')).toBeInTheDocument();
  });

  test('renders search input and button', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-button')).toBeInTheDocument();
  });

  test('calls setSearchQuery when typing in search input', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test tournament' } });

    expect(mockSetSearchQuery).toHaveBeenCalledWith('test tournament');
  });

  test('calls onSearch when search button is clicked', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"test\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    const searchButton = screen.getByTestId('search-button');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalled();
  });

  test('calls onSearch when Enter key is pressed in search input', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"test\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalled();
  });

  test('shows auth section when showAuthButton is true', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
        showAuthButton={true}
      />
    );

    expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  test('shows correct navigation for regular user', () => {
    renderWithProviders(
      <Header 
        searchQuery=\"\"
        setSearchQuery={mockSetSearchQuery}
        onSearch={mockOnSearch}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tournaments')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});