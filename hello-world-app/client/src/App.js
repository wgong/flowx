import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import HelloMessage from './components/HelloMessage';
import Footer from './components/Footer';

function App() {
  const [greeting, setGreeting] = useState({ message: 'Loading...', timestamp: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get('/api/hello');
        setGreeting(res.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch greeting from server. Is the backend running?');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGreeting();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Hello World Application</h1>
        <p className="subtitle">Built with Express.js and React</p>
      </header>

      <main className="app-main">
        <HelloMessage 
          greeting={greeting} 
          isLoading={isLoading} 
          error={error} 
        />
      </main>

      <Footer />
    </div>
  );
}

export default App;