import React from 'react';
import { Drawer, List, ListItem, ListItemText, useTheme, useMediaQuery, CircularProgress, TextField, Typography, Checkbox, Box } from '@mui/material';

const Sidebar = ({ projects, projectSearch, setProjectSearch, loadingProjects, errorProjects, onProjectToggle, mobileOpen, onDrawerToggle, selectedProjects }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const drawerContent = (
    <Box sx={{ pt: 8, px: 2 }}>
      <TextField
        label="Search Projects"
        variant="outlined"
        fullWidth
        value={projectSearch}
        onChange={(e) => setProjectSearch(e.target.value)}
        sx={{ mb: 2 }}
      />
      {loadingProjects ? (
        <CircularProgress />
      ) : errorProjects ? (
        <Typography color="error">{errorProjects}</Typography>
      ) : (
        <List>
          {projects
            .filter((project) =>
              project.name.toLowerCase().includes(projectSearch.toLowerCase())
            )
            .map((project) => (
              <ListItem key={project.name} button onClick={() => onProjectToggle(project)}>
                <Checkbox
                  checked={selectedProjects.includes(project.name)}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-labelledby': `checkbox-list-label-${project.name}` }}
                />
                <ListItemText id={`checkbox-list-label-${project.name}`} primary={project.name} />
              </ListItem>
            ))}
        </List>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onDrawerToggle}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' },
        display: { xs: 'none', sm: 'block' },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
