// src/components/Topbar/Topbar.js
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Topbar = ({ onMenuClick }) => (
  <AppBar position="fixed" sx={{ height: 40 }}>
    <Toolbar 
      variant="dense" 
      sx={{ 
        minHeight: 40, 
        justifyContent: 'flex-end', 
        paddingRight: '1rem' 
      }}
    >
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={onMenuClick}
        sx={{ mr: 2, display: { sm: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      <Typography variant="h6" sx={{ marginLeft: 'auto' }}>
        Invoice Management App
      </Typography>
    </Toolbar>
  </AppBar>
);

export default Topbar;
