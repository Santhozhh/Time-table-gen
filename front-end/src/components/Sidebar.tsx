import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Timetable Generator</h2>
      </div>
      <nav className="sidebar-nav">
        <Link to="/make-timetable" className="nav-item">
          <span className="nav-icon">📝</span>
          Make Timetable
        </Link>
        <Link to="/view-student-timetables" className="nav-item">
          <span className="nav-icon">👨‍🎓</span>
          View Students' Timetables
        </Link>
        <Link to="/view-faculty-timetables" className="nav-item">
          <span className="nav-icon">👨‍🏫</span>
          View Faculty Timetables
        </Link>
        <Link to="/edit" className="nav-item">
          <span className="nav-icon">⚙️</span>
          Edit
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar; 