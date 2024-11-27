import React, { useState, useEffect } from 'react';
import { Box, Button, Tabs, Tab, Stack } from '@mui/material';
import Invoices from '../Invoices/Invoices';
import Elements from '../Elements/Elements';
import Projects from '../Projects/Projects';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { downloadSelected } from '../../services/api';  // Import the API service

const MainContent = ({
  projectName,
  selectedProjects, // Sidebar filter selections
  invoices,
  elements,
  projects,
  filters,
  setFilters,
  activeTab,
  handleTabChange,
  selectedInvoiceItems, // DataGrid selection states for Invoices
  setSelectedInvoiceItems,
  selectedElementItems, // DataGrid selection states for Elements
  setSelectedElementItems,
  selectedProjectItems, // DataGrid selection states for Projects
  setSelectedProjectItems,
}) => {


  // Log the current selections whenever the active tab changes
  useEffect(() => {
    console.log("Current selected items for invoices:", selectedInvoiceItems);
    console.log("Current selected items for elements:", selectedElementItems);
    console.log("Current selected items for projects:", selectedProjectItems);
  }, [selectedInvoiceItems, selectedElementItems, selectedProjectItems]);
  
  const getCurrentSelectedItems = () => {
    switch (activeTab) {
      case 0:
        return selectedInvoiceItems;
      case 1:
        return selectedElementItems;
      case 2:
        return selectedProjectItems;
      default:
        return [];
    }
  };

  const [filterText, setFilterText] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);


  useEffect(() => {
    // Don't clear selections when changing tabs
    // This allows maintaining selections when switching between tabs
  }, [activeTab]);

  const setElementsFilters = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      elements: {
        ...prevFilters.elements,
        ...newFilters
      }
    }));
  };
  
  const setInvoicesFilters = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      invoices: {
        ...prevFilters.invoices,
        ...newFilters
      }
    }));
  };
  

  const setProjectsFilters = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      projects: newFilters,
    }));
  };

  const formatFiltersForSQL = () => {
    let formattedFilters = "WHERE ";
    Object.entries(filters).forEach(([section, sectionFilters]) => {
      Object.entries(sectionFilters).forEach(([key, value]) => {
        if (value) {
          formattedFilters += `${key} = '${value}' AND `;
        }
      });
    });
    return formattedFilters.endsWith(' AND ') ? formattedFilters.slice(0, -5) : formattedFilters;
  };

  const handleCopyFilters = () => {
    const formattedText = formatFiltersForSQL();
    setFilterText(formattedText);

    navigator.clipboard.writeText(formattedText)
      .then(() => alert('Filters copied to clipboard!'))
      .catch((err) => console.error('Failed to copy filters:', err));
  };

  const handleDownloadSelected = async () => {
    const selectedItems = getCurrentSelectedItems();
    console.log('Current tab:', activeTab);
    console.log('Selected items:', selectedItems);
    
    if (selectedItems.length === 0) {
      console.warn('No items selected');
      alert('Please select items to download');
      return;
    }

    setIsDownloading(true);
    try {
      const endpoint = ['invoices', 'elements', 'projects'][activeTab];
      console.log('Download endpoint:', endpoint);
      console.log('Downloading selected items:', selectedItems);

      const response = await downloadSelected(endpoint, selectedItems);
      console.log('Download response:', response);
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      console.log('Created blob:', {
        size: blob.size,
        type: blob.type
      });

      const url = window.URL.createObjectURL(blob);
      console.log('Created URL:', url);

      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${endpoint}_report_${timestamp}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      console.log('Triggering download with filename:', filename);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('Download cleanup completed');
    } catch (error) {
      console.error('Download error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      alert('Failed to download report: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsDownloading(false);
    }
  };
  
  const shouldDisableDownloadButton = () => isDownloading || getCurrentSelectedItems().length === 0;

  const getDownloadButtonLabel = () => {
    const selectedItems = getCurrentSelectedItems();
    const count = selectedItems.length;
    switch (activeTab) {
      case 0:
        return `Download Selected Invoices (${count})`;
      case 1:
        return `Download Selected Elements (${count})`;
      case 2:
        return `Download Selected Projects (${count})`;
      default:
        return `Download Selected (${count})`;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Invoices" />
          <Tab label="Elements" />
          <Tab label="Projects" />
        </Tabs>
        <Stack direction="row" spacing={2}>
        <Button
        variant="contained"
        startIcon={<FileDownloadIcon />}
        onClick={handleDownloadSelected}
        disabled={shouldDisableDownloadButton()}
      >
        {getDownloadButtonLabel()}
      </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              const formattedText = formatFiltersForSQL();
              setFilterText(formattedText);
              navigator.clipboard.writeText(formattedText)
                .then(() => alert('Filters copied to clipboard!'))
                .catch((err) => console.error('Failed to copy filters:', err));
            }}
          >
            Copy Filters
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Invoices
            invoices={invoices}
            filters={filters.invoices}
            setFilters={setInvoicesFilters}
            selectedItems={selectedInvoiceItems}
            setSelectedItems={setSelectedInvoiceItems}
          />
        )}
        {activeTab === 1 && (
          <Elements
            elements={elements}
            filters={filters.elements}
            setFilters={setElementsFilters}
            selectedItems={selectedElementItems}
            setSelectedItems={setSelectedElementItems}
          />
        )}
        {activeTab === 2 && (
          <Projects
            projects={projects}
            filters={filters.projects}
            setFilters={setProjectsFilters}
            selectedItems={selectedProjectItems}
            setSelectedItems={setSelectedProjectItems}
          />
        )}
      </Box>
    </Box>
  );
};

export default MainContent;
