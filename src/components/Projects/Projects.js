import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FilterInput from '../FilterInput/FilterInput';

const Projects = ({ projects, loading, error, filters, setFilters, selectedItems, setSelectedItems }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const columns = [
    { field: 'name', headerName: 'Name', width: 300 },
    { field: 'client', headerName: 'Client', width: 250 },
    { field: 'autonomousCommunity', headerName: 'Autonomous Community', width: 250 },
    { field: 'sizeOfConstruction', headerName: 'Size of Construction', width: 200 },
    { field: 'constructionType', headerName: 'Construction Type', width: 200 },
    { field: 'numberOfFloors', headerName: 'Number of Floors', width: 200 },
    { field: 'groundQualityStudy', headerName: 'Ground Quality Study', width: 250 },
    { field: 'endState', headerName: 'End State', width: 200 },
  ];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    const newFilters = {
      ...localFilters,
      [name]: value,
    };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  // Filter projects based on criteria
  const getFilteredProjects = () => {
    return projects.filter(project => {
      if (localFilters.client && !project.client?.toLowerCase().includes(localFilters.client.toLowerCase())) {
        return false;
      }
      if (localFilters.size && !project.sizeOfConstruction?.toString().includes(localFilters.size)) {
        return false;
      }
      return true;
    });
  };

  const filteredProjects = getFilteredProjects().map(project => ({
    ...project,
    id: project.name // Use name as the id for DataGrid
  }));

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box>
      <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <FilterInput
          name="client"
          label="Client"
          value={localFilters.client || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="size"
          label="Size"
          value={localFilters.size || ''}
          onChange={handleFilterChange}
        />
      </Box>

      <DataGrid
        rows={filteredProjects}
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
        components={{
          Toolbar: () => (
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Drag column headers to reorder columns
              </Typography>
            </Box>
          ),
        }}
      />
    </Box>
  );
};

export default Projects;