import React, { useState, useEffect } from 'react';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from '@mui/material';
import { api } from '../../services/api';

const SubelementsList = ({ elementId }) => {
  const [subelements, setSubelements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubelements = async () => {
      try {
        const response = await api.get(`/subelements/${elementId}`);
        setSubelements(response.data);
      } catch (error) {
        console.error('Error fetching subelements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubelements();
  }, [elementId]);

  if (loading) {
    return <Typography>Loading subelements...</Typography>;
  }

  if (subelements.length === 0) {
    return <Typography>No subelements available.</Typography>;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="subelements table">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">N</TableCell>
            <TableCell align="right">L</TableCell>
            <TableCell align="right">H</TableCell>
            <TableCell align="right">W</TableCell>
            <TableCell align="right">Total Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subelements.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell component="th" scope="row">{sub.title}</TableCell>
              <TableCell>{sub.unit}</TableCell>
              <TableCell align="right">{sub.n}</TableCell>
              <TableCell align="right">{sub.l}</TableCell>
              <TableCell align="right">{sub.h}</TableCell>
              <TableCell align="right">{sub.w}</TableCell>
              <TableCell align="right">{sub.total_price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SubelementsList;