/**
 * Advanced Resume Upload Component
 * Based on SnapMap FileUpload with skills-specific enhancements
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, File, Check, X, AlertCircle, Sparkles, FileText, Brain } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface ResumeUploadProps {
  onFileUploaded?: (file: File, extractedSkills: string[]) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onFileUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const sampleFiles = [
    { name: 'Software Engineer Resume (React, Python)', path: '/samples/software_engineer_resume.pdf' },
    { name: 'Data Scientist Resume (ML, Analytics)', path: '/samples/data_scientist_resume.pdf' },
    { name: 'Product Manager Resume (Strategy, Agile)', path: '/samples/product_manager_resume.pdf' },
  ];

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      setError('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.');
      return;
    }

    // Validate file size (10 MB for resumes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 10 MB.`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setUploadedFile(file);

      // Simulate skills extraction (in real app, this would call backend)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockSkills = [
        'React', 'TypeScript', 'Python', 'FastAPI', 'Machine Learning',
        'Data Analysis', 'Project Management', 'Agile', 'Docker', 'AWS'
      ];

      setExtractedSkills(mockSkills);
      setUploadSuccess(true);

      // Call parent callback with file and extracted skills
      if (onFileUploaded) {
        onFileUploaded(file, mockSkills);
      }

    } catch (err: any) {
      setError('Error processing resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onFileUploaded]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleLoadSample = useCallback(async (samplePath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowSampleDropdown(false);

      // Simulate loading sample file
      await new Promise(resolve => setTimeout(resolve, 1000));

      const filename = samplePath.split('/').pop() || 'sample.pdf';
      const blob = new Blob(['Sample resume content'], { type: 'application/pdf' });
      const file = new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });

      await handleFileSelect(file);
    } catch (err: any) {
      setError(`Error loading sample file: ${err.message}`);
      setIsLoading(false);
    }
  }, [handleFileSelect]);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resume Upload & Skills Extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300">
              Upload candidate resumes to automatically extract skills for assessment
            </p>
          </div>

          {/* Sample Files Loader */}
          {!uploadSuccess && (
            <div className="mb-6 relative">
              <button
                onClick={() => setShowSampleDropdown(!showSampleDropdown)}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-primary-400 transition-all flex items-center justify-center gap-2"
              >
                <File className="w-4 h-4" />
                Try with Sample Resume
              </button>

              {showSampleDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  {sampleFiles.map((sample, index) => (
                    <button
                      key={index}
                      onClick={() => handleLoadSample(sample.path)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{sample.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
              ${isDragging && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'}
              ${!isDragging && 'border-gray-300 dark:border-gray-600 hover:border-primary-400'}
              ${uploadSuccess && 'border-success-500 bg-success-50 dark:bg-success-900/20'}
              ${error && 'border-error-500 bg-error-50 dark:bg-error-900/20'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Processing Resume...
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Extracting skills using AI analysis
                  </p>
                </div>
              </div>
            ) : uploadSuccess ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <Check className="w-8 h-8 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-success-700 dark:text-success-300">
                    Resume processed successfully!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadedFile?.name} - {extractedSkills.length} skills extracted
                  </p>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  id="resume-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleInputChange}
                  disabled={isLoading}
                />

                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-colors
                    ${error ? 'bg-error-100 dark:bg-error-900/30' : 'bg-primary-100 dark:bg-primary-900/30'}
                  `}>
                    {error ? (
                      <AlertCircle className="w-8 h-8 text-error-600 dark:text-error-400" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Drop your resume here, or <span className="text-primary-600 dark:text-primary-400">browse</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supports PDF, DOC, DOCX, and TXT files
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Browse Files
                  </button>
                </label>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-error-900 dark:text-error-100">Upload Error</p>
                <p className="text-sm text-error-700 dark:text-error-300 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Extracted Skills */}
          {uploadSuccess && extractedSkills.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Extracted Skills ({extractedSkills.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold mb-2">Supported formats:</p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• PDF files (.pdf)</li>
              <li>• Microsoft Word (.doc, .docx)</li>
              <li>• Text files (.txt)</li>
              <li>• Maximum file size: 10 MB</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeUpload;