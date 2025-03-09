import React from 'react';
import { DatabaseProvider } from '../context/DatabaseContext';
import TopNavbar from './TopNavbar';
import DatabaseViewer from './database/DatabaseViewer';

function AppLayout() {
    return (
      <DatabaseProvider>
        <div className="flex flex-col h-screen bg-background text-text">
          <TopNavbar />
          <div className="flex-1 overflow-auto p-4">
            <div className="container mx-auto">
              <DatabaseViewer />
            </div>
          </div>
        </div>
      </DatabaseProvider>
    );
  }

export default AppLayout;