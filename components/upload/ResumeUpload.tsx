/**
 * Resume Upload Component
 * Upload and analyze candidate resumes
 */
import React, { useState } from 'react';
import { ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';

const ResumeUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setUploadedFiles(Array.from(files));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <ArrowUpTrayIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Resume Upload & Analysis
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Upload candidate resumes for skills analysis and proficiency assessment
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center mb-6">
        <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Upload Resume Files
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Supported formats: PDF, DOC, DOCX, TXT (Max 10MB per file)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="btn-primary cursor-pointer inline-block">
          Choose Files
        </label>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Uploaded Files ({uploadedFiles.length})
            </h4>
          </div>
          <div className="p-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button className="text-sm text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Options */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Analysis Configuration
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm text-blue-700 dark:text-blue-300">Extract skills automatically</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm text-blue-700 dark:text-blue-300">Analyze experience levels</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;