import React from 'react';

const Home: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full gap-6">
    <img src ="./public/VCET-logo-3910936100.png" alt="VCET Logo" className="w-40 h-auto" />
    <h2 className="text-2xl font-bold text-gray-700">VCET Timetable Management</h2>
    <p className="text-gray-500">Select an option from the sidebar to get started.</p>
  </div>
);

export default Home; 