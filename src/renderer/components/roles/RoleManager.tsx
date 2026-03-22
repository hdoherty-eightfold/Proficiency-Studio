import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    Users,
    Plus,
    Search,
    RefreshCw,
    Trash2,
    Edit,
    Copy,
    ChevronRight,
    AlertCircle,
    Loader2,
    Briefcase,
    Star
} from 'lucide-react';

interface Skill {
    id: string;
    name: string;
    proficiency_level?: number;
    required?: boolean;
}

interface Role {
    id: string;
    name: string;
    description?: string;
    department?: string;
    skills: Skill[];
    environment_id?: string;
    created_at?: string;
    updated_at?: string;
}

interface RoleManagerProps {
    environmentId?: string;
    onRoleSelect?: (role: Role) => void;
    mode?: 'manage' | 'select';
}

const RoleManager: React.FC<RoleManagerProps> = ({
    environmentId,
    onRoleSelect,
    mode = 'manage'
}) => {
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        department: '',
        skills: [] as Skill[]
    });

    // Fetch roles from backend
    const fetchRoles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getRoles();
            const rolesList = (response.roles || response || []) as Role[];

            // Filter by environment if specified
            const filteredRoles = environmentId
                ? rolesList.filter((r) => r.environment_id === environmentId)
                : rolesList;

            setRoles(filteredRoles);
        } catch (err: unknown) {
            console.error('Failed to fetch roles:', err);
            const errMessage = err instanceof Error ? err.message : 'Failed to load roles';
            setError(errMessage);
            toast({
                title: 'Failed to load roles',
                description: errMessage,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [environmentId, toast]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    // Get unique departments
    const departments = [...new Set(roles.map(r => r.department).filter(Boolean))] as string[];

    // Filter roles
    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDepartment = departmentFilter === 'all' || role.department === departmentFilter;
        return matchesSearch && matchesDepartment;
    });

    const handleCreateRole = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            description: '',
            department: '',
            skills: []
        });
        setShowForm(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            department: role.department || '',
            skills: role.skills || []
        });
        setShowForm(true);
    };

    const handleSaveRole = async () => {
        if (!formData.name.trim()) {
            toast({
                title: 'Validation error',
                description: 'Role name is required',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSaving(true);

            const roleData = {
                name: formData.name,
                description: formData.description,
                department: formData.department,
                skills: formData.skills,
                environment_id: environmentId
            };

            if (editingRole) {
                // Update existing role
                await api.updateRoleProficiencies(
                    editingRole.id,
                    roleData.skills.map(s => ({ skill_id: s.id, skill_name: s.name, required_level: s.proficiency_level || 3 })),
                    'replace'
                );
                toast({ title: 'Role updated', description: `${formData.name} has been updated.` });
            } else {
                // Create new role
                await api.createRole(roleData);
                toast({ title: 'Role created', description: `${formData.name} has been created.` });
            }

            setShowForm(false);
            fetchRoles();
        } catch (err: unknown) {
            toast({
                title: 'Failed to save role',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (role: Role) => {
        if (!confirm(`Are you sure you want to delete "${role.name}"?`)) return;

        try {
            await api.deleteRole(role.id);
            toast({ title: 'Role deleted', description: `${role.name} has been deleted.` });
            fetchRoles();
            if (selectedRole?.id === role.id) {
                setSelectedRole(null);
            }
        } catch (err: unknown) {
            toast({
                title: 'Failed to delete role',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        }
    };

    const handleDuplicateRole = async (role: Role) => {
        setEditingRole(null);
        setFormData({
            name: `${role.name} (Copy)`,
            description: role.description || '',
            department: role.department || '',
            skills: role.skills || []
        });
        setShowForm(true);
    };

    const handleSelectRole = (role: Role) => {
        setSelectedRole(role);
        if (mode === 'select' && onRoleSelect) {
            onRoleSelect(role);
        }
    };

    const addSkillToForm = () => {
        setFormData(prev => ({
            ...prev,
            skills: [...prev.skills, { id: `skill-${Date.now()}`, name: '', proficiency_level: 3 }]
        }));
    };

    const updateSkillInForm = (index: number, field: keyof Skill, value: string | number | boolean) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.map((s, i) => i === index ? { ...s, [field]: value } : s)
        }));
    };

    const removeSkillFromForm = (index: number) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="h-full flex flex-col">
            <Card className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                <CardHeader className="border-b dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Role Management
                            </CardTitle>
                            <CardDescription>
                                Create, edit, and manage roles with skill requirements
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={fetchRoles} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            {mode === 'manage' && (
                                <Button size="sm" onClick={handleCreateRole}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Role
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex items-center gap-4 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search roles..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                            />
                        </div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                    {error && (
                        <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <p className="text-sm text-gray-500">Loading roles...</p>
                        </div>
                    ) : showForm ? (
                        /* Role Form */
                        <div className="p-6 space-y-6 overflow-y-auto max-h-full">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    {editingRole ? 'Edit Role' : 'Create New Role'}
                                </h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Role Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                                        placeholder="e.g., Software Engineer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                                        placeholder="e.g., Engineering"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 resize-none"
                                    rows={3}
                                    placeholder="Describe the role responsibilities..."
                                />
                            </div>

                            {/* Skills Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium">Required Skills</label>
                                    <Button variant="outline" size="sm" onClick={addSkillToForm}>
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Skill
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {formData.skills.map((skill, index) => (
                                        <div key={skill.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <input
                                                type="text"
                                                value={skill.name}
                                                onChange={(e) => updateSkillInForm(index, 'name', e.target.value)}
                                                className="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                                                placeholder="Skill name"
                                            />
                                            <select
                                                value={skill.proficiency_level || 3}
                                                onChange={(e) => updateSkillInForm(index, 'proficiency_level', parseInt(e.target.value))}
                                                className="px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                                            >
                                                <option value={1}>Level 1 - Novice</option>
                                                <option value={2}>Level 2 - Beginner</option>
                                                <option value={3}>Level 3 - Intermediate</option>
                                                <option value={4}>Level 4 - Advanced</option>
                                                <option value={5}>Level 5 - Expert</option>
                                            </select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSkillFromForm(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {formData.skills.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            No skills added yet. Click "Add Skill" to add required skills.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                                <Button variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveRole} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {editingRole ? 'Update Role' : 'Create Role'}
                                </Button>
                            </div>
                        </div>
                    ) : filteredRoles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Users className="w-12 h-12 mb-4 opacity-50" />
                            <p>{searchQuery ? 'No roles match your search' : 'No roles found'}</p>
                            {mode === 'manage' && !searchQuery && (
                                <Button variant="link" onClick={handleCreateRole} className="mt-2">
                                    Create your first role
                                </Button>
                            )}
                        </div>
                    ) : (
                        /* Role List */
                        <div className="divide-y dark:divide-gray-700 overflow-y-auto max-h-full">
                            {filteredRoles.map(role => (
                                <div
                                    key={role.id}
                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                                        selectedRole?.id === role.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                    onClick={() => handleSelectRole(role)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{role.name}</span>
                                                {role.department && (
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                        {role.department}
                                                    </span>
                                                )}
                                            </div>
                                            {role.description && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                                    {role.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Star className="w-3 h-3" />
                                                    {role.skills?.length || 0} skills
                                                </span>
                                                {role.updated_at && (
                                                    <span>
                                                        Updated {new Date(role.updated_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {mode === 'manage' && (
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditRole(role)}
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDuplicateRole(role)}
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteRole(role)}
                                                    title="Delete"
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}

                                        {mode === 'select' && (
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Selected Role Details Panel */}
            {selectedRole && mode === 'manage' && !showForm && (
                <Card className="mt-4 bg-white dark:bg-gray-800">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Role Details: {selectedRole.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Required Skills</h4>
                                {selectedRole.skills?.length > 0 ? (
                                    <div className="space-y-1">
                                        {selectedRole.skills.map((skill, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span>{skill.name}</span>
                                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                    Level {skill.proficiency_level || '?'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No skills defined</p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Information</h4>
                                <dl className="space-y-1 text-sm">
                                    {selectedRole.department && (
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Department</dt>
                                            <dd>{selectedRole.department}</dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">ID</dt>
                                        <dd className="font-mono text-xs">{selectedRole.id}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RoleManager;
