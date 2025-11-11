/**
 * Skills Extraction Component
 * Handles extracting skills from JIE roles and managing skill datasets
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface Skill {
  name: string;
  category?: string;
}

const SkillsExtraction: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [customSkill, setCustomSkill] = useState({ name: '', category: '' });

  useEffect(() => {
    loadMockSkills();
  }, []);

  const loadMockSkills = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getMockSkills();
      setSkills(response.skills);
      setMessage('Mock skills loaded for demonstration');
    } catch (error) {
      setMessage(`Failed to load skills: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLatestSkills = async () => {
    setIsLoading(true);
    setMessage('Loading latest skills from previous assessments...');

    try {
      const response = await apiService.getLatestSkills();
      if (response.skills) {
        setSkills(response.skills);
        setMessage('Latest skills loaded successfully');
      } else {
        setMessage('No skills data found. Please run an assessment first or use mock data.');
      }
    } catch (error) {
      setMessage(`Failed to load latest skills: ${error}`);
      // Fallback to mock data
      await loadMockSkills();
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomSkill = () => {
    if (!customSkill.name.trim()) {
      setMessage('Please enter a skill name');
      return;
    }

    const newSkill: Skill = {
      name: customSkill.name.trim(),
      category: customSkill.category.trim() || 'Custom'
    };

    // Check if skill already exists
    const exists = skills.some(skill =>
      skill.name.toLowerCase() === newSkill.name.toLowerCase()
    );

    if (exists) {
      setMessage('Skill already exists in the list');
      return;
    }

    setSkills(prev => [...prev, newSkill]);
    setSelectedSkills(prev => new Set([...prev, newSkill.name]));
    setCustomSkill({ name: '', category: '' });
    setMessage(`Added custom skill: ${newSkill.name}`);
  };

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  const selectAllSkills = () => {
    const filteredSkills = getFilteredSkills();
    setSelectedSkills(new Set(filteredSkills.map(skill => skill.name)));
  };

  const deselectAllSkills = () => {
    setSelectedSkills(new Set());
  };

  const removeSkill = (skillName: string) => {
    setSkills(prev => prev.filter(skill => skill.name !== skillName));
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      newSet.delete(skillName);
      return newSet;
    });
  };

  const getFilteredSkills = () => {
    return skills.filter(skill =>
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.category && skill.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getSkillsByCategory = () => {
    const filteredSkills = getFilteredSkills();
    return filteredSkills.reduce((acc, skill) => {
      const category = skill.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>);
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <span className="text-3xl">📋</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          Skills Extraction
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Extract and manage skills from JIE role definitions for proficiency assessment
        </p>
      </div>

      {/* Skills Loading Controls */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Load Skills Data</h2>

        <div className="flex gap-4 mb-4">
          <button
            onClick={loadLatestSkills}
            disabled={isLoading}
            className="px-6 py-3 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-pill transition-all hover:-translate-y-0.5 shadow-eightfold-teal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load Latest Skills'}
          </button>

          <button
            onClick={loadMockSkills}
            disabled={isLoading}
            className="px-6 py-3 bg-white border border-eightfold-teal-300 text-eightfold-teal-400 font-semibold rounded-pill transition-all hover:bg-eightfold-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Mock Skills
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('success') || message.includes('loaded') || message.includes('Added')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : message.includes('Loading')
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-orange-50 border border-orange-200 text-orange-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Add Custom Skill */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Add Custom Skill</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Skill Name
            </label>
            <input
              type="text"
              value={customSkill.name}
              onChange={(e) => setCustomSkill(prev => ({...prev, name: e.target.value}))}
              placeholder="e.g., React, Python, Leadership"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Category (optional)
            </label>
            <input
              type="text"
              value={customSkill.category}
              onChange={(e) => setCustomSkill(prev => ({...prev, category: e.target.value}))}
              placeholder="e.g., Programming, Leadership"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addCustomSkill}
              className="w-full px-4 py-2 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-lg transition-all"
            >
              Add Skill
            </button>
          </div>
        </div>
      </div>

      {/* Skills Management */}
      {skills.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              Skills List ({skills.length} total, {selectedSkills.size} selected)
            </h3>

            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={selectAllSkills}
                className="px-4 py-2 text-sm bg-eightfold-teal-100 hover:bg-eightfold-teal-200 text-eightfold-teal-600 font-semibold rounded-lg transition-all"
              >
                Select All
              </button>
              <button
                onClick={deselectAllSkills}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg transition-all"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skills or categories..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
          </div>

          {/* Skills by Category */}
          <div className="space-y-6">
            {Object.entries(getSkillsByCategory()).map(([category, categorySkills]) => (
              <div key={category}>
                <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorySkills.map(skill => (
                    <div
                      key={skill.name}
                      className={`p-3 border rounded-lg flex items-center justify-between transition-all ${
                        selectedSkills.has(skill.name)
                          ? 'border-eightfold-teal-300 bg-eightfold-teal-50'
                          : 'border-gray-200 hover:border-eightfold-teal-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSkills.has(skill.name)}
                          onChange={() => toggleSkillSelection(skill.name)}
                          className="rounded text-eightfold-teal-400 focus:ring-eightfold-teal-300"
                        />
                        <span className="font-medium text-gray-900">{skill.name}</span>
                      </div>

                      <button
                        onClick={() => removeSkill(skill.name)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {skills.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-lg">📊</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Skills Summary
              </h3>
              <p className="text-sm text-blue-700">
                You have selected {selectedSkills.size} skills out of {skills.length} total skills.
                These selected skills will be used for the proficiency assessment in the next step.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsExtraction;