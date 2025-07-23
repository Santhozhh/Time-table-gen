import React, { useState, useEffect } from 'react';
import { MdPerson, MdDelete, MdEdit, MdAdd } from 'react-icons/md';
import { useToast } from '../components/ToastProvider';
import { usePersistedState } from '../hooks/usePersistedState';

interface Faculty {
  _id: string;
  name: string;
  grade: string;
  specialization: string;
}

const SPECIALIZATIONS = [
  'CSE',
  'IT',
  'ECE',
  'EEE',
  'CIVIL',
  'MECH',
  'CHEMICAL',
  'MATHS',  
  'COMPUTER SCIENCE (CYBER SECURITY)',
  'PLACEMENTS',
  'SOFTSKILLS',
  'PROJECT WORK',
  'PHYSICS',
];

const GRADES = [
  'Professor/HoD',
  'Professor',
  'Associate Professor',
  'Assistant Professor I',
  'Assistant Professor II',
  'Assistant Professor III'
];

const FacultyEdit: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [formData, setFormData] = usePersistedState<{name:string;grade:string;specialization:string}>('facultyEdit_form', {
    name: '',
    grade: 'Assistant Professor I',
    specialization: 'CSE',
  });
  const [editingId,setEditingId]=usePersistedState<string|null>('facultyEdit_editing', null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await fetch('api/faculty');
      if (!response.ok) {
        throw new Error('Failed to fetch faculty list');
      }
      const data = await response.json();
      setFaculty(data);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      showToast('Failed to load faculty list. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/faculty/${editingId}` : '/api/faculty';
    const method = editingId ? 'PUT' : 'POST';
    try{
      const res = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});
      if(!res.ok){
        const err=await res.json();
        throw new Error(err.message||'Failed');
      }
      setFormData({name:'',grade:'Assistant Professor I',specialization:'CSE'});
      setEditingId(null);
      // clear localStorage keys as well
      localStorage.removeItem('facultyEdit_form');
      localStorage.removeItem('facultyEdit_editing');
      fetchFaculty();
      showToast(editingId?'Faculty updated!':'Faculty added successfully!', 'success');
    }catch(err){
      console.error('faculty save err',err);
      showToast(err instanceof Error?err.message:'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/faculty/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete faculty');
      }
      
      fetchFaculty();
      showToast('Faculty deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting faculty:', error);
      showToast('Failed to delete faculty. Please try again.', 'error');
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
            <h2 className="text-2xl font-bold text-white">{editingId?'Edit Faculty':'Add New Faculty'}</h2>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="form-container">
            <div className="form-group">
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
            
            <div className="form-group">
              <label className="form-label">Grade / Designation</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                required
                className="input-field"
              >
                {GRADES.map(g=>(<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            
            <div className="form-group">
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
            
            {/*
            <div className="form-group">
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
            */}
          </div>

          <div className="mt-6">
            <button type="submit" className="btn-primary">
              <MdAdd className="text-xl" />
              {editingId?'Update Faculty':'Add Faculty'}
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
                className="faculty-card group relative bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{f.name}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Grade: <span className="font-medium text-gray-700">{f.grade}</span></p>
                      <p className="text-sm text-gray-500">Specialization: 
                        <span className="ml-1 inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                          {f.specialization}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={()=>{setFormData({name:f.name,grade:f.grade,specialization:f.specialization});setEditingId(f._id);window.scrollTo({top:0,behavior:'smooth'});}}
                      className="p-2 hover:bg-gray-100 rounded-lg hover:scale-110"
                      title="Edit"
                    >
                      <MdEdit className="text-xl text-blue-500"/>
                    </button>
                  <button 
                    onClick={() => handleDelete(f._id)}
                      className="p-2 hover:bg-red-50 rounded-lg hover:scale-110"
                      title="Delete"
                  >
                    <MdDelete className="text-xl text-red-500" />
                  </button>
                  </div>
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