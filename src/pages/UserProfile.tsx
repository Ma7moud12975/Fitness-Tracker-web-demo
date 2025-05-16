import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const UserProfile = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');

  useEffect(() => {
    // Load saved user data from localStorage
    const savedData = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (savedData) {
      setName(savedData.name || '');
      setAge(savedData.age || '');
      setWeight(savedData.weight || '');
      setGender(savedData.gender || '');
      setHeight(savedData.height || '');
    }
  }, []);

  const handleSave = () => {
    const userProfile = { name, age, weight, gender, height };
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    alert('Profile saved successfully!');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Age</label>
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Enter your age" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Weight (kg)</label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Enter your weight" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Enter your gender" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height (cm)</label>
          <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Enter your height" />
        </div>
        <Button onClick={handleSave} className="mt-4">Save Profile</Button>
      </div>
    </div>
  );
};

export default UserProfile;
