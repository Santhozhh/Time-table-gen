import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MdSchedule, MdPerson, MdGroup, MdEdit, MdChevronLeft, MdChevronRight, MdEmail } from 'react-icons/md';
import { FaGraduationCap } from 'react-icons/fa';
import { ToastProvider } from './components/ToastProvider';
import { PeriodsProvider } from './context/PeriodsContext';
import MakeTimetable from './pages/MakeTimetable';
import ViewStudentTimetables from './pages/ViewStudentTimetables';
import Home from './pages/Home';
import ViewFacultyTimetables from './pages/ViewFacultyTimetables';
import FacultyEdit from './pages/FacultyEdit';
import EditPeriods from './pages/EditPeriods';
import EditTimetable from './pages/EditTimetable';
import React from 'react';

const NavLink = ({ to, icon, text, collapsed }: { to: string; icon: React.ReactNode; text: string; collapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-4 py-3 rounded-lg transition-all duration-200 group
        ${isActive
          ? 'bg-blue-50 border-l-4 border-[#4169E1] text-blue-700 font-bold'
          : 'text-gray-700 hover:bg-gray-100'}
      `}
    >
      <div
        className={`text-2xl transition-transform duration-300 group-hover:scale-110
          ${isActive ? 'text-[#4169E1]' : 'text-gray-500 group-hover:text-[#4169E1]'}
        `}
      >
        {icon}
      </div>
      {!collapsed && <span className="font-medium leading-none">{text}</span>}
    </Link>
  );
};

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <ToastProvider>
    <PeriodsProvider>
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <nav className={`${collapsed ? 'w-20' : 'w-72'} bg-white shadow-xl p-6 flex flex-col fixed h-full transition-all duration-300 animate-slide-in-left`}>
          <div className={`flex items-center mb-12 px-4 ${collapsed ? 'justify-center' : 'gap-4'}`}>
            <div className={`rounded-2xl ${collapsed ? '' : 'shadow-lg bg-white'} p-3`}>
              <FaGraduationCap className="text-3xl text-indigo-700" />
            </div>
            {!collapsed && (
            <h1 className="text-xl font-bold text-shadow-blue-50 leading-tight">
              VCET<br/>TIME TABLE
            </h1>
            )}
          </div>
          <ul className="space-y-3 flex-1">
            <li >
              <NavLink 
                to="/make-timetable" 
                icon={<MdSchedule />} 
                text="Make Timetable" collapsed={collapsed}
              />
            </li>
            <li>
              <NavLink 
                to="/view-student-timetables" 
                icon={<MdGroup />} 
                text="Student Timetables" collapsed={collapsed}
              />
            </li>
            <li>
              <NavLink 
                to="/view-faculty-timetables" 
                icon={<MdPerson />} 
                text="Faculty Timetables" collapsed={collapsed}
              />
            </li>
            <li>
              <NavLink 
                to="/faculty-edit" 
                icon={<MdEdit />} 
                text="Edit Faculty" collapsed={collapsed}
              />
            </li>
            <li>
              <NavLink
                to="/edit-periods"
                icon={<MdSchedule />}
                text="Edit Periods / Time"
                collapsed={collapsed}
              />
            </li>
          </ul>
          {!collapsed && (
          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="px-6 py-4 rounded-xl bg-blue-50">
              <p className="text-sm text-gray-600">
                Made with  by<br/>
                <span className="font-semibold text-[#4169E1]">VCET Students</span>
              </p>
            </div>
          </div>) }

          {/* Bottom controls: mail then collapse */}
          <div className="mt-auto flex flex-col items-center gap-3">
            <a
              href="mailto:ksdsanthosh130@gmail.com?subject=Digital%20Timetable%20Query"
              className={`flex items-center gap-2 p-2 text-xl text-gray-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none ${collapsed ? 'justify-center' : ''}`}
              title="Email Developer"
            >
              <MdEmail />
          <h1> {!collapsed && <span className="text-xs font-medium text-gray-700">Contact Developer</span>}</h1>
            </a>
            <button
              className="p-3 text-2xl rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
            </button>
          </div>
        </nav>
        <main className={`flex-1 ${collapsed ? 'ml-20' : 'ml-72'} p-8 bg-[#f8fafc] min-h-screen transition-all duration-300`}>
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/make-timetable" element={<MakeTimetable />} />
              <Route path="/view-student-timetables" element={<ViewStudentTimetables />} />
              <Route path="/view-faculty-timetables" element={<ViewFacultyTimetables />} />
              <Route path="/faculty-edit" element={<FacultyEdit />} />
              <Route path="/edit-periods" element={<EditPeriods />} />
              <Route path="/edit-timetable/:id" element={<EditTimetable />} />
            </Routes>
          </div>
        </main>
        {/* Bottom controls inside sidebar handled above */}
      </div>
    </Router>
    </PeriodsProvider>
    </ToastProvider>
  );
}

export default App;
