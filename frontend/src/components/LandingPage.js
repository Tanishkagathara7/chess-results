import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Globe, Calendar, Award, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import backgroundImg from '../img/chess-board-background.jpeg';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe all elements with animate-on-scroll class
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach((el) => observer.observe(el));

    return () => {
      animateElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Custom CSS for staggered fade-up animations */}
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeUpLarge {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Ken Burns Effect - Cinematic Background Animation */
        @keyframes kenBurns {
          0% {
            transform: translateZ(0) scale(1.1);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          100% {
            transform: translateZ(0) scale(1.0);
            opacity: 1;
          }
        }

        .ken-burns-bg {
          animation: kenBurns 12s ease-out forwards;
          transform-origin: center center;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        /* Hero Section Animations */
        .animate-fade-up-1 {
          animation: fadeUp 0.8s ease-out 0.2s both;
        }

        .animate-fade-up-2 {
          animation: fadeUp 0.8s ease-out 0.4s both;
        }

        .animate-fade-up-3 {
          animation: fadeUp 0.8s ease-out 0.6s both;
        }

        .animate-fade-up-4 {
          animation: fadeUp 0.8s ease-out 0.8s both;
        }

        /* Features Section Animations */
        .animate-fade-up-5 {
          animation: fadeUp 0.8s ease-out 1.0s both;
        }

        .animate-fade-up-6 {
          animation: fadeUp 0.8s ease-out 1.2s both;
        }

        /* Feature Cards Staggered */
        .animate-card-1 {
          animation: fadeUpLarge 0.6s ease-out 0.1s both;
        }

        .animate-card-2 {
          animation: fadeUpLarge 0.6s ease-out 0.2s both;
        }

        .animate-card-3 {
          animation: fadeUpLarge 0.6s ease-out 0.3s both;
        }

        .animate-card-4 {
          animation: fadeUpLarge 0.6s ease-out 0.4s both;
        }

        .animate-card-5 {
          animation: fadeUpLarge 0.6s ease-out 0.5s both;
        }

        .animate-card-6 {
          animation: fadeUpLarge 0.6s ease-out 0.6s both;
        }

        /* CTA Section Animations */
        .animate-cta-1 {
          animation: fadeUp 0.8s ease-out 0.2s both;
        }

        .animate-cta-2 {
          animation: fadeUp 0.8s ease-out 0.4s both;
        }

        .animate-cta-3 {
          animation: fadeUp 0.8s ease-out 0.6s both;
        }

        /* Footer Animation */
        .animate-footer {
          animation: fadeUp 0.8s ease-out 0.3s both;
        }

        /* Intersection Observer Animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }

        .animate-on-scroll.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Premium Button Micro-Interactions */
        .premium-button {
          transition: all 0.3s ease-out;
          transform: translateY(0);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }

        .premium-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease-out;
        }

        .premium-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.1);
        }

        .premium-button:hover::before {
          left: 100%;
        }

        .premium-button:active {
          transform: translateY(-1px);
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.12), 0 6px 12px -3px rgba(0, 0, 0, 0.08);
          transition: all 0.1s ease-out;
        }

        /* Secondary Button Interactions */
        .premium-button-secondary {
          transition: all 0.3s ease-out;
          transform: translateY(0);
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
        }

        .premium-button-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.15);
        }

        .premium-button-secondary:active {
          transform: translateY(0);
          box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.12);
          transition: all 0.1s ease-out;
        }

        /* Premium Color Scheme */
        .text-premium-white {
          color: #FFFFFF;
        }

        .text-premium-goldenrod {
          color: #FFD700;
        }

        .text-premium-amber {
          color: #FFBF00;
        }

        .text-premium-cream {
          color: #F5F5DC;
        }

        .text-premium-white-semi {
          color: rgba(255, 255, 255, 0.7);
        }

        .bg-premium-deep-orange {
          background-color: #E65100;
        }

        .bg-premium-burnt-sienna {
          background-color: #D35400;
        }

        .hover\\:bg-premium-deep-orange-dark:hover {
          background-color: #BF360C;
        }

        .hover\\:bg-premium-burnt-sienna-dark:hover {
          background-color: #A04000;
        }

        /* Premium Gradient for Brand Name */
        .premium-brand-gradient {
          background: linear-gradient(135deg, #FFD700 0%, #FFBF00 50%, #FFA000 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
        }

        /* Ensure elements start invisible */
        .animate-fade-up-1,
        .animate-fade-up-2,
        .animate-fade-up-3,
        .animate-fade-up-4,
        .animate-fade-up-5,
        .animate-fade-up-6,
        .animate-card-1,
        .animate-card-2,
        .animate-card-3,
        .animate-card-4,
        .animate-card-5,
        .animate-card-6,
        .animate-cta-1,
        .animate-cta-2,
        .animate-cta-3,
        .animate-footer {
          opacity: 0;
        }
      `}</style>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-amber-200/95 via-amber-100/95 to-amber-50/95 border-b-2 border-amber-400/70 shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-2 min-w-0">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 truncate max-w-[55vw]">
                ChessTournaments
              </span>
            </div>
            {/* Right: Auth actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button onClick={() => navigate('/auth')} variant="outline" className="premium-button-secondary hidden sm:inline-flex border-amber-500 text-amber-800 hover:bg-amber-100 whitespace-nowrap">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="premium-button-secondary bg-amber-600 hover:bg-amber-700 px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base whitespace-nowrap">
                <span className="sm:hidden">Create</span>
                <span className="hidden sm:inline">Create Account</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-28">
        {/* Background image with overlay and bottom fade */}
        <div className="absolute inset-0">
          <img 
            src={backgroundImg} 
            alt="" 
            className="w-full h-full object-cover object-center ken-burns-bg"
            style={{
              imageRendering: 'crisp-edges',
              backfaceVisibility: 'hidden',
              filter: 'contrast(1.1) saturate(1.1)'
            }}
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-20 md:h-28 bg-gradient-to-b from-transparent to-white/80" />
        </div>
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Trophy Icon - First to appear */}
              <div className="flex justify-center mb-8 animate-fade-up-1">
                <div className="relative">
                  <Trophy className="h-24 w-24 text-amber-300 drop-shadow" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-yellow-400/90 rounded-full flex items-center justify-center shadow">
                    <Award className="h-4 w-4 text-yellow-900" />
                  </div>
                </div>
              </div>
              
              {/* Main Heading - Second to appear */}
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow animate-fade-up-2">
                <span className="text-premium-white font-light">Welcome to</span>
                <span className="block premium-brand-gradient font-extrabold">ChessTournaments</span>
              </h1>
              
              {/* Subtitle - Third to appear */}
              <p className="text-xl md:text-2xl text-premium-cream mb-10 max-w-3xl mx-auto animate-fade-up-3">
                Manage tournaments, track players, and deliver beautiful results with a modern, fast UI.
              </p>
              
              {/* CTA Section - Fourth to appear */}
              <div className="flex flex-col gap-6 justify-center items-center mb-14 animate-fade-up-4">
                <Button 
                  onClick={handleGetStarted}
                  className="premium-button bg-premium-deep-orange hover:bg-premium-deep-orange-dark text-white px-8 py-4 text-lg font-semibold rounded-lg"
                >
                  Get Started Today
                </Button>
                <p className="text-base md:text-lg text-white font-medium drop-shadow-lg text-center">
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 animate-on-scroll">
              Everything You Need for Chess Tournaments
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-on-scroll">
              Comprehensive tools to manage every aspect of your chess tournaments
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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

            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-on-scroll">
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-on-scroll">
            Ready to Start Your Chess Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8 animate-on-scroll">
            Join our platform today and experience the future of chess tournament management.
          </p>
          <div className="animate-on-scroll">
            <Button 
              onClick={handleGetStarted}
              className="premium-button-secondary bg-white text-premium-deep-orange hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-lg"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-on-scroll">
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