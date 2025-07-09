import React, { useState, useEffect } from 'react';
import { MdPerson, MdDelete, MdEdit, MdAdd } from 'react-icons/md';

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek: number;
}

const SPECIALIZATIONS = [
  'CSE',
  'IT',
  'ECE',
  'EEE',
  'CIVIL',
  'MECH'
];

const FacultyEdit: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    specialization: 'CSE',
    maxHoursPerWeek: 40
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/faculty');
      if (!response.ok) {
        throw new Error('Failed to fetch faculty list');
      }
      const data = await response.json();
      setFaculty(data);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      alert('Failed to load faculty list. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add faculty');
      }
      
      setFormData({
        name: '',
        code: '',
        specialization: 'CSE',
        maxHoursPerWeek: 40
      });
      fetchFaculty();
      alert('Faculty added successfully!');
    } catch (error) {
      console.error('Error adding faculty:', error);
      alert(error instanceof Error ? error.message : 'Failed to add faculty');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/faculty/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete faculty');
      }
      
      fetchFaculty();
      alert('Faculty deleted successfully!');
    } catch (error) {
      console.error('Error deleting faculty:', error);
      alert('Failed to delete faculty. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <div className="card-gradient-header">
          <div className="flex items-center gap-4">
            <div className="icon-container">
              <MdPerson className="text-3xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Add New Faculty</h2>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="form-container">
            <div className="space-y-2">
              <label className="form-label">Faculty Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter faculty name"
                className="input-field"
              />
            </div>
            
            <div className="space-y-2">
              <label className="form-label">Faculty Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Enter faculty code"
                className="input-field"
              />
            </div>
            
            <div className="space-y-2">
              <label className="form-label">Specialization</label>
              <select
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                required
                className="input-field"
              >
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="form-label">Max Hours Per Week</label>
              <input
                type="number"
                value={formData.maxHoursPerWeek}
                onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: parseInt(e.target.value) })}
                required
                min="1"
                max="40"
                placeholder="Enter max hours"
                className="input-field"
              />
            </div>
          </div>

          <div className="mt-6">
            <button type="submit" className="btn-primary">
              <MdAdd className="text-xl" />
              Add Faculty
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-gradient-header">
          <div className="flex items-center gap-4">
            <div className="icon-container">
              <MdPerson className="text-3xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Faculty List</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculty.map((f) => (
              <div 
                key={f._id} 
                className="group relative bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{f.name}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Code: <span className="font-medium text-gray-700">{f.code}</span></p>
                      <p className="text-sm text-gray-500">Specialization: 
                        <span className="ml-1 inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                          {f.specialization}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">Max Hours: <span className="font-medium text-gray-700">{f.maxHoursPerWeek}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(f._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all duration-300"
                    title="Delete Faculty"
                  >
                    <MdDelete className="text-xl text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyEdit; 