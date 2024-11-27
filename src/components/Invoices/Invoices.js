import React, { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, FormControlLabel, Checkbox } from '@mui/material';
import FilterInput from '../FilterInput/FilterInput';

const Invoices = ({ invoices, filters, setFilters, selectedItems, setSelectedItems }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Define columns
  const columns = [
    { 
      field: 'file_name', 
      headerName: 'File Name', 
      width: 300,
      type: 'string'
    },
    { 
      field: 'folder_type', 
      headerName: 'Folder Type', 
      width: 200,
      type: 'string'
    },
    { 
      field: 'project_name', 
      headerName: 'Project Name', 
      width: 300,
      type: 'string'
    },
  ];
  
  // Filter the invoices based on all criteria
  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      // Apply text-based filters
      if (localFilters.FileNameKeyword && !invoice.file_name.toLowerCase().includes(localFilters.FileNameKeyword.toLowerCase())) {
        return false;
      }

      // Apply date filters if they exist
      if (localFilters.startDate && new Date(invoice.date) < new Date(localFilters.startDate)) {
        return false;
      }
      if (localFilters.endDate && new Date(invoice.date) > new Date(localFilters.endDate)) {
        return false;
      }

      // Apply folder type filters
      if (localFilters.folderTypeFilters?.adicionals || localFilters.folderTypeFilters?.pressupost) {
        const isAdicional = invoice.folder_type?.toLowerCase().includes('adicional');
        const isPressupost = invoice.folder_type?.toLowerCase().includes('pressupost');
        
        return (
          (localFilters.folderTypeFilters.adicionals && isAdicional) ||
          (localFilters.folderTypeFilters.pressupost && isPressupost)
        );
      }

      return true;
    });
  };

  const filteredInvoices = getFilteredInvoices();

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    const newFilters = {
      ...localFilters,
      [name]: value,
    };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  const handleFolderTypeFilterChange = (type) => () => {
    const newFilters = {
      ...localFilters,
      folderTypeFilters: {
        ...localFilters.folderTypeFilters,
        [type]: !localFilters.folderTypeFilters?.[type]
      }
    };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  return (
    <Box>
      <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <FilterInput
          name="FileNameKeyword"
          label="File Name"
          value={localFilters.FileNameKeyword || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="startDate"
          label="Start Date"
          type="date"
          value={localFilters.startDate || ''}
          onChange={handleFilterChange}
          InputLabelProps={{ shrink: true }}
        />
        <FilterInput
          name="endDate"
          label="End Date"
          type="date"
          value={localFilters.endDate || ''}
          onChange={handleFilterChange}
          InputLabelProps={{ shrink: true }}
        />
        
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center', 
            border: '1px solid #e0e0e0', 
            padding: '8px 16px', 
            borderRadius: '4px',
            bgcolor: 'background.paper',
            flexShrink: 0
          }}
        >
          <Typography variant="body2" sx={{ mr: 1 }}>Filter by:</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={localFilters.folderTypeFilters?.adicionals || false}
                onChange={handleFolderTypeFilterChange('adicionals')}
                color="primary"
              />
            }
            label="Adicionals"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={localFilters.folderTypeFilters?.pressupost || false}
                onChange={handleFolderTypeFilterChange('pressupost')}
                color="primary"
              />
            }
            label="Pressupost contracte"
          />
        </Box>
      </Box>

      <DataGrid
        rows={filteredInvoices}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[5, 10, 20]}
        autoHeight
        checkboxSelection
        rowSelectionModel={selectedItems}
        onRowSelectionModelChange={(newSelectionModel) => {
          console.log('Selected items:', newSelectionModel);
          setSelectedItems(newSelectionModel);
        }}
        disableSelectionOnClick
        disableColumnReorder={false}
      />
    </Box>
  );
};

export default Invoices;