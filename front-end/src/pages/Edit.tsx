import React, { useState, useEffect } from 'react';
import { facultyApi } from '../services/api';
import './Edit.css';

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek: number;
  active: boolean;
}

interface NewFaculty {
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek: number;
}

const Edit: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [newFaculty, setNewFaculty] = useState<NewFaculty>({
    name: '',
    code: '',
    specialization: '',
    maxHoursPerWeek: 40
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    try {
      const response = await facultyApi.getAll();
      if (Array.isArray(response.data)) {
        setFaculty(response.data as Faculty[]);
      }
    } catch (err) {
      setError('Failed to load faculty list');
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFaculty(prev => ({
      ...prev,
      [name]: name === 'maxHoursPerWeek' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await facultyApi.create(newFaculty);
      setNewFaculty({
        name: '',
        code: '',
        specialization: '',
        maxHoursPerWeek: 40
      });
      loadFaculty();
    } catch (err) {
      setError('Failed to add faculty');
      console.error(err);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      await facultyApi.delete(id);
      loadFaculty();
    } catch (err) {
      setError('Failed to delete faculty');
      console.error(err);
    }
  };

  return (
    <div className="edit-page">
      {error && <div className="error-message">{error}</div>}
      
      <div className="faculty-management">
        <h2>Faculty Management</h2>
        
        <form onSubmit={handleAddFaculty} className="add-faculty-form">
          <h3>Add New Faculty</h3>
          
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newFaculty.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Faculty Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={newFaculty.code}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialization">Specialization</label>
            <input
              type="text"
              id="specialization"
              name="specialization"
              value={newFaculty.specialization}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxHoursPerWeek">Max Hours per Week</label>
            <input
              type="number"
              id="maxHoursPerWeek"
              name="maxHoursPerWeek"
              value={newFaculty.maxHoursPerWeek}
              onChange={handleInputChange}
              min="1"
              max="40"
              required
            />
          </div>

          <button type="submit" className="submit-btn">Add Faculty</button>
        </form>

        <div className="faculty-list">
          <h3>Faculty List</h3>
          {faculty.map(f => (
            <div key={f._id} className="faculty-item">
              <div className="faculty-info">
                <h4>{f.name}</h4>
                <p>Code: {f.code}</p>
                <p>Specialization: {f.specialization}</p>
                <p>Max Hours: {f.maxHoursPerWeek}</p>
              </div>
              <div className="faculty-actions">
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteFaculty(f._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="timetable-settings">
        <h2>Timetable Settings</h2>
        {/* Add timetable format settings here if needed */}
      </div>
    </div>
  );
};

export default Edit; 