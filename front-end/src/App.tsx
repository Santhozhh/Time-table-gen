import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MdSchedule, MdPerson, MdGroup, MdEdit, MdChevronLeft, MdChevronRight, MdEmail , MdComputer,  MdHome, MdSettings } from 'react-icons/md';
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
import ViewLabTimetables from './pages/ViewLabTimetables';
import React from 'react';
import { toast } from 'react-toastify';

// Dark mode helper


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
  const [collapsed, setCollapsed] = React.useState<boolean>(()=> window.innerWidth < 768);

  React.useEffect(()=>{
    const handler = () => {
      if(window.innerWidth < 768 && !collapsed) setCollapsed(true);
      else if(window.innerWidth >= 768 && collapsed) setCollapsed(false);
    };
    window.addEventListener('resize', handler);
    return ()=> window.removeEventListener('resize', handler);
  },[collapsed]);
  return (
    <ToastProvider>
    <PeriodsProvider>
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <nav className={`${collapsed ? 'w-20' : 'w-72'} bg-white shadow-xl p-6 flex flex-col fixed h-full transition-all duration-300 animate-slide-in-left`}>
          <div className={`flex items-center mb-12 px-4 ${collapsed ? 'justify-center' : 'gap-4'}`}>
            <div className={`rounded-2xl ${collapsed ? '' : 'shadow-lg bg-white'} p-3`}>
              <FaGraduationCap className="text-3xl text-indigo-700"  />
            </div>
            {!collapsed && (
            <h1 className="text-xl font-bold text-shadow-blue-50 leading-tight">
              VCET<br/>TIME TABLE
            </h1>
            )}
          </div>
          <button
              className="p-3 text-2xl rounded-full hover:bg-gray-100 transition-colors focus:outline-none absolute top-1/2 -translate-y-1/2 right-0"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
            </button>
          <ul className="space-y-3 flex-1">
          <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/" 
                icon={<MdHome />} 
                text="Home" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/make-timetable" 
                icon={<MdSchedule />} 
                text="Make Timetable" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/view-student-timetables" 
                icon={<MdGroup />} 
                text="Student Timetables" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/view-faculty-timetables" 
                icon={<MdPerson />} 
                text="Faculty Timetables" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/view-lab-timetables" 
                icon={<MdComputer />} 
                text="Lab Timetables" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink 
                to="/faculty-edit" 
                icon={<MdEdit />} 
                text="Edit Faculty" collapsed={collapsed}
              />
            </li>
            <li  className='hover:shadow-lg transition-shadow duration-200 rounded-4xl'>
              <NavLink
                to="/edit-periods"
                icon={<MdSettings />}
                text="Edit"
                collapsed={collapsed}
              />
            </li>
          </ul>
          {!collapsed && (
          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="px-6 py-4 rounded-xl bg-blue-50">
              <p className="text-sm text-gray-600">
                Made with  by<br/>
                <span className="font-semibold text-[#4169E1]">Santhosh Kumar K S D <br/>(IV yr CSE-C)</span>
              </p>
            </div>
          </div>) }

          {/* Bottom controls: mail then collapse */}
          <div className="mt-auto flex flex-col items-center gap-3">
            {/* Dark mode toggle */}
           
            <a
              className='flex items-center gap-2 p-2 text-sm text-gray-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none'
              onClick={()=>{
                navigator.clipboard.writeText('ksdsanthosh130@gmail.com');
                toast.success('Email copied to clipboard');
              }}
            >
              <MdEmail /> Stay Connected click here to copy my email
          <h1> {!collapsed && <span className="text-xs font-medium text-gray-700">Contact </span>}</h1>
            </a>
            
          </div>
        </nav>
        <main className={`flex-1 ${collapsed ? 'ml-20' : 'ml-72'} p-8 bg-[#f8fafc] min-h-screen transition-all duration-300`}>
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/make-timetable" element={<MakeTimetable />} />
              <Route path="/view-student-timetables" element={<ViewStudentTimetables />} />
              <Route path="/view-faculty-timetables" element={<ViewFacultyTimetables />} />
              <Route path="/view-lab-timetables" element={<ViewLabTimetables />} />
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
