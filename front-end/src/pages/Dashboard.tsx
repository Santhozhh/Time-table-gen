import React, { useEffect, useState } from 'react';
import { generatedTimetableApi } from '../services/api';
import { Link } from 'react-router-dom';
import { MdSchedule } from 'react-icons/md';

interface GeneratedTimetable {
  _id: string;
  timetable: any[][];
  courses: any[];
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<GeneratedTimetable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data } = await generatedTimetableApi.getAll();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch timetables', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!items.length) {
    return <div className="text-center text-gray-600">No timetables generated yet.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Recent Timetables</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <Link key={item._id} to={`/timetable/${item._id}`} className="card p-6 hover:shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MdSchedule className="text-3xl text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Timetable</h3>
                <p className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Subjects: {item.courses.length}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard; 