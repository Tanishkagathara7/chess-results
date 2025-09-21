import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Globe, Calendar, Award, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import backgroundImg from '../img/background.jpeg';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-amber-200/95 via-amber-100/95 to-amber-50/95 border-b-2 border-amber-400/70 shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              <span className="text-xl font-bold text-gray-900">ChessTournaments</span>
            </div>
            {/* Right: Auth actions */}
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/auth')} variant="outline" className="hidden sm:inline-flex border-amber-500 text-amber-800 hover:bg-amber-100">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="bg-amber-600 hover:bg-amber-700">
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-28">
        {/* Background image with overlay and bottom fade */}
        <div className="absolute inset-0">
          <img src={backgroundImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-x-0 bottom-0 h-20 md:h-28 bg-gradient-to-b from-transparent to-white/80" />
        </div>
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <Trophy className="h-24 w-24 text-amber-300 drop-shadow" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-yellow-400/90 rounded-full flex items-center justify-center shadow">
                    <Award className="h-4 w-4 text-yellow-900" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 drop-shadow">
                Welcome to
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-200">ChessTournaments</span>
              </h1>
              <p className="text-xl md:text-2xl text-amber-100 mb-10 max-w-3xl mx-auto">
                Manage tournaments, track players, and deliver beautiful results with a modern, fast UI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Get Started Today
                </Button>
                <p className="text-sm text-amber-200">
                  Trusted by clubs and organizers worldwide
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need for Chess Tournaments
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive tools to manage every aspect of your chess tournaments
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Trophy className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Tournament Management</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Create, organize, and manage chess tournaments with Swiss system pairings and comprehensive tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Users className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Player Database</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Maintain detailed player profiles with ratings, titles, and tournament history for better organization.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Calendar className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Schedule Management</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Efficiently schedule rounds, manage time controls, and track tournament progress in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Target className="h-12 w-12 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Results Tracking</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Record match results, calculate standings, and generate comprehensive tournament reports.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Globe className="h-12 w-12 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Global Access</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Access your tournaments and player data from anywhere in the world with our cloud-based platform.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Award className="h-12 w-12 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Professional Tools</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Professional-grade tournament management tools trusted by chess arbiters and organizers worldwide.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Chess Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join our platform today and experience the future of chess tournament management.
          </p>
          <Button 
            onClick={handleGetStarted}
            className="bg-white text-amber-700 hover:bg-amber-50 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="text-lg font-semibold">ChessTournaments</span>
            </div>
            <p className="text-gray-400">
              © 2024 ChessTournaments. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;