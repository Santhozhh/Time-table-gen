import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdArrowBack,
  MdSchedule,
  MdPeople,
  MdSchool,
  MdEdit,
} from 'react-icons/md';

interface NavItem {
  label: string;
  icon: JSX.Element;
  to: string;
}

const Sidebar: React.FC = () => {
  const navItems: NavItem[] = [
    { label: 'Generate Timetable', icon: <MdSchedule className="nav-icon" />, to: '/make-timetable' },
    { label: 'Student Timetables', icon: <MdPeople className="nav-icon" />, to: '/view-student-timetables' },
    { label: 'Faculty Timetables', icon: <MdSchool className="nav-icon" />, to: '/view-faculty-timetables' },
  ];

  const [showFacultyMgmt, setShowFacultyMgmt] = useState(false);

  return (
    <aside className="w-64 min-h-screen bg-white shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-2 text-gray-600">
        <MdArrowBack className="text-xl" />
        <span className="font-medium">VCET Connect</span>
      </div>

      {/* Brand */}
      <div className="p-4 flex items-center gap-3 border-b">
        <img src="/vcet-logo.png" alt="VCET" className="w-10 h-10 rounded-full" />
        <h1 className="text-lg font-semibold text-gray-800">Time Table Gen</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(({ label, icon, to }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `nav-item ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Faculty Management collapsible */}
        <div className="nav-section">
          <button
            onClick={() => setShowFacultyMgmt(!showFacultyMgmt)}
            className="nav-item w-full justify-between focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <MdEdit className="nav-icon" />
              <span>Faculty Management</span>
            </div>
            <span className="text-gray-400">{showFacultyMgmt ? '–' : '+'}</span>
          </button>
          {showFacultyMgmt && (
            <NavLink
              to="/edit"
              className={({ isActive }) =>
                `ml-6 nav-item ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <span>Edit Faculty</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-center text-sm text-gray-500">
        <p>Made with ❤️ by</p>
        <p className="font-medium text-blue-600">VCET Students</p>
    </div>
    </aside>
  );
};

export default Sidebar; 