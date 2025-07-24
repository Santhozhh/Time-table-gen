import React from 'react';
import { Link } from 'react-router-dom';
import { MdSchedule, MdGroup, MdPerson, MdComputer } from 'react-icons/md';
import { FaGraduationCap } from 'react-icons/fa';

const quotes = [
  'Education is the passport to the future, for tomorrow belongs to those who prepare for it today. – Malcolm X',
  'An investment in knowledge pays the best interest. – Benjamin Franklin',
  'The beautiful thing about learning is nobody can take it away from you. – B.B. King',
  'It always seems impossible until it is done. – Nelson Mandela',
];

const Home: React.FC = () => {
  const quote = React.useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const cards = [
    { to: '/make-timetable', icon: <MdSchedule className="text-4xl text-blue-600" />, title: 'Generate Timetable', desc: 'Create and save new timetables with ease.' },
    { to: '/view-student-timetables', icon: <MdGroup className="text-4xl text-indigo-600" />, title: 'Student View', desc: 'Browse timetables by year & section.' },
    { to: '/view-faculty-timetables', icon: <MdPerson className="text-4xl text-emerald-600" />, title: 'Faculty View', desc: 'See workloads & free periods.' },
    { to: '/view-lab-timetables', icon: <MdComputer className="text-4xl text-teal-600" />, title: 'Lab View', desc: 'Manage lab schedules effortlessly.' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full w-full gap-10 p-6 text-center animate-fade-in">
      {/* Hero */}
      <div className="space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-3 text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full text-sm shadow-sm">
          <FaGraduationCap className="text-xl" />
          <span>VCET TIMETABLE MANAGEMENT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 leading-snug">
          Plan. Organise. <span className="text-indigo-600">Succeed.</span>
        </h1>
        <p className="text-gray-500 max-w-prose mx-auto">
          A modern web application to generate, manage, and share class & faculty timetables effortlessly.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group p-6 rounded-xl border border-gray-100 bg-white shadow hover:shadow-md transition-shadow flex flex-col items-center gap-3"
          >
            {c.icon}
            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-700 text-lg text-center">
              {c.title}
            </h3>
            <p className="text-sm text-gray-500 leading-snug text-center">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="italic text-gray-500 max-w-prose mx-auto pt-8 border-t border-gray-100">
        “{quote}”
      </blockquote>
    </div>
  );
};

export default Home; 