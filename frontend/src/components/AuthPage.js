import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import backgroundImg from '../img/background.jpeg';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    rating: '',
    birth_year: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user starts typing
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (!isLogin) {
      if (!formData.name) {
        setError('Please enter your name');
        return false;
      }
      if (!formData.birth_year) {
        setError('Please enter your birth year');
        return false;
      }
      if (!formData.phone) {
        setError('Please enter your phone number');
        return false;
      }
      if (formData.rating && (isNaN(formData.rating) || formData.rating < 0 || formData.rating > 3000)) {
        setError('Please enter a valid rating between 0 and 3000');
        return false;
      }
      if (formData.birth_year && (isNaN(formData.birth_year) || formData.birth_year < 1900 || formData.birth_year > new Date().getFullYear())) {
        setError('Please enter a valid birth year');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Handle login
        const result = await login(formData.email, formData.password);
        if (result.success) {
          navigate('/home');
        } else {
          setError(result.error || 'Invalid email or password');
        }
      } else {
        // Handle signup
        const result = await register(
          formData.name, 
          formData.email, 
          formData.password,
          {
            rating: formData.rating ? parseInt(formData.rating) : 0,
            birth_year: parseInt(formData.birth_year),
            phone: formData.phone
          }
        );
        if (result.success) {
          navigate('/home');
        } else {
          setError(result.error || 'Account creation failed. Please try again.');
        }
      }
    } catch (error) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10 px-4">
      <div className="absolute inset-0">
        <img src={backgroundImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-x-0 bottom-0 h-28 md:h-36 bg-gradient-to-b from-transparent to-white" />
      </div>
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-amber-100 hover:text-amber-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <div className={`relative w-full ${isLogin ? 'max-w-md' : 'max-w-lg'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100/20 rounded-full border border-amber-400/30">
              <Trophy className="h-8 w-8 text-amber-300" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-amber-100">
            {isLogin 
              ? 'Sign in to access your chess tournaments' 
              : 'Join thousands of chess enthusiasts worldwide'
            }
          </p>
        </div>

        {/* Auth Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Rating field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="rating">Chess Rating (Optional)</Label>
                  <Input
                    id="rating"
                    name="rating"
                    type="number"
                    min="0"
                    max="3000"
                    placeholder="e.g. 1200 (leave empty if unrated)"
                    value={formData.rating}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-gray-500">Your current chess rating (FIDE, USCF, etc.)</p>
                </div>
              )}

              {/* Birth Year field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="birth_year">Birth Year</Label>
                  <Input
                    id="birth_year"
                    name="birth_year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="e.g. 1995"
                    value={formData.birth_year}
                    onChange={handleInputChange}
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Phone field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +1234567890"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm Password field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            {/* Toggle between login and signup */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setFormData({
                      email: '',
                      password: '',
                      confirmPassword: '',
                      name: '',
                      rating: '',
                      birth_year: '',
                      phone: ''
                    });
                  }}
                  className="ml-1 font-semibold text-amber-700 hover:text-amber-800"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AuthPage;