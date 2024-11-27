import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import axios from 'axios';

const AdminPanel = () => {
    const [loginHistory, setLoginHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [usernameFilter, setUsernameFilter] = useState('');
    const [successFilter, setSuccessFilter] = useState(null);
    const { user } = useAuth();
  
    const fetchData = async () => {
      console.log('Current user:', user);
      console.log('Current token:', localStorage.getItem('token'));
  
      if (!user) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
  
      if (user.role !== 'admin') {
        setError('Admin access required');
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        setError(null);
  
        // Fetch login history with filters
        let url = '/api/admin/login-history?limit=50';
        if (usernameFilter) url += `&username=${usernameFilter}`;
        if (successFilter !== null) url += `&success=${successFilter}`;
        
        console.log('Fetching data from URLs:', url, '/api/admin/stats');
        
        const [historyResponse, statsResponse] = await Promise.all([
          axios.get(url),
          axios.get('/api/admin/stats')
        ]);
  
        console.log('Responses received:', {
          history: historyResponse.data,
          stats: statsResponse.data
        });
  
        setLoginHistory(historyResponse.data);
        setStats(statsResponse.data);
      } catch (err) {
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.error || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      if (user?.role === 'admin') {
        fetchData();
        // Refresh data every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
      }
    }, [user, usernameFilter, successFilter]); // Add dependencies

  if (user?.role !== 'admin') {
    return (
      <Alert severity="error">
        Admin access required
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Attempts
              </Typography>
              <Typography variant="h5">
                {stats.total_attempts}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h5">
                {((stats.successful_attempts / stats.total_attempts) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unique Users
              </Typography>
              <Typography variant="h5">
                {stats.unique_users}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          label="Filter by Username"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
          size="small"
        />
        <FormControlLabel
          control={
            <Switch
              checked={successFilter === true}
              onChange={(e) => setSuccessFilter(e.target.checked ? true : null)}
            />
          }
          label="Show Only Successful"
        />
        <Button
          variant="outlined"
          onClick={() => {
            setUsernameFilter('');
            setSuccessFilter(null);
          }}
        >
          Clear Filters
        </Button>
      </Box>

      {/* Login History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loginHistory.map((event, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: event.success ? 'success.light' : 'error.light',
                  '&:hover': { opacity: 0.9 }
                }}
              >
                <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                <TableCell>{event.username}</TableCell>
                <TableCell>{event.ip_address}</TableCell>
                <TableCell>{event.success ? 'Success' : 'Failed'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default AdminPanel;