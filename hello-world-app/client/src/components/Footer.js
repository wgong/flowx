import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <p>Created with Express.js and React</p>
      <p className="copyright">© {new Date().getFullYear()} Hello World Application</p>
    </footer>
  );
};

export default Footer;