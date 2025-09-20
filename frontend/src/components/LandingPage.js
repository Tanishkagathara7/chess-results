import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Globe, Calendar, Award, Target, PlayCircle, Shield, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ChessTournaments</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium">Features</a>
              <a href="#stats" className="text-gray-600 hover:text-blue-600 font-medium">Stats</a>
              <a href="#cta" className="text-gray-600 hover:text-blue-600 font-medium">Get Started</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/auth')} variant="outline" className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700">
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Trophy className="h-24 w-24 text-blue-600" />
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Award className="h-4 w-4 text-yellow-800" />
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              New: Swiss pairings, requests, and final standings
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              Welcome to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ChessTournaments</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Manage tournaments, track players, and deliver beautiful results with a modern, fast UI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
              <Button 
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Get Started Today
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="px-6 py-4 text-lg rounded-lg border-blue-200 hover:bg-blue-50"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
              <p className="text-sm text-gray-500">
                Trusted by clubs and organizers worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900">1,200+</div>
              <div className="mt-1 text-sm text-gray-500">Tournaments Managed</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900">25k</div>
              <div className="mt-1 text-sm text-gray-500">Players Tracked</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900">98%</div>
              <div className="mt-1 text-sm text-gray-500">Organizer Satisfaction</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900">Global</div>
              <div className="mt-1 text-sm text-gray-500">Cloud Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Chess Tournaments
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools to manage every aspect of your chess tournaments
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Trophy className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Tournament Management</h3>
                <p className="text-gray-600">
                  Create, organize, and manage chess tournaments with Swiss system pairings and comprehensive tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Users className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Player Database</h3>
                <p className="text-gray-600">
                  Maintain detailed player profiles with ratings, titles, and tournament history for better organization.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Calendar className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Schedule Management</h3>
                <p className="text-gray-600">
                  Efficiently schedule rounds, manage time controls, and track tournament progress in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Target className="h-12 w-12 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Results Tracking</h3>
                <p className="text-gray-600">
                  Record match results, calculate standings, and generate comprehensive tournament reports.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Globe className="h-12 w-12 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Access</h3>
                <p className="text-gray-600">
                  Access your tournaments and player data from anywhere in the world with our cloud-based platform.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Award className="h-12 w-12 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Tools</h3>
                <p className="text-gray-600">
                  Professional-grade tournament management tools trusted by chess arbiters and organizers worldwide.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Chess Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join our platform today and experience the future of chess tournament management.
          </p>
          <Button 
            onClick={handleGetStarted}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
              <Trophy className="h-6 w-6 text-blue-400" />
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