import React, { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, FormControlLabel, Checkbox } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SubelementsList from '../SubelementsList/SubelementsList';
import FilterInput from '../FilterInput/FilterInput';

const Elements = ({ elements, loading, error, filters, setFilters, selectedItems, setSelectedItems }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({});
  const [localFilters, setLocalFilters] = useState(filters);

  const handleOpenDialog = (rowData, event) => {
    if (event) {
      event.stopPropagation();
    }
    setDialogContent(rowData);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogContent({});
  };

  // Define columns
  const columns = [
    { field: 'name', headerName: 'Name', width: 300, type: 'string' },
    { field: 'unit', headerName: 'Unit', width: 100, type: 'string' },
    { field: 'quantity', headerName: 'Quantity', width: 150, type: 'number' },
    { field: 'price_per_unit', headerName: 'Price per Unit', width: 180, type: 'number' },
    { field: 'discount', headerName: 'Discount', width: 100, type: 'number' },
    { field: 'total_price', headerName: 'Total Price', width: 180, type: 'number' },
    { field: 'chapter_title', headerName: 'Chapter', width: 250, type: 'string' },
    { field: 'subchapter_title', headerName: 'Subchapter', width: 250, type: 'string' },
    {
      field: 'details',
      headerName: 'Details',
      width: 150,
      renderCell: (params) => {
        const hasDescription = params.row.description && params.row.description.trim() !== '';
        if (hasDescription || params.row.has_subelements) {
          return (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={(event) => handleOpenDialog(params.row, event)}
              onMouseDown={(event) => event.stopPropagation()}
            >
              View
            </Button>
          );
        } else {
          return <CloseIcon color="disabled" />;
        }
      },
    },
    { field: 'invoice_name', headerName: 'Invoice Name', width: 300, type: 'string' },
    { field: 'invoice_id', headerName: 'Invoice ID', width: 150, type: 'number' },
    { field: 'folder_type', headerName: 'Folder Type', width: 200, type: 'string' },
  ];

  // Filter the elements based on all criteria
  const getFilteredElements = () => {
    return elements.filter(element => {
      // Apply text-based filters
      if (localFilters.nameKeyword && !element.name.toLowerCase().includes(localFilters.nameKeyword.toLowerCase())) {
        return false;
      }
      if (localFilters.invoiceNameKeyword && !element.invoice_name?.toLowerCase().includes(localFilters.invoiceNameKeyword.toLowerCase())) {
        return false;
      }
      if (localFilters.invoiceid && element.invoice_id !== parseInt(localFilters.invoiceid)) {
        return false;
      }

      // Apply numeric filters
      if (localFilters.minPrice && element.price_per_unit < parseFloat(localFilters.minPrice)) {
        return false;
      }
      if (localFilters.maxPrice && element.price_per_unit > parseFloat(localFilters.maxPrice)) {
        return false;
      }

      // Apply folder type filters
      if (localFilters.folderTypeFilters?.adicionals || localFilters.folderTypeFilters?.pressupost) {
        const isAdicional = element.folder_type?.toLowerCase().includes('adicional');
        const isPressupost = element.folder_type?.toLowerCase().includes('pressupost');
        
        return (
          (localFilters.folderTypeFilters.adicionals && isAdicional) ||
          (localFilters.folderTypeFilters.pressupost && isPressupost)
        );
      }

      return true;
    });
  };

  const filteredElements = getFilteredElements();

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box>
      <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <FilterInput
          name="nameKeyword"
          label="Name Keyword"
          value={localFilters.nameKeyword || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="invoiceNameKeyword"
          label="Invoice Name"
          value={localFilters.invoiceNameKeyword || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="invoiceid"
          label="Invoice ID"
          type="number"
          value={localFilters.invoiceid || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="minPrice"
          label="Min Price"
          type="number"
          value={localFilters.minPrice || ''}
          onChange={handleFilterChange}
        />
        <FilterInput
          name="maxPrice"
          label="Max Price"
          type="number"
          value={localFilters.maxPrice || ''}
          onChange={handleFilterChange}
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
        rows={filteredElements}
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

      {/* Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Element Details</DialogTitle>
        <DialogContent dividers>
          {dialogContent.description && (
            <>
              <Typography variant="h6">Description:</Typography>
              <Typography variant="body1" paragraph>{dialogContent.description}</Typography>
            </>
          )}
          {dialogContent.has_subelements && (
            <>
              <Typography variant="h6">Subelements:</Typography>
              <SubelementsList elementId={dialogContent.id} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Elements;