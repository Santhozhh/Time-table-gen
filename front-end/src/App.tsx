import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MdSchedule, MdPerson, MdGroup, MdEdit } from 'react-icons/md';
import { FaGraduationCap } from 'react-icons/fa';
import MakeTimetable from './pages/MakeTimetable';
import ViewStudentTimetables from './pages/ViewStudentTimetables';
import ViewFacultyTimetables from './pages/ViewFacultyTimetables';
import FacultyEdit from './pages/FacultyEdit';

const NavLink = ({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
    >
      <div className={`text-2xl ${isActive ? 'transform scale-110 transition-transform duration-300' : ''}`}>
        {icon}
      </div>
      <span className="font-semibold">{text}</span>
    </Link>
  );
};

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <nav className="w-72 bg-white shadow-xl p-6 flex flex-col fixed h-full animate-fade-in">
          <div className="flex items-center gap-4 mb-12 px-4">
            <div className="p-3 bg-gradient-to-br from-[#4169E1] to-[#3154b4] rounded-2xl shadow-lg shadow-blue-500/30">
              <FaGraduationCap className="text-3xl text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">
              VCET<br/>TIME TABLE
            </h1>
          </div>
          <ul className="space-y-3 flex-1">
            <li>
              <NavLink 
                to="/make-timetable" 
                icon={<MdSchedule />} 
                text="MAKE  Timetable"
              />
            </li>
            <li>
              <NavLink 
                to="/view-student-timetables" 
                icon={<MdGroup />} 
                text="Student Timetables"
              />
            </li>
            <li>
              <NavLink 
                to="/view-faculty-timetables" 
                icon={<MdPerson />} 
                text="Faculty Timetables"
              />
            </li>
            <li>
              <NavLink 
                to="/faculty-edit" 
                icon={<MdEdit />} 
                text="Edit Faculty"
              />
            </li>
          </ul>
          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="px-6 py-4 rounded-xl bg-blue-50">
              <p className="text-sm text-gray-600">
                Made with  by<br/>
                <span className="font-semibold text-[#4169E1]">VCET Students</span>
              </p>
            </div>
          </div>
        </nav>
        <main className="flex-1 ml-72 p-8 bg-[#f8fafc] min-h-screen">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Routes>
              <Route path="/make-timetable" element={<MakeTimetable />} />
              <Route path="/view-student-timetables" element={<ViewStudentTimetables />} />
              <Route path="/view-faculty-timetables" element={<ViewFacultyTimetables />} />
              <Route path="/faculty-edit" element={<FacultyEdit />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
